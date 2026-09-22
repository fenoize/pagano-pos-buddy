import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getIncomingChannelStatus,
  getIncomingLastSync,
  subscribeIncomingChannelStatus,
  subscribeIncomingSync,
  type IncomingChannelStatus,
} from '@/lib/incomingOrdersChannelStore';

const STALE_MS = 90000;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Indicador discreto de salud del canal de pedidos.
 * Muestra la hora de la última lectura correcta de pedidos pendientes,
 * para confirmar de un vistazo que el POS está escuchando.
 */
export function OrdersHeartbeat() {
  const [lastSync, setLastSync] = useState<number | null>(getIncomingLastSync());
  const [status, setStatus] = useState<IncomingChannelStatus>(getIncomingChannelStatus());
  const [, setTick] = useState(0);

  useEffect(() => subscribeIncomingSync(setLastSync), []);
  useEffect(() => subscribeIncomingChannelStatus(setStatus), []);

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  if (lastSync === null) return null;

  const stale = Date.now() - lastSync > STALE_MS || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';

  return (
    <div
      className={cn(
        'hidden md:flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md',
        stale ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted/50'
      )}
      title={stale ? 'El POS no está recibiendo pedidos' : 'El POS está escuchando pedidos nuevos'}
    >
      {stale ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
      <span>
        {stale ? 'Sin lectura desde' : 'Pedidos al día'} {formatTime(lastSync)}
      </span>
    </div>
  );
}

export default OrdersHeartbeat;
