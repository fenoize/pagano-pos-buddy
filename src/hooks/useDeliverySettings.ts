import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AssignmentMode = 'assigned' | 'pool';
export type MapProvider = 'google_maps' | 'waze';

export interface DeliverySettings {
  id: string;
  assignment_mode: AssignmentMode;
  map_provider: MapProvider;
  store_lat: number | null;
  store_lng: number | null;
  store_address: string | null;
  auto_zone_detection: boolean;
  mapbox_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreLocation {
  lat: number;
  lng: number;
  address: string;
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

  const updateSettings = async (updates: Partial<Pick<DeliverySettings, 
    'assignment_mode' | 'map_provider' | 'store_lat' | 'store_lng' | 
    'store_address' | 'auto_zone_detection' | 'mapbox_token'
  >>) => {
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

  const updateStoreLocation = async (location: StoreLocation | null) => {
    if (!settings) return false;

    return updateSettings({
      store_lat: location?.lat ?? null,
      store_lng: location?.lng ?? null,
      store_address: location?.address ?? null
    });
  };

  const getStoreLocation = (): StoreLocation | null => {
    if (!settings?.store_lat || !settings?.store_lng) return null;
    return {
      lat: settings.store_lat,
      lng: settings.store_lng,
      address: settings.store_address || ''
    };
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    updateStoreLocation,
    getStoreLocation,
    refetch: fetchSettings
  };
};
