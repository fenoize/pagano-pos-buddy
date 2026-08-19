import { useEffect, useRef, useState } from 'react';
import {
  getIncomingChannelStatus,
  subscribeIncomingChannelStatus,
  type IncomingChannelStatus,
} from '@/lib/incomingOrdersChannelStore';

const BAD_STATUSES: IncomingChannelStatus[] = ['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'];
const DEBOUNCE_MS = 5000;

export function ConnectionAlarmBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [channelStatus, setChannelStatus] = useState<IncomingChannelStatus>(
    getIncomingChannelStatus()
  );
  const [visible, setVisible] = useState(false);
  const unhealthySinceRef = useRef<number | null>(null);

  // Monitor de red
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Monitor del canal Realtime de pedidos
  useEffect(() => subscribeIncomingChannelStatus(setChannelStatus), []);

  // Debounce: solo alertar si el problema se sostiene
  useEffect(() => {
    const evaluate = () => {
      const unhealthy = isOffline || BAD_STATUSES.includes(channelStatus);

      if (!unhealthy) {
        unhealthySinceRef.current = null;
        setVisible(false);
        return;
      }

      if (isOffline) {
        setVisible(true);
        return;
      }

      if (unhealthySinceRef.current === null) {
        unhealthySinceRef.current = Date.now();
        return;
      }
      if (Date.now() - unhealthySinceRef.current >= DEBOUNCE_MS) {
        setVisible(true);
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, 1000);
    return () => clearInterval(interval);
  }, [isOffline, channelStatus]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#7f1d1d',
        color: '#ffffff',
        fontWeight: 700,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      }}
    >
      <span style={{ fontSize: 17 }}>⚠ Sin conexión — No se están recibiendo pedidos</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: '#ffffff',
          color: '#7f1d1d',
          border: 'none',
          padding: '10px 20px',
          fontSize: 15,
          fontWeight: 800,
          borderRadius: 6,
          cursor: 'pointer',
          letterSpacing: 0.5,
        }}
      >
        RECONECTAR
      </button>
    </div>
  );
}

export default ConnectionAlarmBanner;
