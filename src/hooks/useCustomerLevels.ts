import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface Level {
  id: string;
  level_code: string;
  level_name: string;
  level_order: number;
  min_points: number;
  max_points: number | null;
  points_cost: number;
  icon: string | null;
  color: string | null;
  description: string | null;
  benefits: Json | null;
  is_active: boolean | null;
}

export interface LevelWithCount extends Level {
  customer_count: number;
}

export interface LevelInput {
  level_code: string;
  level_name: string;
  level_order: number;
  min_points: number;
  max_points: number | null;
  points_cost: number;
  icon: string;
  color: string;
  description: string | null;
  benefits: string[];
  is_active: boolean;
}

async function fetchLevels(): Promise<LevelWithCount[]> {
  const [{ data: levels, error: levelsError }, { data: customerLevels, error: clError }] = await Promise.all([
    supabase.from('customer_level_definitions').select('*').order('level_order', { ascending: true }),
    supabase.from('customer_levels').select('level_code'),
  ]);

  if (levelsError) throw levelsError;
  if (clError) throw clError;

  const counts = new Map<string, number>();
  for (const row of customerLevels || []) {
    const code = (row as { level_code: string }).level_code;
    counts.set(code, (counts.get(code) || 0) + 1);
  }

  return ((levels || []) as Level[]).map((level) => ({
    ...level,
    customer_count: counts.get(level.level_code) || 0,
  }));
}

export function useCustomerLevels() {
  return useQuery({
    queryKey: ['customer-level-definitions'],
    queryFn: fetchLevels,
    staleTime: 60_000,
  });
}

export function useLevelMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer-level-definitions'] });

  const createLevel = useMutation({
    mutationFn: async (input: LevelInput) => {
      const { error } = await supabase.from('customer_level_definitions').insert(input);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateLevel = useMutation({
    mutationFn: async ({ id, ...input }: LevelInput & { id: string }) => {
      const { error } = await supabase.from('customer_level_definitions').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('customer_level_definitions').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteLevel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_level_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createLevel, updateLevel, toggleActive, deleteLevel };
}
