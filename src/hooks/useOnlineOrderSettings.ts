import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export interface OnlineOrderSettings {
  id: string;
  app_orders_enabled: boolean;
  app_pickup_enabled: boolean;
  app_delivery_enabled: boolean;
  mp_enabled: boolean;
  mp_mode: 'sandbox' | 'production';
  mp_public_key: string | null;
  mp_client_id: string | null;
  mp_client_secret: string | null;
  created_at: string;
  updated_at: string;
}

export function useOnlineOrderSettings() {
  const [settings, setSettings] = useState<OnlineOrderSettings | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Cargar configuración actual usando RPC con contexto de staff
   */
  const fetchSettings = async () => {
    setLoading(true);
    try {
      // 1. Obtener y validar token
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      // 2. Validar token y obtener user_id
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_staff_token_v2', { _token: token });
      
      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Sesión inválida o expirada');
      }
      
      const userId = validationData[0].user_id;
      
      // 3. Establecer contexto de staff
      await supabase.rpc('set_staff_context', { p_user_id: userId });
      
      // 4. Ahora sí obtener configuración (pasando userId)
      const { data, error } = await supabase.rpc('get_online_order_settings', {
        p_user_id: userId
      });

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
   * Actualizar configuración usando RPC con contexto de staff
   */
  const updateSettings = async (updates: Partial<OnlineOrderSettings>) => {
    setLoading(true);
    try {
      // 1. Obtener y validar token
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      // 2. Validar token y obtener user_id
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_staff_token_v2', { _token: token });
      
      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Sesión inválida o expirada');
      }
      
      const userId = validationData[0].user_id;
      const isAdmin = validationData[0].is_admin;
      
      // 3. Verificar permisos de admin
      if (!isAdmin) {
        toast.error('Solo administradores pueden modificar esta configuración');
        throw new Error('Permisos insuficientes');
      }
      
      // 4. Establecer contexto
      await supabase.rpc('set_staff_context', { p_user_id: userId });
      
      // 5. Actualizar configuración (ahora pasamos el userId)
      const { data, error } = await supabase.rpc('update_online_order_settings', {
        p_settings: updates,
        p_user_id: userId
      });

      if (error) throw error;

      setSettings(data as unknown as OnlineOrderSettings);
      toast.success('Configuración actualizada correctamente');
      return data as unknown as OnlineOrderSettings;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Error al actualizar configuración');
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
