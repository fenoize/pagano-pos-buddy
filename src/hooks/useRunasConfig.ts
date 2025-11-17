import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para obtener la configuración de Runas del sistema
 * 
 * IMPORTANTE: Hay dos valores distintos:
 * - runaAccumulationValue (runa_value): Monto mínimo de compra para acumular 1 runa (ej: $10,000)
 * - runaRedemptionValue (runa_reward_value): Valor de canje/redención de 1 runa (ej: $600)
 */
export function useRunasConfig() {
  const [runaAccumulationValue, setRunaAccumulationValue] = useState(10000); // Monto para GANAR 1 runa
  const [runaRedemptionValue, setRunaRedemptionValue] = useState(600); // Valor de CANJE de 1 runa
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRunasConfig();
  }, []);

  const fetchRunasConfig = async () => {
    try {
      // Obtener ambos valores de configuración
      const { data: accumulationData } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_value')
        .single();

      const { data: redemptionData } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'runa_reward_value')
        .single();

      if (accumulationData?.value) {
        setRunaAccumulationValue(Number(accumulationData.value));
      }
      
      if (redemptionData?.value) {
        setRunaRedemptionValue(Number(redemptionData.value));
      }
    } catch (error) {
      console.error('Error fetching runas config:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    runaAccumulationValue, // Usar para calcular cuántas runas se ganan por compra
    runaRedemptionValue,   // Usar para mostrar valor de runas y calcular descuentos
    loading,
    refresh: fetchRunasConfig
  };
}
