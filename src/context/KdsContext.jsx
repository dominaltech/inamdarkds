import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { soundEngine } from '../services/soundEngine';

const KdsContext = createContext(null);

export function KdsProvider({ children }) {
  const [kots, setKots] = useState([]);
  const [kitchenItems, setKitchenItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [cancellationAlert, setCancellationAlert] = useState(null);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch active KOTs
      const { data: kData } = await supabase
        .from('kots')
        .select('*')
        .in('status', ['PENDING', 'PREPARING', 'READY'])
        .order('created_at', { ascending: true });

      if (kData) setKots(kData);

      // 2. Fetch active Kitchen items only (department = 'KITCHEN')
      const { data: oData } = await supabase
        .from('order_items')
        .select('*')
        .eq('department', 'KITCHEN')
        .eq('is_cancelled', false)
        .in('status', ['PENDING', 'PREPARING', 'READY'])
        .order('created_at', { ascending: true });

      if (oData) setKitchenItems(oData);
    } catch (err) {
      console.error('Error fetching KDS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time Subscriptions
  useEffect(() => {
    loadData();

    // 1. KOTs channel (incoming orders)
    const kotsChannel = supabase
      .channel('kds_kots_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kots' }, payload => {
        const newKot = payload.new;
        setKots(prev => [...prev.filter(k => k.id !== newKot.id), newKot]);
        // Ring kitchen bell
        soundEngine.playKitchenBell();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kots' }, payload => {
        setKots(prev => prev.map(k => (k.id === payload.new.id ? payload.new : k)));
      })
      .subscribe();

    // 2. Kitchen line items channel
    const itemsChannel = supabase
      .channel('kds_items_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, payload => {
        const item = payload.new;
        // Only accept kitchen items
        if (item.department === 'KITCHEN' && !item.is_cancelled) {
          setKitchenItems(prev => [...prev.filter(i => i.id !== item.id), item]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_items' }, payload => {
        const updated = payload.new;

        // Check for cancellation
        if (updated.is_cancelled) {
          soundEngine.playCancellationAlert();
          setCancellationAlert({
            id: updated.id,
            dish: updated.item_name,
            tableId: updated.table_id,
            reason: updated.cancel_reason || 'Manager Voided at Counter',
            authorizedBy: updated.authorized_by || 'SUSHANT',
            time: new Date().toLocaleTimeString(),
          });
          // Remove from cook queue
          setKitchenItems(prev => prev.filter(i => i.id !== updated.id));
          return;
        }

        // Update item status
        if (updated.department === 'KITCHEN') {
          setKitchenItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kotsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [loadData]);

  // Cook updates item status
  const updateItemStatus = useCallback(async (itemId, newStatus) => {
    soundEngine.playTap();
    await supabase.from('order_items').update({ status: newStatus }).eq('id', itemId);
    
    setKitchenItems(prev => {
      const next = prev.map(i => (i.id === itemId ? { ...i, status: newStatus } : i));
      
      // If marking ready, check if all kitchen items for that KOT are now ready
      const target = prev.find(i => i.id === itemId);
      if (target?.kot_id) {
        const kotItems = next.filter(i => i.kot_id === target.kot_id && !i.is_cancelled);
        const allReady = kotItems.length > 0 && kotItems.every(i => i.status === 'READY');
        if (allReady) {
          supabase.from('kots').update({ status: 'READY' }).eq('id', target.kot_id).then();
          setKots(kPrev => kPrev.map(k => k.id === target.kot_id ? { ...k, status: 'READY' } : k));
        } else if (newStatus !== 'READY') {
          supabase.from('kots').update({ status: 'PREPARING' }).eq('id', target.kot_id).then();
          setKots(kPrev => kPrev.map(k => k.id === target.kot_id ? { ...k, status: 'PREPARING' } : k));
        }
      }
      return next;
    });
  }, []);

  // Bump whole ticket to READY
  const bumpTicket = useCallback(async (kotId) => {
    soundEngine.playTap();
    
    // 1. Mark all kitchen order items READY
    await supabase
      .from('order_items')
      .update({ status: 'READY' })
      .eq('kot_id', kotId)
      .eq('department', 'KITCHEN');

    // 2. Mark KOT row as READY
    await supabase
      .from('kots')
      .update({ status: 'READY' })
      .eq('id', kotId);

    // 3. Update local states
    setKitchenItems(prev =>
      prev.map(i => (i.kot_id === kotId ? { ...i, status: 'READY' } : i))
    );
    setKots(prev =>
      prev.map(k => (k.id === kotId ? { ...k, status: 'READY' } : k))
    );
  }, []);

  const dismissCancellationAlert = useCallback(() => {
    setCancellationAlert(null);
  }, []);

  const value = {
    kots,
    kitchenItems,
    isLoading,
    isMuted,
    toggleMute,
    updateItemStatus,
    bumpTicket,
    cancellationAlert,
    dismissCancellationAlert,
    loadData
  };

  return <KdsContext.Provider value={value}>{children}</KdsContext.Provider>;
}

export function useKds() {
  const ctx = useContext(KdsContext);
  if (!ctx) throw new Error('useKds must be used within KdsProvider');
  return ctx;
}
