/**
 * Store mínimo para compartir el estado del canal Realtime de pedidos entrantes
 * y la última sincronización exitosa entre el hook que los produce
 * (useIncomingOrders) y el banner de conexión.
 */
export type IncomingChannelStatus =
  | 'CONNECTING'
  | 'SUBSCRIBED'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'IDLE';

let status: IncomingChannelStatus = 'IDLE';
let lastSyncAt: number | null = null;
const listeners = new Set<(s: IncomingChannelStatus) => void>();
const syncListeners = new Set<(t: number) => void>();

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

/** Marca una lectura exitosa de pedidos pendientes (Realtime o polling). */
export function markIncomingSync() {
  lastSyncAt = Date.now();
  syncListeners.forEach((l) => l(lastSyncAt!));
}

export function getIncomingLastSync() {
  return lastSyncAt;
}

export function subscribeIncomingSync(listener: (t: number) => void) {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}
