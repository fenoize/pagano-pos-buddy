import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays } from 'date-fns';

export interface FinanceOpex {
  variableExpenses: number; // Egresos del período (finance_expenses)
  fixedExpensesProrated: number; // Gastos fijos prorrateados al rango
  deliveryPayments: number; // Pagos a repartidores en el rango
  total: number;
}

const DAYS_IN_MONTH = 30.4375;
const DAYS_IN_WEEK = 7;
const DAYS_IN_YEAR = 365.25;

export function useFinanceOpex(startDate: Date, endDate: Date) {
  const [opex, setOpex] = useState<FinanceOpex>({
    variableExpenses: 0,
    fixedExpensesProrated: 0,
    deliveryPayments: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        const days = differenceInCalendarDays(endDate, startDate) + 1;

        const [expensesRes, fixedRes, deliveryRes] = await Promise.all([
          supabase
            .from('finance_expenses')
            .select('amount')
            .gte('expense_date', start)
            .lte('expense_date', end),
          supabase
            .from('finance_fixed_expenses' as any)
            .select('amount, frequency, is_active')
            .eq('is_active', true),
          supabase
            .from('delivery_payments')
            .select('gross_amount, payment_date')
            .gte('payment_date', start)
            .lte('payment_date', end + 'T23:59:59'),
        ]);

        const variableExpenses = (expensesRes.data || []).reduce(
          (sum, e: any) => sum + Number(e.amount || 0),
          0
        );

        const fixedExpensesProrated = (fixedRes.data || []).reduce(
          (sum, fx: any) => {
            const amt = Number(fx.amount || 0);
            let dailyRate = 0;
            switch (fx.frequency) {
              case 'monthly':
                dailyRate = amt / DAYS_IN_MONTH;
                break;
              case 'weekly':
                dailyRate = amt / DAYS_IN_WEEK;
                break;
              case 'yearly':
                dailyRate = amt / DAYS_IN_YEAR;
                break;
              default:
                dailyRate = amt / DAYS_IN_MONTH;
            }
            return sum + dailyRate * days;
          },
          0
        );

        const deliveryPayments = (deliveryRes.data || []).reduce(
          (sum, d: any) => sum + Number(d.gross_amount || 0),
          0
        );

        const total = variableExpenses + fixedExpensesProrated + deliveryPayments;

        setOpex({
          variableExpenses,
          fixedExpensesProrated,
          deliveryPayments,
          total,
        });
      } catch (error) {
        console.error('Error fetching opex:', error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [startDate, endDate]);

  return { opex, loading };
}
