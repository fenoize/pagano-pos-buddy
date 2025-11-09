import { useState } from 'react';
import { 
  createMPPreference, 
  getStoreStatus, 
  validateStoreAcceptingOrders,
  type CreateMPPreferenceParams,
  type StoreStatus 
} from '@/lib/integrations/mercadopago';
import { toast } from 'sonner';

export function useMercadoPago() {
  const [loading, setLoading] = useState(false);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  /**
   * Obtiene el estado actual del local
   */
  const fetchStoreStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getStoreStatus();
      setStoreStatus(status);
      return status;
    } catch (error: any) {
      console.error('Error fetching store status:', error);
      toast.error('Error al verificar disponibilidad del local');
      return null;
    } finally {
      setLoadingStatus(false);
    }
  };

  /**
   * Valida si el local está aceptando pedidos
   */
  const checkStoreAvailability = async (): Promise<boolean> => {
    try {
      await validateStoreAcceptingOrders();
      return true;
    } catch (error: any) {
      toast.error(error.message);
      return false;
    }
  };

  /**
   * Crea una preferencia de pago y redirige a MercadoPago
   */
  const createPaymentAndRedirect = async (params: CreateMPPreferenceParams) => {
    setLoading(true);
    try {
      // Primero validar que el local esté aceptando pedidos
      const isAvailable = await checkStoreAvailability();
      if (!isAvailable) {
        return null;
      }

      // Crear la preferencia de pago
      const response = await createMPPreference(params);
      
      if (response.success) {
        toast.success(`Pedido #${response.order_number} creado. Redirigiendo a MercadoPago...`);
        
        // Redirigir a MercadoPago
        // Usar sandbox_init_point en desarrollo, init_point en producción
        const paymentUrl = response.sandbox_init_point || response.init_point;
        window.location.href = paymentUrl;
        
        return response;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Error al procesar el pago');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    storeStatus,
    loadingStatus,
    fetchStoreStatus,
    checkStoreAvailability,
    createPaymentAndRedirect
  };
}
