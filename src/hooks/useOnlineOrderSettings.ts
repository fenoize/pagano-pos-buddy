import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OnlineOrderSettings {
  id: string;
  app_orders_enabled: boolean;
  app_pickup_enabled: boolean;
  app_delivery_enabled: boolean;
  mp_enabled: boolean;
  mp_mode: 'sandbox' | 'production';
  mp_public_key: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnlineOrderSettings() {
  const [settings, setSettings] = useState<OnlineOrderSettings | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Cargar configuración actual usando RPC (sin headers custom)
   */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_online_order_settings');

      if (error) throw error;

      setSettings(data as unknown as OnlineOrderSettings);
      return data as unknown as OnlineOrderSettings;
    } catch (error: any) {
      console.error('Error fetching online order settings:', error);
      toast.error('Error al cargar configuración de pedidos online');
      return null;
    } finally {
      setLoading(false);
    }
  };


  /**
   * Actualizar configuración usando RPC (sin headers custom)
   */
  const updateSettings = async (updates: Partial<OnlineOrderSettings>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('update_online_order_settings', {
          p_settings: updates
        });

      if (error) throw error;

      setSettings(data as unknown as OnlineOrderSettings);
      toast.success('Configuración actualizada correctamente');
      return data as unknown as OnlineOrderSettings;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Error al actualizar configuración');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle para activar/desactivar pedidos desde app
   */
  const toggleAppOrders = async (enabled: boolean) => {
    return updateSettings({ app_orders_enabled: enabled });
  };

  /**
   * Toggle para activar/desactivar MercadoPago
   */
  const toggleMercadoPago = async (enabled: boolean) => {
    return updateSettings({ mp_enabled: enabled });
  };

  /**
   * Cambiar modo de MercadoPago (sandbox/production)
   */
  const setMPMode = async (mode: 'sandbox' | 'production') => {
    return updateSettings({ mp_mode: mode });
  };

  /**
   * Actualizar public key de MercadoPago
   */
  const setMPPublicKey = async (publicKey: string) => {
    return updateSettings({ mp_public_key: publicKey });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
    toggleAppOrders,
    toggleMercadoPago,
    setMPMode,
    setMPPublicKey
  };
}
