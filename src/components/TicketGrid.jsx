import React, { useState, useEffect, useMemo } from 'react';
import { useKds } from '../context/KdsContext';
import { soundEngine } from '../services/soundEngine';
import {
  LayoutGrid,
  Users,
  ShoppingBag,
  Truck,
  Clock,
  ChefHat,
  User,
  AlertTriangle,
  Check,
  Utensils
} from 'lucide-react';

export default function TicketGrid() {
  const { kots, kitchenItems, updateItemStatus, bumpTicket } = useKds();
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'GENERAL' | 'FAMILY AC' | 'PARCEL' | 'HOME DELIVERY' | 'DELAYED'
  const [now, setNow] = useState(Date.now());

  // Real-time ticking timer for elapsed times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Build Tickets from KOTs & kitchen line items
  const tickets = useMemo(() => {
    const kotMap = new Map();

    kots.forEach(kot => {
      kotMap.set(String(kot.id), {
        ...kot,
        items: []
      });
    });

    kitchenItems
      .filter(item => !item.is_cancelled && item.status !== 'SERVED')
      .forEach(item => {
        const key = String(item.kot_id);
        if (kotMap.has(key)) {
          kotMap.get(key).items.push(item);
        } else if (item.kot_id) {
          kotMap.set(key, {
            id: item.kot_id,
            kot_number: item.kot_number,
            table_id: item.table_id,
            section: 'GENERAL',
            waiter_name: '1 COUNTER',
            customer_name: '',
            customer_phone: '',
            created_at: item.created_at,
            status: 'PENDING',
            items: [item]
          });
        }
      });

    return Array.from(kotMap.values())
      .filter(t => t.items && t.items.length > 0)
      .map(ticket => {
        // Sort dishes by culinary course category_order, then item code
        const sortedItems = [...ticket.items].sort((a, b) => {
          const ordA = a.category_order ?? a.categoryOrder ?? 99;
          const ordB = b.category_order ?? b.categoryOrder ?? 99;
          if (ordA !== ordB) return ordA - ordB;
          return (Number(a.item_code || a.code) || 0) - (Number(b.item_code || b.code) || 0);
        });

        const pendingOrPrep = sortedItems.filter(i => i.status === 'PENDING' || i.status === 'PREPARING');
        const isAllReady = pendingOrPrep.length === 0 && sortedItems.length > 0;
        
        const section = (ticket.section || 'GENERAL').toUpperCase();

        const createdAtMs = new Date(ticket.created_at || Date.now()).getTime();
        const elapsedSecs = Math.max(0, Math.floor((now - createdAtMs) / 1000));
        const elapsedMins = Math.floor(elapsedSecs / 60);
        const isDelayed = elapsedMins >= 15;

        return {
          ...ticket,
          items: sortedItems,
          section,
          isAllReady,
          pendingCount: pendingOrPrep.length,
          elapsedSecs,
          elapsedMins,
          isDelayed
        };
      })
      // Food ticket only disappears from screen when cook clicks the "Food Ready" button (ticket.status === 'READY') or already served
      .filter(ticket => ticket.status !== 'READY' && ticket.status !== 'CANCELLED' && ticket.status !== 'SERVED' && !ticket.items.every(i => i.status === 'SERVED'))
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  }, [kots, kitchenItems, now]);

  // Filter counts matching database sections
  const allCount = tickets.length;
  const generalCount = tickets.filter(t => t.section === 'GENERAL' || t.section === 'AC').length;
  const familyAcCount = tickets.filter(t => t.section === 'FAMILY AC').length;
  const parcelCount = tickets.filter(t => t.section === 'PARCEL').length;
  const deliveryCount = tickets.filter(t => t.section === 'HOME DELIVERY').length;
  const delayedCount = tickets.filter(t => t.isDelayed).length;

  const filteredTickets = useMemo(() => {
    switch (activeFilter) {
      case 'GENERAL':
      case 'AC':
        return tickets.filter(t => t.section === 'GENERAL' || t.section === 'AC');
      case 'FAMILY AC':
        return tickets.filter(t => t.section === 'FAMILY AC');
      case 'PARCEL':
        return tickets.filter(t => t.section === 'PARCEL');
      case 'HOME DELIVERY':
        return tickets.filter(t => t.section === 'HOME DELIVERY');
      case 'DELAYED':
        return tickets.filter(t => t.isDelayed);
      default:
        return tickets;
    }
  }, [tickets, activeFilter]);

  const handleToggleItemReady = (item) => {
    soundEngine.playTap();
    const newStatus = item.status === 'READY' ? 'PREPARING' : 'READY';
    updateItemStatus(item.id, newStatus);
  };

  const handleFoodReadyClick = (ticket) => {
    soundEngine.playTap();
    bumpTicket(ticket.id);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
      background: 'var(--kds-bg)',
      width: '100%',
      minWidth: 0
    }}>
      {/* Filter Tabs Bar (Mapped exactly to Captain App sections, removing extra sections) */}
      <div style={{
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        flexShrink: 0
      }}>
        {/* All Tab */}
        <button
          onClick={() => setActiveFilter('ALL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: activeFilter === 'ALL' ? 'none' : '1px solid #e2e8f0',
            background: activeFilter === 'ALL' ? 'var(--kds-blue)' : '#f8fafc',
            color: activeFilter === 'ALL' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <LayoutGrid size={14} />
          <span>All</span>
          <span style={{
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: '999px',
            background: activeFilter === 'ALL' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
            color: activeFilter === 'ALL' ? '#ffffff' : '#334155'
          }}>
            {allCount}
          </span>
        </button>

        {/* General Tab (Tables 1-20 & legacy AC) */}
        <button
          onClick={() => setActiveFilter('GENERAL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: (activeFilter === 'GENERAL' || activeFilter === 'AC') ? 'none' : '1px solid #e2e8f0',
            background: (activeFilter === 'GENERAL' || activeFilter === 'AC') ? 'var(--kds-blue)' : '#f8fafc',
            color: (activeFilter === 'GENERAL' || activeFilter === 'AC') ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Utensils size={14} />
          <span>General</span>
          {generalCount > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: (activeFilter === 'GENERAL' || activeFilter === 'AC') ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
              color: (activeFilter === 'GENERAL' || activeFilter === 'AC') ? '#ffffff' : '#334155'
            }}>
              {generalCount}
            </span>
          )}
        </button>

        {/* Family AC Tab */}
        <button
          onClick={() => setActiveFilter('FAMILY AC')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: activeFilter === 'FAMILY AC' ? 'none' : '1px solid #e2e8f0',
            background: activeFilter === 'FAMILY AC' ? 'var(--kds-blue)' : '#f8fafc',
            color: activeFilter === 'FAMILY AC' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={14} />
          <span>Family AC</span>
          {familyAcCount > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: activeFilter === 'FAMILY AC' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
              color: activeFilter === 'FAMILY AC' ? '#ffffff' : '#334155'
            }}>
              {familyAcCount}
            </span>
          )}
        </button>

        {/* Parcel Tab */}
        <button
          onClick={() => setActiveFilter('PARCEL')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: activeFilter === 'PARCEL' ? 'none' : '1px solid #e2e8f0',
            background: activeFilter === 'PARCEL' ? 'var(--kds-blue)' : '#f8fafc',
            color: activeFilter === 'PARCEL' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <ShoppingBag size={14} />
          <span>Parcel</span>
          {parcelCount > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: activeFilter === 'PARCEL' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
              color: activeFilter === 'PARCEL' ? '#ffffff' : '#334155'
            }}>
              {parcelCount}
            </span>
          )}
        </button>

        {/* Home Delivery Tab */}
        <button
          onClick={() => setActiveFilter('HOME DELIVERY')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: activeFilter === 'HOME DELIVERY' ? 'none' : '1px solid #e2e8f0',
            background: activeFilter === 'HOME DELIVERY' ? 'var(--kds-blue)' : '#f8fafc',
            color: activeFilter === 'HOME DELIVERY' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Truck size={14} />
          <span>Home Delivery</span>
          {deliveryCount > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: activeFilter === 'HOME DELIVERY' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
              color: activeFilter === 'HOME DELIVERY' ? '#ffffff' : '#334155'
            }}>
              {deliveryCount}
            </span>
          )}
        </button>

        {/* Delayed Tab */}
        <button
          onClick={() => setActiveFilter('DELAYED')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: activeFilter === 'DELAYED' ? 'none' : '1px solid #e2e8f0',
            background: activeFilter === 'DELAYED' ? 'var(--kds-blue)' : '#f8fafc',
            color: activeFilter === 'DELAYED' ? '#ffffff' : '#475569',
            fontWeight: '800',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={14} style={{ color: delayedCount > 0 ? '#ef4444' : 'inherit' }} />
          <span>Delayed</span>
          {delayedCount > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: '#fee2e2',
              color: '#dc2626',
              fontWeight: '900'
            }}>
              {delayedCount}
            </span>
          )}
        </button>
      </div>

      {/* Main KOT Table Order Cards Grid (Uniform Row Alignment, Zero Overlap, No Internal Scroll) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '14px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gridAutoRows: 'max-content',
        alignItems: 'stretch',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {filteredTickets.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            margin: 'auto',
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8'
          }}>
            <ChefHat size={56} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#64748b' }}>
              No Active Kitchen Orders
            </h3>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Orders from the Captain App will appear here.
            </p>
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const mins = ticket.elapsedMins;
            const secs = ticket.elapsedSecs % 60;
            const timerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

            return (
              <div
                key={ticket.id}
                className={`kds-ticket-card ${ticket.isDelayed ? 'delayed' : ''}`}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: 0
                }}
              >
                {/* Receipt Card Header */}
                <div style={{
                  padding: '8px 12px 6px 12px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  flexShrink: 0
                }}>
                  {/* Row 1: Section Badge (matching Captain App), KOT #, Running Timer */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px'
                  }}>
                    {/* Left: Section Badge from Captain App */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10.5px',
                      fontWeight: '800',
                      color: (ticket.section === 'PARCEL' || (ticket.table_id && String(ticket.table_id).startsWith('0') && !String(ticket.table_id).startsWith('00')))
                        ? '#ea580c'
                        : (ticket.section === 'HOME DELIVERY' || (ticket.table_id && String(ticket.table_id).startsWith('00')))
                        ? '#3b82f6'
                        : ticket.section === 'FAMILY AC'
                        ? '#8b5cf6'
                        : '#15803d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '95px'
                    }}>
                      {ticket.section === 'PARCEL' || (ticket.table_id && String(ticket.table_id).startsWith('0') && !String(ticket.table_id).startsWith('00')) ? (
                        <ShoppingBag size={11} />
                      ) : ticket.section === 'HOME DELIVERY' || (ticket.table_id && String(ticket.table_id).startsWith('00')) ? (
                        <Truck size={11} />
                      ) : ticket.section === 'FAMILY AC' ? (
                        <Users size={11} />
                      ) : (
                        <Utensils size={11} />
                      )}
                      <span>{ticket.section === 'AC' ? 'GENERAL' : (ticket.section || 'GENERAL')}</span>
                    </div>

                    {/* Center: Large KOT # */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '900',
                      color: '#0f172a',
                      fontFamily: 'var(--font-sans)',
                      letterSpacing: '-0.3px'
                    }}>
                      KOT #{ticket.kot_number}
                    </div>

                    {/* Right: Timer Clock */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      fontWeight: '800',
                      fontFamily: 'var(--font-mono)',
                      color: ticket.isDelayed ? '#dc2626' : '#64748b'
                    }}>
                      <Clock size={11} />
                      <span>{timerFormatted}</span>
                    </div>
                  </div>

                  {/* Row 2: Table Identifier & Biller/Waiter */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '3px',
                    paddingTop: '3px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: '900',
                      color: '#1e293b'
                    }}>
                      <span style={{ color: '#64748b', fontSize: '11px' }}>🍽</span>
                      <span>
                        {(() => {
                          const tblStr = ticket.table_id !== undefined && ticket.table_id !== null ? String(ticket.table_id).trim() : '';
                          const secStr = (ticket.section || '').toUpperCase();
                          if (secStr === 'PARCEL' || tblStr === '0' || tblStr.startsWith('0-') || tblStr.startsWith('0B') || tblStr.startsWith('0C') || tblStr.startsWith('0D') || tblStr.startsWith('0E')) {
                            return tblStr && tblStr !== '0' ? `Parcel ${tblStr}` : 'Parcel';
                          }
                          if (secStr === 'HOME DELIVERY' || tblStr.startsWith('00')) {
                            return `Delivery (${tblStr || 'Guest'})`;
                          }
                          return `Table ${tblStr}`;
                        })()}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '11px',
                      color: '#94a3b8',
                      fontWeight: '600'
                    }}>
                      <User size={11} />
                      <span>{ticket.waiter_name ? ticket.waiter_name.split(' • ')[0] : '1 COUNTER'}</span>
                    </div>
                  </div>

                  {/* Row 3: Customer Details if present */}
                  {(() => {
                    const custInfoPart = (ticket.waiter_name && ticket.waiter_name.includes(' • ')) ? (ticket.waiter_name.split(' • ')[1] || '') : '';
                    const custName = (ticket.customer_name || (custInfoPart ? custInfoPart.split(' (')[0] : '') || '').trim();
                    const custPhone = (ticket.customer_phone || (custInfoPart ? custInfoPart.match(/\((.*?)\)/)?.[1] : '') || '').trim();
                    if (!custName && !custPhone) return null;
                    return (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        color: '#334155',
                        fontWeight: '700',
                        marginTop: '4px',
                        paddingTop: '3px',
                        borderTop: '1px dashed #e2e8f0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ color: '#059669', fontSize: '11px' }}>👤</span>
                        <span style={{ color: '#0f172a', fontWeight: '800' }}>{custName}</span>
                        {custPhone && <span style={{ color: '#64748b', fontSize: '10px' }}>({custPhone})</span>}
                      </div>
                    );
                  })()}
                </div>

                {/* Dashed Perforated Line */}
                <div className="receipt-perforation" style={{ flexShrink: 0 }} />

                {/* Items List inside Receipt (Flex 1, Natural Height, No Internal Scroll) */}
                <div style={{
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  boxSizing: 'border-box',
                  flex: 1
                }}>
                  {ticket.items.map(item => {
                    const isReady = item.status === 'READY';

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          padding: '1px 0'
                        }}
                      >
                        {/* Item Qty and Name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '12.5px',
                            fontWeight: '800',
                            color: isReady ? '#94a3b8' : '#1e293b',
                            lineHeight: 1.2,
                            textDecoration: isReady ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={`${item.qty}x ${item.item_name}`}>
                            {item.qty}x {item.item_name}
                          </div>

                          {/* Custom note / instruction */}
                          {item.customization && (
                            <div style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              color: '#d97706',
                              marginTop: '1px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <AlertTriangle size={9} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.customization}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div
                          onClick={() => {
                            if (item.status !== 'SERVED') {
                              handleToggleItemReady(item);
                            }
                          }}
                          className={`toggle-switch ${isReady ? 'active' : ''}`}
                          style={{
                            opacity: item.status === 'SERVED' ? 0.5 : 1,
                            cursor: item.status === 'SERVED' ? 'default' : 'pointer'
                          }}
                          title={item.status === 'SERVED' ? 'Item already served' : isReady ? 'Mark pending' : 'Mark item ready'}
                        >
                          <div className="toggle-thumb" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Food Ready Button (Always pinned cleanly at card bottom, never overlapped) */}
                <button
                  onClick={() => handleFoodReadyClick(ticket)}
                  style={{
                    width: '100%',
                    height: '38px',
                    minHeight: '38px',
                    border: 'none',
                    background: ticket.isAllReady ? '#16a34a' : 'var(--kds-orange)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    letterSpacing: '0.3px',
                    flexShrink: 0,
                    marginTop: 'auto'
                  }}
                >
                  {ticket.isAllReady ? (
                    <>
                      <Check size={16} />
                      <span>Food Ready ✓</span>
                    </>
                  ) : (
                    <span>Food Ready</span>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
