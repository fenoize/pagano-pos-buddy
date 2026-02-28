import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ManufacturingFormula {
  id: string;
  raw_material_id: string;
  name: string;
  description?: string;
  yield_quantity: number;
  yield_uom_id?: string;
  preparation_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  raw_material?: { id: string; name: string; base_uom_id?: string; last_cost?: number };
  yield_uom?: { id: string; name: string; abbreviation: string };
  ingredients?: ManufacturingFormulaIngredient[];
}

export interface ManufacturingFormulaIngredient {
  id: string;
  formula_id: string;
  raw_material_id: string;
  quantity: number;
  uom_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  raw_material?: { id: string; name: string; last_cost?: number; avg_cost?: number; base_uom_id?: string };
  uom?: { id: string; name: string; abbreviation: string };
}

export const useManufacturingFormulas = () => {
  const [formulas, setFormulas] = useState<ManufacturingFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFormulas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('manufacturing_formulas')
        .select(`
          *,
          raw_material:raw_materials(id, name, base_uom_id, last_cost),
          yield_uom:units_of_measure(id, name, abbreviation),
          ingredients:manufacturing_formula_ingredients(
            *,
            raw_material:raw_materials(id, name, last_cost, avg_cost, base_uom_id),
            uom:units_of_measure(id, name, abbreviation)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFormulas((data as any) || []);
    } catch (error) {
      console.error('Error fetching manufacturing formulas:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las fórmulas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const createFormula = async (
    formula: { raw_material_id: string; name: string; description?: string; yield_quantity: number; yield_uom_id?: string; preparation_notes?: string; is_active?: boolean },
    ingredients: { raw_material_id: string; quantity: number; uom_id?: string; notes?: string }[]
  ) => {
    try {
      // Mark the raw material as manufactured
      await supabase.from('raw_materials').update({ is_manufactured: true } as any).eq('id', formula.raw_material_id);

      const { data: formulaData, error: formulaError } = await supabase
        .from('manufacturing_formulas')
        .insert([formula])
        .select()
        .single();

      if (formulaError) throw formulaError;

      if (ingredients.length > 0) {
        const rows = ingredients.map(ing => ({ ...ing, formula_id: formulaData.id }));
        const { error: ingError } = await supabase.from('manufacturing_formula_ingredients').insert(rows);
        if (ingError) throw ingError;
      }

      toast({ title: 'Éxito', description: 'Fórmula de fabricación creada' });
      await fetchFormulas();
      return { success: true, data: formulaData };
    } catch (error: any) {
      console.error('Error creating formula:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo crear la fórmula', variant: 'destructive' });
      return { success: false, error };
    }
  };

  const updateFormula = async (
    id: string,
    formula: Partial<ManufacturingFormula>,
    ingredients?: { raw_material_id: string; quantity: number; uom_id?: string; notes?: string }[]
  ) => {
    try {
      const { error } = await supabase
        .from('manufacturing_formulas')
        .update({ name: formula.name, description: formula.description, yield_quantity: formula.yield_quantity, yield_uom_id: formula.yield_uom_id, preparation_notes: formula.preparation_notes })
        .eq('id', id);

      if (error) throw error;

      if (ingredients !== undefined) {
        // Delete old ingredients and insert new ones
        await supabase.from('manufacturing_formula_ingredients').delete().eq('formula_id', id);
        if (ingredients.length > 0) {
          const rows = ingredients.map(ing => ({ ...ing, formula_id: id }));
          const { error: ingError } = await supabase.from('manufacturing_formula_ingredients').insert(rows);
          if (ingError) throw ingError;
        }
      }

      toast({ title: 'Éxito', description: 'Fórmula actualizada' });
      await fetchFormulas();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating formula:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo actualizar', variant: 'destructive' });
      return { success: false, error };
    }
  };

  const deleteFormula = async (id: string, rawMaterialId: string) => {
    try {
      const { error } = await supabase.from('manufacturing_formulas').update({ is_active: false }).eq('id', id);
      if (error) throw error;

      // Check if there are other active formulas for this material
      const { data: otherFormulas } = await supabase
        .from('manufacturing_formulas')
        .select('id')
        .eq('raw_material_id', rawMaterialId)
        .eq('is_active', true)
        .neq('id', id);

      if (!otherFormulas || otherFormulas.length === 0) {
        await supabase.from('raw_materials').update({ is_manufactured: false } as any).eq('id', rawMaterialId);
      }

      toast({ title: 'Éxito', description: 'Fórmula desactivada' });
      await fetchFormulas();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting formula:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo desactivar', variant: 'destructive' });
      return { success: false, error };
    }
  };

  useEffect(() => { fetchFormulas(); }, []);

  return { formulas, loading, fetchFormulas, createFormula, updateFormula, deleteFormula };
};
