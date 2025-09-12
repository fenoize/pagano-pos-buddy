import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  delivery_fee: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryZoneData {
  name: string;
  description?: string;
  delivery_fee: number;
  active?: boolean;
}

export interface UpdateDeliveryZoneData {
  name?: string;
  description?: string;
  delivery_fee?: number;
  active?: boolean;
}

export function useDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  const fetchZones = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('name');

      if (fetchError) {
        console.error('Error fetching delivery zones:', fetchError);
        setError('Error al cargar las zonas de delivery');
        return;
      }

      setZones(data || []);
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      setError('Error al cargar las zonas de delivery');
    } finally {
      setLoading(false);
    }
  };

  const createZone = async (zoneData: CreateDeliveryZoneData): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'Administrador') {
      return { success: false, error: 'No tienes permisos para crear zonas' };
    }

    try {
      const { data, error: createError } = await supabase
        .from('delivery_zones')
        .insert([zoneData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating delivery zone:', createError);
        return { success: false, error: 'Error al crear la zona de delivery' };
      }

      await fetchZones();
      return { success: true };
    } catch (error) {
      console.error('Error creating delivery zone:', error);
      return { success: false, error: 'Error al crear la zona de delivery' };
    }
  };

  const updateZone = async (zoneId: string, updateData: UpdateDeliveryZoneData): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'Administrador') {
      return { success: false, error: 'No tienes permisos para actualizar zonas' };
    }

    try {
      const { error: updateError } = await supabase
        .from('delivery_zones')
        .update(updateData)
        .eq('id', zoneId);

      if (updateError) {
        console.error('Error updating delivery zone:', updateError);
        return { success: false, error: 'Error al actualizar la zona de delivery' };
      }

      await fetchZones();
      return { success: true };
    } catch (error) {
      console.error('Error updating delivery zone:', error);
      return { success: false, error: 'Error al actualizar la zona de delivery' };
    }
  };

  const deleteZone = async (zoneId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'Administrador') {
      return { success: false, error: 'No tienes permisos para eliminar zonas' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', zoneId);

      if (deleteError) {
        console.error('Error deleting delivery zone:', deleteError);
        return { success: false, error: 'Error al eliminar la zona de delivery' };
      }

      await fetchZones();
      return { success: true };
    } catch (error) {
      console.error('Error deleting delivery zone:', error);
      return { success: false, error: 'Error al eliminar la zona de delivery' };
    }
  };

  const toggleZoneStatus = async (zoneId: string, active: boolean): Promise<{ success: boolean; error?: string }> => {
    return updateZone(zoneId, { active });
  };

  const getActiveZones = () => {
    return zones.filter(zone => zone.active);
  };

  useEffect(() => {
    fetchZones();
  }, [user]);

  return {
    zones,
    loading,
    error,
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
    toggleZoneStatus,
    getActiveZones,
    canManageZones: user?.role === 'Administrador'
  };
}