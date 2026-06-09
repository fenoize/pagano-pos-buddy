import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SalesChannelType = 'local' | 'delivery_app' | 'web' | 'phone';

export interface SalesChannel {
  id: string;
  name: string;
  slug: string;
  type: SalesChannelType;
  color: string | null;
  icon_url: string | null;
  active: boolean;
  integration_enabled: boolean;
  integration_config: any | null;
  position: number;
  created_at: string;
  updated_at: string;
}

const QK = ['sales_channels'] as const;

export function useSalesChannels(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = opts;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QK, { onlyActive }] as const,
    queryFn: async () => {
      let q = supabase
        .from('sales_channels' as any)
        .select('*')
        .order('position', { ascending: true });
      if (onlyActive) q = q.eq('active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SalesChannel[];
    },
    staleTime: 60_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK });

  const createChannel = useMutation({
    mutationFn: async (input: Partial<SalesChannel>) => {
      const { data, error } = await (supabase.from('sales_channels' as any) as any)
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as SalesChannel;
    },
    onSuccess: invalidate,
  });

  const updateChannel = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SalesChannel> & { id: string }) => {
      const { data, error } = await (supabase.from('sales_channels' as any) as any)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SalesChannel;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase.from('sales_channels' as any) as any)
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteChannel = useMutation({
    mutationFn: async ({ id, slug }: { id: string; slug: string }) => {
      const { data: canDelete, error: rpcError } = await (supabase as any).rpc(
        'can_delete_sales_channel',
        { channel_slug: slug }
      );
      if (rpcError) throw rpcError;
      if (!canDelete) {
        throw new Error('Este canal tiene órdenes asociadas. Solo puedes desactivarlo.');
      }
      const { error } = await (supabase.from('sales_channels' as any) as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    channels: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createChannel,
    updateChannel,
    toggleActive,
    deleteChannel,
  };
}

/** Map dynamic channel slug → legacy `orders.source` value for back-compat */
export function channelSlugToLegacySource(slug?: string | null): string {
  if (!slug) return 'pos';
  if (slug === 'local') return 'pos';
  if (slug === 'app') return 'customer_app';
  return 'web';
}
