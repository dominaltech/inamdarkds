import React from 'react';
import { useKds } from '../context/KdsContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function CancellationAlertModal() {
  const { cancellationAlert, dismissCancellationAlert } = useKds();

  if (!cancellationAlert) return null;

  return (
    <div className="modal-overlay" style={{ background: 'rgba(220, 38, 38, 0.45)', backdropFilter: 'blur(10px)' }}>
      <div
        className="modal-content pulse-red"
        style={{
          maxWidth: '520px',
          background: 'linear-gradient(135deg, #1e1014, #0f0b0d)',
          border: '2px solid #ef4444',
          borderRadius: '20px',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.8)'
        }}
      >
        <div style={{
          background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#fff'
        }}>
          <AlertTriangle size={28} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.5px' }}>
              *** CANCEL KOT ITEM ***
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.9 }}>
              Cook Alert: Dish voided at Counter POS — Stop food preparation!
            </p>
          </div>
        </div>

        <div style={{ padding: '24px 20px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '18px'
          }}>
            <div style={{ fontSize: '12px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: '700' }}>
              Table & Dish Voided
            </div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#fff', margin: '4px 0' }}>
              Table {cancellationAlert.tableId}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#f87171' }}>
              {cancellationAlert.dish}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <div>
              Reason: <strong style={{ color: '#fff' }}>{cancellationAlert.reason}</strong>
            </div>
            <div>
              Authorized by: <strong style={{ color: '#fff' }}>{cancellationAlert.authorizedBy}</strong>
            </div>
            <div>
              Time: <strong style={{ color: '#fff' }}>{cancellationAlert.time}</strong>
            </div>
          </div>

          <div style={{ marginTop: '22px' }}>
            <button
              onClick={dismissCancellationAlert}
              className="btn btn-danger"
              style={{
                width: '100%',
                height: '50px',
                fontSize: '15px',
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}
            >
              <CheckCircle size={20} />
              <span>Acknowledge Cancellation (Food Prep Stopped)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
