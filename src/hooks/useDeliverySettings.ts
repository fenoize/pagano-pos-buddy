import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AssignmentMode = 'assigned' | 'pool';
export type MapProvider = 'google_maps' | 'waze';

export interface DeliverySettings {
  id: string;
  assignment_mode: AssignmentMode;
  map_provider: MapProvider;
  created_at: string;
  updated_at: string;
}

export const useDeliverySettings = () => {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data as DeliverySettings);
    } catch (error: any) {
      console.error('Error fetching delivery settings:', error);
      toast.error('Error al cargar configuración de delivery');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<Pick<DeliverySettings, 'assignment_mode' | 'map_provider'>>) => {
    try {
      if (!settings) return false;

      const { data, error } = await supabase
        .from('delivery_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as DeliverySettings);
      toast.success('Configuración actualizada correctamente');
      return true;
    } catch (error: any) {
      console.error('Error updating delivery settings:', error);
      toast.error('Error al actualizar configuración');
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings
  };
};
