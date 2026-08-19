import { useEffect, useRef } from 'react';
import { playAlarm } from '@/lib/audioManager';

const BASE_TITLE = 'Paganos POS';

interface AlarmOrder {
  id: string;
  order_number: number;
}

/**
 * Alarma persistente para pedidos en estado PendienteAceptacion:
 * - Suena de inmediato y repite cada 8s mientras haya pedidos sin atender.
 * - Badge en el título de la pestaña.
 * - Notificación nativa del sistema por cada pedido nuevo (requireInteraction).
 */
export function usePendingOrdersAlarm(orders: AlarmOrder[], enabled: boolean = true) {
  const count = enabled ? orders.length : 0;
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Sonido: inmediato + repetición cada 8s
  useEffect(() => {
    if (count === 0) return;

    playAlarm();
    const interval = setInterval(() => {
      playAlarm();
    }, 8000);

    return () => clearInterval(interval);
  }, [count]);

  // Badge en el título de la pestaña
  useEffect(() => {
    if (count > 0) {
      document.title = `(${count}) ⚡ Pedido nuevo — ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }
    return () => {
      document.title = BASE_TITLE;
    };
  }, [count]);

  // Notificación del sistema por cada pedido nuevo
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const currentIds = new Set(orders.map((o) => o.id));

    orders.forEach((order) => {
      if (notifiedIdsRef.current.has(order.id)) return;
      notifiedIdsRef.current.add(order.id);
      try {
        new Notification('⚡ Nuevo pedido en Paganos', {
          body: `Pedido #${order.order_number} esperando aprobación`,
          icon: '/favicon.ico',
          tag: `pending-order-${order.id}`,
          requireInteraction: true,
        });
      } catch (e) {
        console.error('[usePendingOrdersAlarm] Notification error:', e);
      }
    });

    // Limpiar ids ya atendidos
    notifiedIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) notifiedIdsRef.current.delete(id);
    });
  }, [orders, enabled]);
}
