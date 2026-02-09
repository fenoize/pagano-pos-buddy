import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useMercadoPago } from '@/hooks/useMercadoPago';

interface StoreStatusBannerProps {
  onStatusChange?: (canOrder: boolean) => void;
}

export function StoreStatusBanner({ onStatusChange }: StoreStatusBannerProps) {
  const { storeStatus, loadingStatus, fetchStoreStatus } = useMercadoPago();

  useEffect(() => {
    // Fetch initial status
    fetchStoreStatus();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchStoreStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (storeStatus && onStatusChange) {
      const canOrder = storeStatus.app_orders_enabled && storeStatus.accept_app_orders;
      onStatusChange(canOrder);
    }
  }, [storeStatus, onStatusChange]);

  if (loadingStatus) {
    return (
      <Alert>
        <Clock className="h-4 w-4 animate-pulse" />
        <AlertDescription>
          Verificando disponibilidad del local...
        </AlertDescription>
      </Alert>
    );
  }

  if (!storeStatus) {
    return null;
  }

  // All good - orders are being accepted
  if (storeStatus.app_orders_enabled && storeStatus.accept_app_orders) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          ¡Estamos recibiendo pedidos! Haz tu orden ahora.
        </AlertDescription>
      </Alert>
    );
  }

  // App orders are disabled system-wide
  if (!storeStatus.app_orders_enabled) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          Los pedidos desde la app están temporalmente deshabilitados. Por favor, visítanos en el local o intenta más tarde.
        </AlertDescription>
      </Alert>
    );
  }

  // Cash session is not accepting app orders (paused)
  if (!storeStatus.accept_app_orders) {
    return (
      <Alert className="border-amber-400 bg-amber-500/20">
        <AlertCircle className="h-4 w-4 text-amber-300" />
        <AlertDescription className="text-amber-100 font-medium">
          El local está en pausa y no está recibiendo pedidos en este momento. Por favor, intenta más tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
