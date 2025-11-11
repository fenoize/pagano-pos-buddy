import { useState, useEffect } from 'react';
import { configuredSupabase } from '@/lib/supabaseClient';

export interface CustomerOrderSettings {
  mp_payment_enabled: boolean;
  runas_payment_enabled: boolean;
  app_orders_enabled: boolean;
  app_pickup_enabled: boolean;
  app_delivery_enabled: boolean;
}

/**
 * Hook para obtener configuración de pedidos online desde la app de cliente.
 * No requiere autenticación de staff, accede a la configuración pública.
 */
export function useCustomerOrderSettings() {
  const [settings, setSettings] = useState<CustomerOrderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Llamar al RPC sin pasar user_id (acceso público de solo lectura)
      const { data, error: rpcError } = await configuredSupabase.rpc(
        'get_online_order_settings',
        { p_user_id: null }
      );

      if (rpcError) {
        console.error('Error fetching customer order settings:', rpcError);
        throw rpcError;
      }

      if (data) {
        const settingsData = data as any; // Type assertion para el objeto jsonb retornado
        setSettings({
          mp_payment_enabled: settingsData.mp_payment_enabled ?? true,
          runas_payment_enabled: settingsData.runas_payment_enabled ?? true,
          app_orders_enabled: settingsData.app_orders_enabled ?? true,
          app_pickup_enabled: settingsData.app_pickup_enabled ?? true,
          app_delivery_enabled: settingsData.app_delivery_enabled ?? false
        });
      }
    } catch (err: any) {
      console.error('Error loading customer order settings:', err);
      setError(err.message || 'Error al cargar configuración');
      
      // Fallback a valores por defecto en caso de error
      setSettings({
        mp_payment_enabled: true,
        runas_payment_enabled: true,
        app_orders_enabled: true,
        app_pickup_enabled: true,
        app_delivery_enabled: false
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings
  };
}
