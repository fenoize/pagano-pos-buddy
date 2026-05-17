import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MaterialPurchasePresentation } from '@/types/purchaseRequests';
import { toast } from "sonner";

export function usePurchasePresentations(rawMaterialId?: string | null) {
  const [presentations, setPresentations] = useState<MaterialPurchasePresentation[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchPresentations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('material_purchase_presentations')
        .select(`
          *,
          purchase_uom:units_of_measure!material_purchase_presentations_purchase_uom_id_fkey(id, name, abbreviation),
          content_uom:units_of_measure!material_purchase_presentations_content_uom_id_fkey(id, name, abbreviation),
          raw_material:raw_materials!material_purchase_presentations_raw_material_id_fkey(id, name),
          supplier:suppliers!material_purchase_presentations_supplier_id_fkey(id, name)
        `)
        .eq('is_active', true)
        .order('name');

      if (rawMaterialId) {
        query = query.eq('raw_material_id', rawMaterialId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPresentations((data || []) as unknown as MaterialPurchasePresentation[]);
    } catch (error) {
      console.error('Error fetching presentations:', error);
    } finally {
      setLoading(false);
    }
  }, [rawMaterialId]);

  const createPresentation = async (data: {
    raw_material_id: string;
    supplier_id?: string | null;
    name: string;
    purchase_uom_id: string;
    content_qty: number;
    content_uom_id: string;
    last_price?: number;
    is_default?: boolean;
  }): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('material_purchase_presentations')
        .insert({
          raw_material_id: data.raw_material_id,
          supplier_id: data.supplier_id || null,
          name: data.name,
          purchase_uom_id: data.purchase_uom_id,
          content_qty: data.content_qty,
          content_uom_id: data.content_uom_id,
          last_price: data.last_price || 0,
          is_default: data.is_default || false,
        });
      if (error) throw error;
      toast.success('Presentación creada');
      await fetchPresentations();
      return true;
    } catch (error: any) {
      console.error('Error creating presentation:', error);
      toast.error('Error', { description: error.message });
      return false;
    }
  };

  const updatePresentation = async (id: string, data: Partial<{
    name: string;
    supplier_id: string | null;
    purchase_uom_id: string;
    content_qty: number;
    content_uom_id: string;
    last_price: number;
    is_default: boolean;
    is_active: boolean;
  }>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('material_purchase_presentations')
        .update(data)
        .eq('id', id);
      if (error) throw error;
      toast.success('Presentación actualizada');
      await fetchPresentations();
      return true;
    } catch (error: any) {
      console.error('Error updating presentation:', error);
      toast.error('Error', { description: error.message });
      return false;
    }
  };

  const deletePresentation = async (id: string): Promise<boolean> => {
    return updatePresentation(id, { is_active: false });
  };

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  return {
    presentations,
    loading,
    fetchPresentations,
    createPresentation,
    updatePresentation,
    deletePresentation,
  };
}
