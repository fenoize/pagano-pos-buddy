/**
 * Store mínimo para compartir el estado del canal Realtime de pedidos entrantes
 * entre el hook que lo crea (useIncomingOrders) y el banner de conexión.
 */
export type IncomingChannelStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'IDLE';

let status: IncomingChannelStatus = 'IDLE';
const listeners = new Set<(s: IncomingChannelStatus) => void>();

export function setIncomingChannelStatus(next: IncomingChannelStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l(status));
}

export function getIncomingChannelStatus() {
  return status;
}

export function subscribeIncomingChannelStatus(
  listener: (s: IncomingChannelStatus) => void
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
