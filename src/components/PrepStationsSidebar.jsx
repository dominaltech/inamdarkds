import React, { useState, useMemo } from 'react';
import { useKds } from '../context/KdsContext';
import { soundEngine } from '../services/soundEngine';
import {
  Store,
  ChevronDown,
  ChevronUp,
  Layers,
  X
} from 'lucide-react';

export default function PrepStationsSidebar({ isOpen, onClose }) {
  const { kitchenItems, updateItemStatus } = useKds();
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Group active kitchen items by category for the PREP STATIONS sidebar
  const stationCategories = useMemo(() => {
    const map = new Map();

    kitchenItems
      .filter(item => !item.is_cancelled && item.status !== 'SERVED')
      .forEach(item => {
        const cat = item.category || 'General Kitchen';
        if (!map.has(cat)) {
          map.set(cat, {
            name: cat,
            items: new Map()
          });
        }
        const catGroup = map.get(cat);
        const dishKey = `${item.item_code}-${item.item_name}`;
        if (!catGroup.items.has(dishKey)) {
          catGroup.items.set(dishKey, {
            name: item.item_name,
            code: item.item_code,
            totalQty: 0,
            readyQty: 0,
            lineItems: []
          });
        }
        const dishGroup = catGroup.items.get(dishKey);
        const qty = Number(item.qty) || 1;
        dishGroup.totalQty += qty;
        if (item.status === 'READY') {
          dishGroup.readyQty += qty;
        }
        dishGroup.lineItems.push(item);
      });

    return Array.from(map.values()).map(cat => ({
      name: cat.name,
      dishes: Array.from(cat.items.values()),
      totalCount: Array.from(cat.items.values()).reduce((sum, d) => sum + d.totalQty, 0),
      isAllReady: Array.from(cat.items.values()).every(d => d.readyQty === d.totalQty && d.totalQty > 0)
    }));
  }, [kitchenItems]);

  const toggleCategoryCollapse = (catName) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catName]: !prev[catName]
    }));
  };

  const handleToggleDishReady = async (dish) => {
    soundEngine.playTap();
    const shouldMarkReady = dish.readyQty < dish.totalQty;
    for (const lineItem of dish.lineItems) {
      await updateItemStatus(lineItem.id, shouldMarkReady ? 'READY' : 'PREPARING');
    }
  };

  const totalActivePortions = stationCategories.reduce((sum, c) => sum + c.totalCount, 0);

  if (!isOpen) return null;

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      maxWidth: '280px',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      borderLeft: 'none',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      boxShadow: '2px 0 8px rgba(0, 0, 0, 0.03)',
      flexShrink: 0,
      zIndex: 10
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--kds-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Store size={15} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '900', color: '#1e293b', letterSpacing: '0.3px' }}>
              PREP STATIONS
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>
              {stationCategories.length} Categories • <strong style={{ color: '#ea580c' }}>{totalActivePortions} Items</strong>
            </div>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Collapse Sidebar"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Categories Cards List (Stacked vertically on the left) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {stationCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 8px', color: '#94a3b8' }}>
            <Layers size={32} style={{ opacity: 0.3, marginBottom: '6px' }} />
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>No active items in prep</p>
            <p style={{ fontSize: '10px', marginTop: '3px' }}>Orders from Captain PWA appear here grouped by category.</p>
          </div>
        ) : (
          stationCategories.map(cat => {
            const isCollapsed = !!collapsedCategories[cat.name];

            return (
              <div
                key={cat.name}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '7px 9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
                }}
              >
                {/* Category Header Row (e.g. "Chicken Dish - Portion (1 item) v") */}
                <div
                  onClick={() => toggleCategoryCollapse(cat.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                      {cat.name}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#ea580c' }}>
                      ({cat.totalCount} {cat.totalCount === 1 ? 'item' : 'items'})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
                </div>

                {/* Sub-Items List with Toggle Switches */}
                {!isCollapsed && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    paddingTop: '3px',
                    borderTop: '1px solid #edf2f7'
                  }}>
                    {cat.dishes.map(dish => {
                      const isReady = dish.readyQty === dish.totalQty && dish.totalQty > 0;

                      return (
                        <div
                          key={dish.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            padding: '2px 0'
                          }}
                        >
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: isReady ? '#94a3b8' : '#334155',
                            textDecoration: isReady ? 'line-through' : 'none',
                            lineHeight: 1.2
                          }}>
                            {dish.totalQty}x {dish.name}
                          </span>

                          {/* Toggle Switch */}
                          <div
                            onClick={() => handleToggleDishReady(dish)}
                            className={`toggle-switch ${isReady ? 'active' : ''}`}
                            title={isReady ? 'Mark pending' : 'Mark ready'}
                          >
                            <div className="toggle-thumb" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
