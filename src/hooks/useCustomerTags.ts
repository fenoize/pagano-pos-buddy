import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  auto_source: 'manual' | 'alliance' | 'campaign' | 'system';
  customer_count?: number;
  created_at: string;
}

export interface CustomerTagInput {
  name: string;
  color: string;
  description?: string | null;
}

export const useCustomerTags = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const withContext = async () => {
    if (!user?.id) throw new Error('Usuario no autenticado');
    await setStaffContext(user.id);
  };

  const tagsQuery = useQuery({
    queryKey: ['customer-tags'],
    queryFn: async (): Promise<CustomerTag[]> => {
      await withContext();
      const { data, error } = await (configuredSupabase as any).rpc('list_customer_tags_with_counts');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        customer_count: Number(t.customer_count || 0),
      }));
    },
  });

  const createTag = useMutation({
    mutationFn: async (input: CustomerTagInput) => {
      await withContext();
      const { data, error } = await (configuredSupabase as any)
        .from('customer_tags')
        .insert([{ name: input.name.trim(), color: input.color, description: input.description || null }])
        .select()
        .single();
      if (error) throw error;
      return data as CustomerTag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast.success('Etiqueta creada');
    },
    onError: (e: any) => toast.error('Error al crear etiqueta: ' + e.message),
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CustomerTagInput>) => {
      await withContext();
      const { data, error } = await (configuredSupabase as any)
        .from('customer_tags')
        .update({
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.color !== undefined && { color: input.color }),
          ...(input.description !== undefined && { description: input.description || null }),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments'] });
      toast.success('Etiqueta actualizada');
    },
    onError: (e: any) => toast.error('Error al actualizar etiqueta: ' + e.message),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      await withContext();
      const { error } = await (configuredSupabase as any).from('customer_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments'] });
      toast.success('Etiqueta eliminada');
    },
    onError: (e: any) => toast.error('Error al eliminar etiqueta: ' + e.message),
  });

  return {
    tags: tagsQuery.data || [],
    isLoading: tagsQuery.isLoading,
    createTag: createTag.mutateAsync,
    updateTag: updateTag.mutateAsync,
    deleteTag: deleteTag.mutateAsync,
  };
};
