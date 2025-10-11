import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface POSConfig {
  gridColumns: number;
}

export function usePOSConfig() {
  const [config, setConfig] = useState<POSConfig>({ gridColumns: 4 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'pos_grid_columns')
        .single();

      if (error) throw error;
      
      if (data?.value) {
        const columns = typeof data.value === 'number' ? data.value : 4;
        setConfig({ gridColumns: columns });
      }
    } catch (error) {
      console.error('Error fetching POS config:', error);
      // Use default config on error
      setConfig({ gridColumns: 4 });
    } finally {
      setLoading(false);
    }
  };

  const updateGridColumns = async (columns: number) => {
    // Validate range 3-6
    if (columns < 3 || columns > 6) {
      toast({
        title: "Error",
        description: "El número de columnas debe estar entre 3 y 6",
        variant: "destructive"
      });
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
      
      setConfig({ gridColumns: columns });
      toast({
        title: "Éxito",
        description: `Configuración actualizada: ${columns} columnas`
      });
    } catch (error: any) {
      console.error('Error updating POS config:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la configuración",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return { config, loading, updateGridColumns };
}
