import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VariantGroupRow {
  id: string;
  name: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  options: VariantGroupOptionRow[];
}

export interface VariantGroupOptionRow {
  id: string;
  group_id: string;
  name: string;
  display_order: number;
  image_url: string | null;
  is_default: boolean;
  active: boolean;
}

export function useVariantGroups() {
  const [groups, setGroups] = useState<VariantGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('variant_groups')
        .select('*, options:variant_group_options(*)')
        .order('display_order');

      if (error) throw error;

      const sorted = (data || []).map((g: any) => ({
        ...g,
        options: (g.options || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
      setGroups(sorted);
    } catch (error) {
      console.error('Error fetching variant groups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const createGroup = async (name: string) => {
    const { error } = await supabase.from('variant_groups').insert({ name, display_order: groups.length });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return false; }
    toast({ title: 'Grupo creado' });
    await fetchGroups();
    return true;
  };

  const updateGroup = async (id: string, updates: { name?: string; active?: boolean }) => {
    const { error } = await supabase.from('variant_groups').update(updates).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await fetchGroups();
  };

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('variant_groups').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Grupo eliminado' });
    await fetchGroups();
  };

  const createOption = async (groupId: string, name: string) => {
    const group = groups.find(g => g.id === groupId);
    const order = group ? group.options.length : 0;
    const isDefault = order === 0;
    const { error } = await supabase.from('variant_group_options').insert({
      group_id: groupId, name, display_order: order, is_default: isDefault,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await fetchGroups();
  };

  const updateOption = async (id: string, updates: { name?: string; is_default?: boolean; active?: boolean }) => {
    const { error } = await supabase.from('variant_group_options').update(updates).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await fetchGroups();
  };

  const deleteOption = async (id: string) => {
    const { error } = await supabase.from('variant_group_options').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await fetchGroups();
  };

  // Product-group association
  const getProductGroups = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_variant_groups')
      .select('*, group:variant_groups(*, options:variant_group_options(*))')
      .eq('product_id', productId);
    if (error) { console.error(error); return []; }
    return (data || []).map((pvg: any) => ({
      ...pvg,
      group: pvg.group ? {
        ...pvg.group,
        options: (pvg.group.options || [])
          .filter((o: any) => o.active)
          .sort((a: any, b: any) => a.display_order - b.display_order),
      } : null,
    }));
  };

  const assignGroupToProduct = async (productId: string, groupId: string) => {
    const { error } = await supabase.from('product_variant_groups').insert({ product_id: productId, group_id: groupId });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Grupo asignado al producto' });
  };

  const removeGroupFromProduct = async (productId: string, groupId: string) => {
    const { error } = await supabase.from('product_variant_groups').delete()
      .eq('product_id', productId).eq('group_id', groupId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Grupo removido del producto' });
  };

  return {
    groups, loading, fetchGroups,
    createGroup, updateGroup, deleteGroup,
    createOption, updateOption, deleteOption,
    getProductGroups, assignGroupToProduct, removeGroupFromProduct,
  };
}
