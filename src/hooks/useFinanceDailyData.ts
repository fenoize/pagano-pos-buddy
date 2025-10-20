import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinanceDailyData } from '@/types/finance';
import { toast } from 'sonner';

export function useFinanceDailyData(startDate: Date, endDate: Date) {
  const [dailyData, setDailyData] = useState<FinanceDailyData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('finance_get_daily_data', {
        _start: startDate.toISOString().split('T')[0],
        _end: endDate.toISOString().split('T')[0],
        _tz: 'America/Santiago'
      });

      if (error) {
        console.error('Error fetching daily data:', error);
        toast.error('Error cargando datos diarios');
        throw error;
      }
      setDailyData((data as unknown as FinanceDailyData[]) || []);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [startDate, endDate]);

  return { dailyData, loading, refetch: fetchDailyData };
}
