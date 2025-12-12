import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Supplier } from '@/types/supplier';

export type { Supplier } from '@/types/supplier';

export function useSuppliers(includeInactive = false) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuppliers((data || []) as Supplier[]);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los proveedores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSupplier = async (data: Partial<Supplier>) => {
    try {
      const insertData = { ...data, is_active: true };
      delete insertData.id;
      delete insertData.created_at;
      delete insertData.updated_at;
      
      const { error } = await supabase
        .from('suppliers')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: 'Proveedor creado',
        description: 'El proveedor se ha registrado exitosamente',
      });

      await fetchSuppliers();
      return true;
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el proveedor',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Proveedor actualizado',
        description: 'Los cambios se han guardado correctamente',
      });

      await fetchSuppliers();
      return true;
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el proveedor',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleActiveSupplier = async (id: string, currentStatus: boolean) => {
    return await updateSupplier(id, { is_active: !currentStatus });
  };

  useEffect(() => {
    fetchSuppliers();
  }, [includeInactive]);

  return {
    suppliers,
    loading,
    createSupplier,
    updateSupplier,
    toggleActiveSupplier,
    refetch: fetchSuppliers,
  };
}
