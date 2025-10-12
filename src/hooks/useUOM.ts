import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UnitOfMeasure } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useUOM = () => {
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUOMs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units_of_measure')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setUoms(data || []);
    } catch (error) {
      console.error('Error fetching UOMs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las unidades de medida',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createUOM = async (uom: Omit<UnitOfMeasure, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('units_of_measure')
        .insert([uom])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Unidad de medida creada correctamente',
      });
      
      await fetchUOMs();
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating UOM:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la unidad de medida',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateUOM = async (id: string, updates: Partial<UnitOfMeasure>) => {
    try {
      const { error } = await supabase
        .from('units_of_measure')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Unidad de medida actualizada',
      });
      
      await fetchUOMs();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating UOM:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la unidad de medida',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteUOM = async (id: string) => {
    try {
      const { error } = await supabase
        .from('units_of_measure')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Unidad de medida desactivada',
      });
      
      await fetchUOMs();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting UOM:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desactivar la unidad de medida',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchUOMs();
  }, []);

  return {
    uoms,
    loading,
    fetchUOMs,
    createUOM,
    updateUOM,
    deleteUOM,
  };
};
