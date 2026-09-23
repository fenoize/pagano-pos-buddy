import { useEffect, useRef, useState } from 'react';
import {
  getIncomingChannelStatus,
  getIncomingLastSync,
  subscribeIncomingChannelStatus,
  type IncomingChannelStatus,
} from '@/lib/incomingOrdersChannelStore';
import { playAlarm } from '@/lib/audioManager';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';

const BAD_STATUSES: IncomingChannelStatus[] = ['CLOSED', 'CHANNEL_ERROR', 'TIMED_OUT'];
const DEBOUNCE_MS = 5000;
// Si no hay lectura exitosa de pedidos en este lapso, el POS está "ciego".
// El polling de respaldo corre cada 30s, por eso el umbral es de 90s.
const STALE_MS = 90000;

export function ConnectionAlarmBanner() {
  const { user } = useAuthContext();
  const { currentSession } = useCashSession();
  // Solo alarmar a staff con turno activo (sesión de caja abierta).
  // Sin turno, el usuario no es responsable de recibir pedidos.
  const isCustomerRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/cliente') ||
      window.location.pathname.startsWith('/customer'));
  const isEligible = !!user?.id && !!currentSession && !isCustomerRoute;

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
    if (!isEligible) {
      unhealthySinceRef.current = null;
      setVisible(false);
      return;
    }
    const evaluate = () => {
      const lastSync = getIncomingLastSync();
      const stale = lastSync !== null && Date.now() - lastSync > STALE_MS;
      const unhealthy = isOffline || stale || BAD_STATUSES.includes(channelStatus);

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

  // Alarma sonora mientras el POS esté sin conexión a pedidos
  useEffect(() => {
    if (!visible) return;
    playAlarm(2);
    const interval = window.setInterval(() => playAlarm(2), 15000);
    return () => clearInterval(interval);
  }, [visible]);

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
