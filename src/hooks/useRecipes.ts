import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Recipe, RecipeIngredient } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          product:products(id, name),
          category_variant:category_variants(id, name),
          yield_uom:units_of_measure(*),
          ingredients:recipe_ingredients(
            *,
            raw_material:raw_materials(*),
            uom:units_of_measure(*)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las recetas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createRecipe = async (
    recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
    ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at' | 'updated_at'>[]
  ) => {
    try {
      // 1. Crear la receta (cabecera)
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert([recipe])
        .select()
        .single();

      if (recipeError) throw recipeError;

      // 2. Crear los ingredientes (detalle)
      if (ingredients.length > 0) {
        const ingredientsWithRecipeId = ingredients.map(ing => ({
          ...ing,
          recipe_id: recipeData.id,
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsWithRecipeId);

        if (ingredientsError) throw ingredientsError;
      }

      toast({
        title: 'Éxito',
        description: 'Receta creada correctamente',
      });

      await fetchRecipes();
      return { success: true, data: recipeData };
    } catch (error: any) {
      console.error('Error creating recipe:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la receta',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateRecipe = async (id: string, updates: Partial<Recipe>) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Receta actualizada',
      });

      await fetchRecipes();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating recipe:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la receta',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      // Soft delete: marcar como inactiva
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Receta desactivada',
      });

      await fetchRecipes();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting recipe:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desactivar la receta',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const addIngredient = async (
    recipeId: string,
    ingredient: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert([{ ...ingredient, recipe_id: recipeId }])
        .select(`
          *,
          raw_material:raw_materials(*),
          uom:units_of_measure(*)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Ingrediente agregado',
      });

      await fetchRecipes();
      return { success: true, data };
    } catch (error: any) {
      console.error('Error adding ingredient:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo agregar el ingrediente',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const updateIngredient = async (id: string, updates: Partial<RecipeIngredient>) => {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Ingrediente actualizado',
      });

      await fetchRecipes();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating ingredient:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el ingrediente',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const removeIngredient = async (id: string) => {
    try {
      // Soft delete: marcar como inactivo
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Ingrediente eliminado',
      });

      await fetchRecipes();
      return { success: true };
    } catch (error: any) {
      console.error('Error removing ingredient:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el ingrediente',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const duplicateRecipe = async (recipeId: string) => {
    try {
      // 1. Obtener receta original con ingredientes
      const { data: originalRecipe, error: fetchError } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(*)
        `)
        .eq('id', recipeId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Crear nueva receta con nombre modificado
      const newRecipe = {
        product_id: originalRecipe.product_id,
        category_variant_id: originalRecipe.category_variant_id,
        name: `${originalRecipe.name} (copia)`,
        description: originalRecipe.description,
        yield_quantity: originalRecipe.yield_quantity,
        yield_uom_id: originalRecipe.yield_uom_id,
        preparation_notes: originalRecipe.preparation_notes,
        is_active: true,
      };

      const { data: newRecipeData, error: createError } = await supabase
        .from('recipes')
        .insert([newRecipe])
        .select()
        .single();

      if (createError) throw createError;

      // 3. Duplicar ingredientes
      if (originalRecipe.ingredients && originalRecipe.ingredients.length > 0) {
        const newIngredients = originalRecipe.ingredients.map((ing: any) => ({
          recipe_id: newRecipeData.id,
          raw_material_id: ing.raw_material_id,
          quantity_per_unit: ing.quantity_per_unit,
          uom_id: ing.uom_id,
          is_optional: ing.is_optional,
          is_active: ing.is_active,
          notes: ing.notes,
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(newIngredients);

        if (ingredientsError) throw ingredientsError;
      }

      toast({
        title: 'Éxito',
        description: 'Receta duplicada correctamente',
      });

      await fetchRecipes();
      return { success: true, data: newRecipeData };
    } catch (error: any) {
      console.error('Error duplicating recipe:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo duplicar la receta',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const getRecipeById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          product:products(id, name),
          category_variant:category_variants(id, name),
          yield_uom:units_of_measure(*),
          ingredients:recipe_ingredients(
            *,
            raw_material:raw_materials(*),
            uom:units_of_measure(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching recipe:', error);
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  return {
    recipes,
    loading,
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    addIngredient,
    updateIngredient,
    removeIngredient,
    duplicateRecipe,
    getRecipeById,
  };
};
