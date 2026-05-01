import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Branch } from '@/contexts/BranchContext';
import { toast } from 'sonner';

const KEY = ['branches'];

export function useBranches() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as Branch[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Branch>) => {
      const { data, error } = await supabase
        .from('branches')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Local creado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al crear local'),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Branch> & { id: string }) => {
      const { data, error } = await supabase
        .from('branches')
        .update(input as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Local actualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Error al actualizar local'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success('Local eliminado');
    },
    onError: (e: any) => toast.error(e.message || 'No se pudo eliminar'),
  });

  return {
    branches: query.data || [],
    isLoading: query.isLoading,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
  };
}
