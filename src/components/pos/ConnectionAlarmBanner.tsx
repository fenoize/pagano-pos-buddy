import { useConnectionAlarm } from '@/hooks/useConnectionAlarm';

export function ConnectionAlarmBanner() {
  const { isDisconnected, dismissAlarm } = useConnectionAlarm();

  if (!isDisconnected) return null;

  return (
    <>
      <style>{`
        @keyframes connectionAlarmPulse {
          from { transform: scale(1); }
          to { transform: scale(1.02); }
        }
      `}</style>
      <div
        role="alert"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#cc2525',
          color: '#ffffff',
          fontWeight: 700,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          animation: 'connectionAlarmPulse 0.5s infinite alternate',
          transformOrigin: 'center top',
        }}
      >
        <span style={{ fontSize: 18 }}>
          ⚠ CONEXIÓN PERDIDA — Los pedidos no están llegando al sistema.
        </span>
        <button
          onClick={dismissAlarm}
          style={{
            background: '#ffffff',
            color: '#cc2525',
            border: 'none',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: 800,
            borderRadius: 6,
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          RECONECTAR AHORA
        </button>
      </div>
    </>
  );
}

export default ConnectionAlarmBanner;
