import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinancialKPIs } from '@/types/finance';
import { toast } from 'sonner';

export function useFinanceKPIs(startDate: Date, endDate: Date) {
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('finance_get_kpis', {
        _start: startDate.toISOString().split('T')[0],
        _end: endDate.toISOString().split('T')[0],
        _tz: 'America/Santiago'
      });

      if (error) {
        console.error('Error fetching KPIs:', error);
        toast.error('Error cargando indicadores financieros');
        throw error;
      }
      setKpis(data as unknown as FinancialKPIs);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [startDate, endDate]);

  return { kpis, loading, refetch: fetchKPIs };
}
