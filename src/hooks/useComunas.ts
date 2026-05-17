import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comuna } from '@/types';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from "sonner";

export function useComunas() {
  const [comunas, setComunas] = useState<Comuna[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  const canManageComunas = user?.role === 'Administrador';

  useEffect(() => {
    fetchComunas();
  }, []);

  const fetchComunas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await (supabase as any)
        .from('comunas')
        .select('*')
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      
      setComunas((data || []) as unknown as Comuna[]);
    } catch (err: any) {
      console.error('Error fetching comunas:', err);
      setError(err.message);
      toast.error("Error", { description: "No se pudieron cargar las comunas" });
    } finally {
      setLoading(false);
    }
  };

  const createComuna = async (comunaData: { name: string; sort_order?: number }) => {
    if (!canManageComunas) {
      toast.error("Sin permisos", { description: "No tienes permisos para crear comunas" });
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error: createError } = await (supabase as any)
        .from('comunas')
        .insert({
          name: comunaData.name,
          sort_order: comunaData.sort_order || 0,
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      toast.success("Comuna creada", { description: `Comuna "${comunaData.name}" creada exitosamente` });

      await fetchComunas();
      return data ? (data as any as Comuna) : null;
    } catch (err: any) {
      console.error('Error creating comuna:', err);
      toast.error("Error", { description: err.message || "No se pudo crear la comuna" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateComuna = async (comunaId: string, updateData: Partial<Comuna>) => {
    if (!canManageComunas) {
      toast.error("Sin permisos", { description: "No tienes permisos para actualizar comunas" });
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error: updateError } = await (supabase as any)
        .from('comunas')
        .update(updateData)
        .eq('id', comunaId)
        .select()
        .single();

      if (updateError) throw updateError;

      toast.success("Comuna actualizada", { description: "Comuna actualizada exitosamente" });

      await fetchComunas();
      return data ? (data as any as Comuna) : null;
    } catch (err: any) {
      console.error('Error updating comuna:', err);
      toast.error("Error", { description: err.message || "No se pudo actualizar la comuna" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteComuna = async (comunaId: string) => {
    if (!canManageComunas) {
      toast.error("Sin permisos", { description: "No tienes permisos para eliminar comunas" });
      return false;
    }

    try {
      setLoading(true);
      
      const { error: deleteError } = await (supabase as any)
        .from('comunas')
        .delete()
        .eq('id', comunaId);

      if (deleteError) throw deleteError;

      toast.success("Comuna eliminada", { description: "Comuna eliminada exitosamente" });

      await fetchComunas();
      return true;
    } catch (err: any) {
      console.error('Error deleting comuna:', err);
      toast.error("Error", { description: err.message || "No se pudo eliminar la comuna" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleComunaStatus = async (comunaId: string, isActive: boolean) => {
    if (!canManageComunas) {
      toast.error("Sin permisos", { description: "No tienes permisos para cambiar el estado de comunas" });
      return false;
    }

    try {
      setLoading(true);
      
      const { error: updateError } = await (supabase as any)
        .from('comunas')
        .update({ is_active: isActive })
        .eq('id', comunaId);

      if (updateError) throw updateError;

      toast.success("Estado actualizado", { description: `Comuna ${isActive ? 'activada' : 'desactivada'} exitosamente` });

      await fetchComunas();
      return true;
    } catch (err: any) {
      console.error('Error toggling comuna status:', err);
      toast.error("Error", { description: err.message || "No se pudo cambiar el estado" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    comunas,
    loading,
    error,
    canManageComunas,
    fetchComunas,
    createComuna,
    updateComuna,
    deleteComuna,
    toggleComunaStatus
  };
}
