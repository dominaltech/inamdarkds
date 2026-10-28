import React from 'react';
import { useKds } from '../context/KdsContext';
import { soundEngine } from '../services/soundEngine';
import {
  Store,
  Volume2,
  VolumeX,
  RefreshCw,
  Bell,
  Maximize2
} from 'lucide-react';

export default function KdsHeader({ isSidebarOpen, onToggleSidebar }) {
  const { kitchenItems, isMuted, toggleMute, isLoading, loadData } = useKds();

  const totalKitchenPortions = kitchenItems
    .filter(item => !item.is_cancelled && item.status !== 'SERVED')
    .reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header style={{
      background: 'var(--kds-header-bg)',
      borderBottom: '1px solid #e2e8f0',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 50,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      {/* Left: INAMDAR Brand & Online Badge (Patpuja removed as requested) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '19px',
            fontWeight: '900',
            color: '#1e293b',
            letterSpacing: '-0.4px',
            fontFamily: 'var(--font-sans)'
          }}>
            INAMDAR
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: '800',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            paddingLeft: '6px',
            borderLeft: '1.5px solid #cbd5e1'
          }}>
            KITCHEN DISPLAY
          </span>
        </div>

        {/* Online Green Badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '999px',
          background: '#dcfce7',
          color: '#15803d',
          fontSize: '11px',
          fontWeight: '800'
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
          Online
        </span>
      </div>

      {/* Right Controls: Sidebar Toggle, Call Bell, Sound, Refresh, Fullscreen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Prep Stations Sidebar Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="btn"
          style={{
            height: '34px',
            padding: '0 12px',
            fontSize: '12px',
            borderRadius: '8px',
            background: isSidebarOpen ? 'rgba(37, 99, 235, 0.12)' : '#f1f5f9',
            color: isSidebarOpen ? 'var(--kds-blue)' : '#475569',
            border: isSidebarOpen ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid #e2e8f0',
            fontWeight: '800'
          }}
          title="Toggle Prep Stations Side Panel"
        >
          <Store size={14} />
          <span>Prep Stations</span>
          {totalKitchenPortions > 0 && (
            <span style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '999px',
              background: isSidebarOpen ? 'var(--kds-blue)' : '#cbd5e1',
              color: '#ffffff'
            }}>
              {totalKitchenPortions}
            </span>
          )}
        </button>

        <button
          onClick={() => soundEngine.playKitchenBell()}
          className="btn btn-ghost"
          style={{ height: '34px', padding: '0 10px' }}
          title="Ring Kitchen Call Bell"
        >
          <Bell size={14} style={{ color: '#d97706' }} />
          <span style={{ fontSize: '11px', fontWeight: '700' }}>Bell</span>
        </button>

        <button
          onClick={toggleMute}
          className="btn btn-ghost"
          style={{ width: '34px', height: '34px', padding: 0 }}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX size={15} style={{ color: '#ef4444' }} /> : <Volume2 size={15} style={{ color: '#2563eb' }} />}
        </button>

        <button
          onClick={loadData}
          className="btn btn-ghost"
          style={{ width: '34px', height: '34px', padding: 0 }}
          title="Refresh Orders"
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
        </button>

        <button
          onClick={handleToggleFullscreen}
          className="btn btn-ghost"
          style={{ width: '34px', height: '34px', padding: 0 }}
          title="Fullscreen Mode"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </header>
  );
}
