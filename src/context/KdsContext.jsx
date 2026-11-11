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

      // 1. Fetch active KOTs (PENDING, PREPARING, READY)
      const { data: kData } = await supabase
        .from('kots')
        .select('*')
        .in('status', ['PENDING', 'PREPARING', 'READY'])
        .order('created_at', { ascending: true });

      if (kData) setKots(kData);

      // 2. Fetch active Kitchen items only (department = 'KITCHEN', not cancelled, unserved)
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

  // Real-time Subscriptions (Single consolidated channel for minimal egress)
  useEffect(() => {
    loadData();

    const kdsLiveHub = supabase
      .channel('kds_live_hub')
      // 1. KOTs events (incoming orders)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kots' }, payload => {
        const newKot = payload.new;
        setKots(prev => [...prev.filter(k => String(k.id) !== String(newKot.id)), newKot]);
        // Ring kitchen bell
        soundEngine.playKitchenBell();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kots' }, payload => {
        setKots(prev => prev.map(k => (String(k.id) === String(payload.new.id) ? payload.new : k)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'kots' }, payload => {
        const delId = payload.old?.id;
        if (delId) {
          setKots(prev => prev.filter(k => String(k.id) !== String(delId)));
        }
      })
      // 2. Kitchen line items events
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, payload => {
        const item = payload.new;
        // Only accept kitchen items that are active and not served
        if (item.department === 'KITCHEN' && !item.is_cancelled && item.status !== 'SERVED') {
          setKitchenItems(prev => [...prev.filter(i => String(i.id) !== String(item.id)), item]);
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
          setKitchenItems(prev => prev.filter(i => String(i.id) !== String(updated.id)));
          return;
        }

        // If an item was picked up / served by waiter, remove from kitchen queue
        if (updated.status === 'SERVED') {
          setKitchenItems(prev => prev.filter(i => String(i.id) !== String(updated.id)));
          return;
        }

        // Update item status in cook queue
        if (updated.department === 'KITCHEN') {
          setKitchenItems(prev => {
            const exists = prev.some(i => String(i.id) === String(updated.id));
            if (exists) {
              return prev.map(i => (String(i.id) === String(updated.id) ? updated : i));
            } else {
              return [...prev, updated];
            }
          });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'order_items' }, payload => {
        const delId = payload.old?.id;
        if (delId) {
          setKitchenItems(prev => prev.filter(i => String(i.id) !== String(delId)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(kdsLiveHub);
    };
  }, [loadData]);

  // Cook toggles item status (individual item readiness)
  const updateItemStatus = useCallback(async (itemId, newStatus) => {
    if (!itemId) return;
    soundEngine.playTap();
    await supabase.from('order_items').update({ status: newStatus }).eq('id', itemId);
    
    setKitchenItems(prev => {
      return prev.map(i => (String(i.id) === String(itemId) ? { ...i, status: newStatus } : i));
    });
  }, []);

  // Bump whole ticket to READY (removes ticket and its food items from cooking queue)
  const bumpTicket = useCallback(async (kotId) => {
    if (!kotId) return;
    soundEngine.playTap();
    
    // 1. Mark all unserved kitchen order items READY
    await supabase
      .from('order_items')
      .update({ status: 'READY' })
      .eq('kot_id', kotId)
      .eq('department', 'KITCHEN')
      .neq('status', 'SERVED');

    // 2. Mark KOT row as READY
    await supabase
      .from('kots')
      .update({ status: 'READY' })
      .eq('id', kotId);

    // 3. Update local states with type-safe string comparison
    setKitchenItems(prev =>
      prev.map(i => (String(i.kot_id) === String(kotId) && i.status !== 'SERVED' ? { ...i, status: 'READY' } : i))
    );
    setKots(prev =>
      prev.map(k => (String(k.id) === String(kotId) ? { ...k, status: 'READY' } : k))
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
