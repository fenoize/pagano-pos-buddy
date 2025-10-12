import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Warehouse } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useWarehouses = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los almacenes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const getDefaultWarehouse = () => {
    return warehouses.find((w) => w.is_default && w.is_active);
  };

  const createWarehouse = async (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('warehouses').insert([data]);

      if (error) throw error;

      toast({
        title: 'Almacén creado',
        description: 'El almacén se creó correctamente',
      });

      fetchWarehouses();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el almacén',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateWarehouse = async (id: string, data: Partial<Warehouse>) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Almacén actualizado',
        description: 'Los cambios se guardaron correctamente',
      });

      fetchWarehouses();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el almacén',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteWarehouse = async (id: string) => {
    try {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Almacén eliminado',
        description: 'El almacén se eliminó correctamente',
      });

      fetchWarehouses();
      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el almacén',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  return {
    warehouses,
    loading,
    fetchWarehouses,
    getDefaultWarehouse,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  };
};
