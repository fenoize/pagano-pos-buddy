import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryRecipe } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState<InventoryRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          products(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes((data || []) as InventoryRecipe[]);
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

  useEffect(() => {
    fetchRecipes();
  }, []);

  return {
    recipes,
    loading,
    fetchRecipes,
  };
};
