import { useState, useEffect } from 'react';
import { getConfiguredSupabase } from '@/lib/supabaseClient';
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
   * Cargar configuración actual
   */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const supabase = getConfiguredSupabase();
      const { data, error } = await supabase
        .from('online_order_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No existe registro, crear uno por defecto
          return await createDefaultSettings();
        }
        throw error;
      }

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
   * Crear configuración por defecto
   */
  const createDefaultSettings = async () => {
    try {
      const supabase = getConfiguredSupabase();
      const { data, error } = await supabase
        .from('online_order_settings')
        .insert({
          app_orders_enabled: false,
          app_pickup_enabled: true,
          app_delivery_enabled: false,
          mp_enabled: false,
          mp_mode: 'sandbox',
          mp_public_key: null
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data as unknown as OnlineOrderSettings);
      return data as unknown as OnlineOrderSettings;
    } catch (error: any) {
      console.error('Error creating default settings:', error);
      throw error;
    }
  };

  /**
   * Actualizar configuración
   */
  const updateSettings = async (updates: Partial<OnlineOrderSettings>) => {
    if (!settings) return;

    setLoading(true);
    try {
      const supabase = getConfiguredSupabase();
      const { data, error } = await supabase
        .from('online_order_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

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
