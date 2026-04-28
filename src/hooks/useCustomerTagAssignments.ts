import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomerTagAssignment {
  id: string;
  customer_id: string;
  tag_id: string;
  source: 'manual' | 'alliance' | 'campaign' | 'import' | 'system';
  source_ref_id: string | null;
  assigned_at: string;
  tag: {
    id: string;
    name: string;
    color: string;
    description: string | null;
  };
}

export const useCustomerTagAssignments = (customerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const withContext = async () => {
    if (!user?.id) throw new Error('Usuario no autenticado');
    await setStaffContext(user.id);
  };

  const assignmentsQuery = useQuery({
    queryKey: ['customer-tag-assignments', customerId],
    enabled: !!customerId,
    queryFn: async (): Promise<CustomerTagAssignment[]> => {
      await withContext();
      const { data, error } = await (configuredSupabase as any)
        .from('customer_tag_assignments')
        .select('id, customer_id, tag_id, source, source_ref_id, assigned_at, tag:customer_tags(id, name, color, description)')
        .eq('customer_id', customerId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const assignTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!customerId) throw new Error('Sin cliente');
      await withContext();
      const { data, error } = await (configuredSupabase as any).rpc('assign_customer_tag', {
        _customer_id: customerId,
        _tag_id: tagId,
        _source: 'manual',
        _source_ref_id: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast.success('Etiqueta agregada');
    },
    onError: (e: any) => toast.error('Error: ' + e.message),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!customerId) throw new Error('Sin cliente');
      await withContext();
      const { error } = await (configuredSupabase as any).rpc('remove_customer_tag', {
        _customer_id: customerId,
        _tag_id: tagId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tag-assignments', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast.success('Etiqueta removida');
    },
    onError: (e: any) => toast.error('Error: ' + e.message),
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    assignTag: assignTag.mutateAsync,
    removeTag: removeTag.mutateAsync,
  };
};
