import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RawMaterial } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useRawMaterials = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          base_uom:units_of_measure(*)
        `)
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las materias primas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (material: Omit<RawMaterial, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert([material])
        .select(`
          *,
          base_uom:units_of_measure(*)
        `)
        .single();

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Materia prima creada correctamente',
      });
      
      await fetchMaterials();
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la materia prima',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateMaterial = async (id: string, updates: Partial<RawMaterial>) => {
    try {
      const { error } = await supabase
        .from('raw_materials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Materia prima actualizada',
      });
      
      await fetchMaterials();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la materia prima',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      // Soft delete: marcar como inactiva
      const { error } = await supabase
        .from('raw_materials')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Éxito',
        description: 'Materia prima desactivada',
      });
      
      await fetchMaterials();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting material:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desactivar la materia prima',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const getMaterialById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          base_uom:units_of_measure(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching material:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  return {
    materials,
    loading,
    fetchMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    getMaterialById,
  };
};
