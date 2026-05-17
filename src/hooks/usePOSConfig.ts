import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
interface POSConfig {
  gridColumns: number;
  showVariantStock: boolean;
}

export function usePOSConfig() {
  const [config, setConfig] = useState<POSConfig>({ gridColumns: 4, showVariantStock: false });
  const [loading, setLoading] = useState(true);
  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', ['pos_grid_columns', 'pos_show_variant_stock']);

      if (error) throw error;
      
      let gridColumns = 4;
      let showVariantStock = false;
      
      data?.forEach((row: any) => {
        if (row.key === 'pos_grid_columns') {
          gridColumns = typeof row.value === 'number' ? row.value : 4;
        }
        if (row.key === 'pos_show_variant_stock') {
          showVariantStock = row.value === true;
        }
      });
      
      setConfig({ gridColumns, showVariantStock });
    } catch (error) {
      console.error('Error fetching POS config:', error);
      setConfig({ gridColumns: 4, showVariantStock: false });
    } finally {
      setLoading(false);
    }
  };

  const updateGridColumns = async (columns: number) => {
    if (columns < 3 || columns > 6) {
      toast.error("Error", { description: "El número de columnas debe estar entre 3 y 6" });
      return;
    }

    try {
      const { error } = await supabase
        .from('config')
        .upsert({ 
          key: 'pos_grid_columns', 
          value: columns 
        });

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, gridColumns: columns }));
      toast.success("Éxito", { description: `Configuración actualizada: ${columns} columnas` });
    } catch (error: any) {
      console.error('Error updating POS config:', error);
      toast.error("Error", { description: error.message || "No se pudo actualizar la configuración" });
    }
  };

  const updateShowVariantStock = async (show: boolean) => {
    try {
      const { error } = await supabase
        .from('config')
        .upsert(
          { key: 'pos_show_variant_stock', value: show },
          { onConflict: 'key' }
        );

      if (error) throw error;
      
      setConfig(prev => ({ ...prev, showVariantStock: show }));
      toast.success("Éxito", { description: show ? "Stock de variantes visible" : "Stock de variantes oculto" });
    } catch (error: any) {
      console.error('Error updating POS config:', error);
      toast.error("Error", { description: error.message || "No se pudo actualizar la configuración" });
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return { config, loading, updateGridColumns, updateShowVariantStock };
}
