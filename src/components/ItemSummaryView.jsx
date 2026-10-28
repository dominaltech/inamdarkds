import React, { useMemo } from 'react';
import { useKds } from '../context/KdsContext';
import { soundEngine } from '../services/soundEngine';
import {
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Utensils,
  Layers,
  ChevronRight,
  CheckCheck
} from 'lucide-react';

export default function ItemSummaryView({ selectedStation }) {
  const { kitchenItems, updateItemStatus } = useKds();

  // Aggregate active food items by dish name and code
  const aggregatedItems = useMemo(() => {
    // Only pending or preparing kitchen items (active cook work)
    const activeItems = kitchenItems.filter(
      item => item.department === 'KITCHEN' && !item.is_cancelled && item.status !== 'SERVED'
    );

    const map = new Map();

    activeItems.forEach(item => {
      const key = `${item.item_code}-${item.item_name}`;
      if (!map.has(key)) {
        map.set(key, {
          itemCode: item.item_code,
          itemName: item.item_name,
          category: item.category,
          categoryOrder: item.category_order || 99,
          totalQty: 0,
          pendingQty: 0,
          prepQty: 0,
          readyQty: 0,
          tableOrders: [], // array of { itemId, tableId, qty, status, customization, kotNumber, createdAt }
        });
      }

      const entry = map.get(key);
      const qty = Number(item.qty) || 1;
      entry.totalQty += qty;

      if (item.status === 'PENDING') entry.pendingQty += qty;
      else if (item.status === 'PREPARING') entry.prepQty += qty;
      else if (item.status === 'READY') entry.readyQty += qty;

      entry.tableOrders.push({
        itemId: item.id,
        tableId: item.table_id,
        qty: qty,
        status: item.status,
        customization: item.customization || '',
        kotNumber: item.kot_number,
        createdAt: item.created_at
      });
    });

    let list = Array.from(map.values());

    // Apply station filter if active
    if (selectedStation !== 'ALL') {
      if (selectedStation === 'TANDOOR') {
        list = list.filter(i => ['KABAB', 'STARTERS'].includes(i.category));
      } else if (selectedStation === 'GRAVY') {
        list = list.filter(i => ['MAIN COURSE', 'ANDE KA FUNDA'].includes(i.category));
      } else if (selectedStation === 'CHINESE') {
        list = list.filter(i => ['SOUP', 'RICE AND NOODLES'].includes(i.category));
      } else if (selectedStation === 'BIRYANI_ROTI') {
        list = list.filter(i => ['BIRYANI', 'BIRYANI AND PULAO', 'ROTI'].includes(i.category));
      }
    }

    // Sort by highest total quantity first, then course order
    return list.sort((a, b) => {
      if (b.totalQty !== a.totalQty) {
        return b.totalQty - a.totalQty;
      }
      return a.categoryOrder - b.categoryOrder;
    });
  }, [kitchenItems, selectedStation]);

  // Batch action handlers
  const handleBatchStatus = async (tableOrders, targetStatus) => {
    soundEngine.playTap();
    for (const order of tableOrders) {
      if (order.status !== targetStatus) {
        await updateItemStatus(order.itemId, targetStatus);
      }
    }
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: '#070b13'
    }}>
      {/* Top Summary Banner */}
      <div style={{
        padding: '14px 20px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 22, 38, 0.9))',
        border: '1.5px solid rgba(245, 158, 11, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#f59e0b',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '900'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px' }}>
              CONSOLIDATED FOOD ITEM SUMMARY
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              All identical dishes across all dining tables grouped and totaled for bulk batch cooking
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-subtle)',
            fontSize: '13px',
            fontWeight: '800'
          }}>
            Distinct Dishes: <strong style={{ color: '#fbbf24' }}>{aggregatedItems.length}</strong>
          </div>
          <div style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '13px',
            fontWeight: '800'
          }}>
            Total Portions: <strong style={{ color: '#fff' }}>{aggregatedItems.reduce((acc, i) => acc + i.totalQty, 0)}</strong>
          </div>
        </div>
      </div>

      {/* Aggregated Items Grid */}
      {aggregatedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <Utensils size={56} style={{ opacity: 0.25, marginBottom: '14px' }} />
          <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-dim)' }}>
            No Active Kitchen Food Items
          </h3>
          <p style={{ marginTop: '6px', fontSize: '14px' }}>
            When tables fire orders from Captain PWA, total dish counts will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {aggregatedItems.map(dish => {
            const isAllReady = dish.readyQty === dish.totalQty && dish.totalQty > 0;

            return (
              <div
                key={`${dish.itemCode}-${dish.itemName}`}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  border: isAllReady ? '1px solid rgba(16, 185, 129, 0.4)' : '1.5px solid var(--border-bright)',
                  background: isAllReady
                    ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.2), rgba(18, 24, 38, 0.9))'
                    : 'var(--bg-card)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                  overflow: 'hidden'
                }}
              >
                {/* Header Row: Dish Name & Prominent Total Quantity */}
                <div style={{
                  padding: '14px 20px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Left: Code, Name, Category */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-muted)'
                    }}>
                      #{dish.itemCode}
                    </span>

                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                        {dish.itemName}
                      </h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        {dish.category}
                      </span>
                    </div>
                  </div>

                  {/* Right: Big Aligned Total Badge + Batch Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* The Prominent Aggregated Total: e.g. "BIRYANI 5 QTY" */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                      padding: '6px 16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                      color: '#000'
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TOTAL:
                      </span>
                      <span style={{ fontSize: '24px', fontWeight: '900', lineHeight: 1 }}>
                        {dish.totalQty} QTY
                      </span>
                    </div>

                    {/* Batch Actions */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {dish.pendingQty > 0 && (
                        <button
                          onClick={() => handleBatchStatus(dish.tableOrders.filter(o => o.status === 'PENDING'), 'PREPARING')}
                          className="btn"
                          style={{
                            height: '36px',
                            minHeight: '36px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            background: 'rgba(59, 130, 246, 0.25)',
                            color: '#60a5fa',
                            border: '1px solid #3b82f6'
                          }}
                        >
                          <Flame size={14} />
                          <span>Prep All ({dish.pendingQty})</span>
                        </button>
                      )}

                      {!isAllReady && (
                        <button
                          onClick={() => handleBatchStatus(dish.tableOrders.filter(o => o.status !== 'READY'), 'READY')}
                          className="btn btn-success"
                          style={{
                            height: '36px',
                            minHeight: '36px',
                            padding: '0 14px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800'
                          }}
                        >
                          <CheckCheck size={16} />
                          <span>Mark All Ready ✓</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body: Perfectly Aligned Table Breakdown Cards */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    Table Breakdown ({dish.tableOrders.length} Order{dish.tableOrders.length === 1 ? '' : 's'}):
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '12px'
                  }}>
                    {dish.tableOrders.map((order, idx) => {
                      const isPending = order.status === 'PENDING';
                      const isPrep = order.status === 'PREPARING';
                      const isReady = order.status === 'READY';

                      return (
                        <div
                          key={`${order.itemId}-${idx}`}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '12px',
                            background: isReady
                              ? 'rgba(16, 185, 129, 0.1)'
                              : isPrep
                              ? 'rgba(59, 130, 246, 0.12)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: isReady
                              ? '1px solid rgba(16, 185, 129, 0.35)'
                              : isPrep
                              ? '1px solid rgba(59, 130, 246, 0.35)'
                              : '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          {/* Table & Quantity */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '900', color: '#fff' }}>
                                Table {order.tableId}
                              </span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#f59e0b',
                                color: '#000',
                                fontWeight: '900',
                                fontSize: '13px'
                              }}>
                                {order.qty} Qty
                              </span>
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                              KOT #{order.kotNumber}
                            </div>

                            {order.customization && (
                              <div style={{
                                marginTop: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#fbbf24',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <AlertTriangle size={12} />
                                <span>Note: {order.customization}</span>
                              </div>
                            )}
                          </div>

                          {/* Cook Action Button for this specific table item */}
                          <button
                            onClick={() => {
                              if (isPending) updateItemStatus(order.itemId, 'PREPARING');
                              else if (isPrep) updateItemStatus(order.itemId, 'READY');
                              else updateItemStatus(order.itemId, 'PREPARING');
                            }}
                            className="btn"
                            style={{
                              height: '34px',
                              minHeight: '34px',
                              padding: '0 12px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: '800',
                              background: isReady ? '#10b981' : isPrep ? '#3b82f6' : 'rgba(245, 158, 11, 0.2)',
                              color: isReady || isPrep ? '#fff' : '#fbbf24',
                              border: isPending ? '1px solid rgba(245, 158, 11, 0.4)' : 'none'
                            }}
                          >
                            {isPending && <span>PREP</span>}
                            {isPrep && <span>READY ✓</span>}
                            {isReady && <span>DONE</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
