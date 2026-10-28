import React, { useState } from 'react';
import { KdsProvider } from './context/KdsContext';
import KdsHeader from './components/KdsHeader';
import PrepStationsSidebar from './components/PrepStationsSidebar';
import TicketGrid from './components/TicketGrid';
import CancellationAlertModal from './components/CancellationAlertModal';

function KdsMain() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--kds-bg)'
    }}>
      {/* Brand Header & Global Controls */}
      <KdsHeader
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Main Workspace: PREP STATIONS on the LEFT SIDE + Live Table Order Cards on the RIGHT */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 54px)'
      }}>
        {/* 1. Dedicated PREP STATIONS Category Rail on the LEFT SIDE */}
        <PrepStationsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* 2. Main Live KOT Table Orders Rail (Takes Full Remaining Width, Never Hidden) */}
        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: '100%'
        }}>
          <TicketGrid />
        </main>
      </div>

      {/* Live Void / Cancellation Modal */}
      <CancellationAlertModal />
    </div>
  );
}

export default function App() {
  return (
    <KdsProvider>
      <KdsMain />
    </KdsProvider>
  );
}
