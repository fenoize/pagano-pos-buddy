import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinancialClosure, ClosureDetailExpense } from '@/types/finance';
import { toast } from 'sonner';

interface FetchClosuresFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}

interface GenerateClosureParams {
  period_type: string;
  start_date: string;
  end_date: string;
  notes?: string;
  filters?: Record<string, any>;
}

export function useFinanceClosures() {
  const [closures, setClosures] = useState<FinancialClosure[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClosures = async (filters?: FetchClosuresFilters) => {
    setLoading(true);
    try {
      let query = supabase
        .from('financial_closures')
        .select('*')
        .order('date_start', { ascending: false })
        .limit(50);

      if (filters?.dateFrom) {
        query = query.gte('date_start', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date_end', filters.dateTo);
      }
      if (filters?.type) {
        query = query.eq('period_type', filters.type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching closures:', error);
        toast.error('Error cargando cierres financieros');
        throw error;
      }

      setClosures(data as unknown as FinancialClosure[]);
    } catch (error) {
      console.error('Error fetching closures:', error);
      setClosures([]);
    } finally {
      setLoading(false);
    }
  };

  const getClosureById = async (id: string): Promise<FinancialClosure | null> => {
    try {
      const { data, error } = await supabase
        .from('financial_closures')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching closure by ID:', error);
        toast.error('Error cargando detalle del cierre');
        throw error;
      }

      return data as unknown as FinancialClosure;
    } catch (error) {
      console.error('Error fetching closure by ID:', error);
      return null;
    }
  };

  const generateClosure = async (params: GenerateClosureParams): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuario no autenticado');
        return null;
      }

      // Obtener el user_id del staff
      const { data: staffUser, error: staffError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (staffError || !staffUser) {
        console.error('Error obteniendo staff user:', staffError);
        toast.error('Error: usuario no encontrado en el sistema');
        return null;
      }

      const { data, error } = await supabase.rpc('finance_generate_closure_v2', {
        _period_type: params.period_type,
        _start: params.start_date,
        _end: params.end_date,
        _notes: params.notes || null,
        _created_by: staffUser.id,
        _tz: 'America/Santiago',
        _filters: params.filters || {}
      });

      if (error) {
        console.error('Error generating closure:', error);
        toast.error('Error generando cierre financiero');
        throw error;
      }

      toast.success('Cierre financiero generado exitosamente');
      await fetchClosures();
      return data as string;
    } catch (error) {
      console.error('Error generating closure:', error);
      return null;
    }
  };

  const fetchTopExpenses = async (
    startDate: string,
    endDate: string
  ): Promise<ClosureDetailExpense[]> => {
    try {
      const { data, error } = await supabase
        .from('finance_expenses')
        .select('id, expense_date, category, amount, supplier, expense_type')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('amount', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching top expenses:', error);
        return [];
      }

      return data as ClosureDetailExpense[];
    } catch (error) {
      console.error('Error fetching top expenses:', error);
      return [];
    }
  };

  const fetchPreviousClosure = async (
    currentClosureId: string,
    currentStartDate: string
  ): Promise<FinancialClosure | null> => {
    try {
      const { data, error } = await supabase
        .from('financial_closures')
        .select('*')
        .lt('date_start', currentStartDate)
        .neq('id', currentClosureId)
        .order('date_start', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // No hay cierre anterior, es normal
        return null;
      }

      return data as unknown as FinancialClosure;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    fetchClosures();
  }, []);

  return {
    closures,
    loading,
    fetchClosures,
    getClosureById,
    generateClosure,
    fetchTopExpenses,
    fetchPreviousClosure,
    refetch: fetchClosures
  };
}
