import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DeliveryPayment {
  id: string;
  order_id: string;
  delivery_person_id: string;
  base_amount: number;
  shift_bonus: number;
  gross_amount: number;
  has_invoice: boolean;
  company_pays_tax: boolean;
  tax_percentage: number;
  tax_amount: number;
  net_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  account_id?: string;
  paid_by?: string;
  payment_date?: string;
  notes?: string;
  expense_id?: string;
  tax_expense_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  order?: {
    id: string;
    order_number: string;
    delivery_fee: number;
    delivery_address?: string;
    created_at: string;
    delivery_delivered_at?: string;
  };
  delivery_person?: {
    id: string;
    full_name: string;
  };
  account?: {
    id: string;
    name: string;
  };
}

export interface ProcessPaymentData {
  payment_ids: string[];
  account_id: string;
  shift_bonus: number;
  has_invoice: boolean;
  company_pays_tax: boolean;
  notes?: string;
}

export function useDeliveryPayments() {
  const [payments, setPayments] = useState<DeliveryPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthContext();

  const isAdmin = user?.role === 'Administrador';
  const isDeliveryPerson = user?.role === 'Reparto';

  const fetchPayments = async (filters?: {
    status?: 'pending' | 'paid' | 'all';
    delivery_person_id?: string;
    date_start?: string;
    date_end?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('delivery_payments')
        .select(`
          *,
          order:orders!delivery_payments_order_id_fkey(
            id,
            order_number,
            delivery_fee,
            delivery_address,
            created_at,
            delivery_delivered_at
          ),
          delivery_person:users!delivery_payments_delivery_person_id_fkey(id, full_name),
          account:finance_accounts!delivery_payments_account_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.delivery_person_id) {
        query = query.eq('delivery_person_id', filters.delivery_person_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as unknown as DeliveryPayment[];

      // Filtrar por fecha usando la fecha efectiva de la orden (más confiable que created_at del pago)
      const filtered = rows.filter((p) => {
        const effectiveDateStr = p.order?.delivery_delivered_at ?? p.order?.created_at ?? p.created_at;
        const t = new Date(effectiveDateStr).getTime();

        if (filters?.date_start) {
          const start = new Date(filters.date_start).getTime();
          if (t < start) return false;
        }
        if (filters?.date_end) {
          const end = new Date(filters.date_end).getTime();
          if (t > end) return false;
        }
        return true;
      });

      // Ordenar por número de orden de forma correlativa (ascendente)
      filtered.sort((a, b) => {
        const orderNumA = parseInt(a.order?.order_number || '0', 10);
        const orderNumB = parseInt(b.order?.order_number || '0', 10);
        return orderNumA - orderNumB;
      });

      setPayments(filtered);
    } catch (error) {
      console.error('Error fetching delivery payments:', error);
      toast.error('Error cargando pagos de delivery');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPayments = async (status?: 'pending' | 'paid' | 'all') => {
    if (!user?.id) return;
    
    await fetchPayments({
      delivery_person_id: user.id,
      status
    });
  };

  const processPayments = async (data: ProcessPaymentData): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('No tienes permisos para procesar pagos');
      return false;
    }

    try {
      const TAX_PERCENTAGE = 13.5;
      
      // Get selected payments
      const selectedPayments = payments.filter(p => data.payment_ids.includes(p.id));
      const totalBaseAmount = selectedPayments.reduce((sum, p) => sum + p.base_amount, 0);
      const grossAmount = totalBaseAmount + data.shift_bonus;
      
      let taxAmount = 0;
      let netAmount = grossAmount;
      
      if (data.has_invoice && data.company_pays_tax) {
        taxAmount = Math.round(grossAmount * TAX_PERCENTAGE / 100);
        netAmount = grossAmount - taxAmount;
      }

      // Get delivery person info for expense description
      const deliveryPerson = selectedPayments[0]?.delivery_person;
      const deliveryPersonName = deliveryPerson?.full_name || 'Repartidor';

      // Create main expense
      const { data: mainExpense, error: expenseError } = await supabase
        .from('finance_expenses')
        .insert({
          expense_date: new Date().toISOString().split('T')[0],
          account_id: data.account_id,
          amount: data.company_pays_tax ? netAmount : grossAmount,
          currency: 'CLP',
          expense_type: 'Variable',
          category: 'Pago Delivery',
          supplier: deliveryPersonName,
          payment_method: 'Transferencia',
          notes: `Pago por ${selectedPayments.length} delivery(s)${data.shift_bonus > 0 ? ` + Turno $${data.shift_bonus.toLocaleString('es-CL')}` : ''}${data.notes ? ` - ${data.notes}` : ''}`
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      let taxExpenseId = null;

      // Create tax expense if company pays tax
      if (data.has_invoice && data.company_pays_tax && taxAmount > 0) {
        const { data: taxExpense, error: taxError } = await supabase
          .from('finance_expenses')
          .insert({
            expense_date: new Date().toISOString().split('T')[0],
            account_id: data.account_id,
            amount: taxAmount,
            currency: 'CLP',
            expense_type: 'Variable',
            category: 'Impuestos',
            supplier: deliveryPersonName,
            payment_method: 'Transferencia',
            notes: `Retención honorarios (${TAX_PERCENTAGE}%) - ${deliveryPersonName}`
          })
          .select()
          .single();

        if (taxError) throw taxError;
        taxExpenseId = taxExpense.id;
      }

      // Update all selected payments
      const shiftBonusPerPayment = Math.floor(data.shift_bonus / selectedPayments.length);
      
      for (const payment of selectedPayments) {
        const paymentGross = payment.base_amount + shiftBonusPerPayment;
        const paymentTax = data.has_invoice && data.company_pays_tax 
          ? Math.round(paymentGross * TAX_PERCENTAGE / 100) 
          : 0;
        const paymentNet = paymentGross - paymentTax;

        const { error: updateError } = await supabase
          .from('delivery_payments')
          .update({
            status: 'paid',
            shift_bonus: shiftBonusPerPayment,
            gross_amount: paymentGross,
            has_invoice: data.has_invoice,
            company_pays_tax: data.company_pays_tax,
            tax_percentage: TAX_PERCENTAGE,
            tax_amount: paymentTax,
            net_amount: paymentNet,
            account_id: data.account_id,
            paid_by: user.id,
            payment_date: new Date().toISOString(),
            notes: data.notes,
            expense_id: mainExpense.id,
            tax_expense_id: taxExpenseId
          })
          .eq('id', payment.id);

        if (updateError) throw updateError;
      }

      toast.success(`${selectedPayments.length} pagos procesados correctamente`);
      await fetchPayments();
      return true;
    } catch (error) {
      console.error('Error processing payments:', error);
      toast.error('Error procesando pagos');
      return false;
    }
  };

  const createPendingPayment = async (
    orderId: string,
    deliveryPersonId: string,
    baseAmount: number
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('delivery_payments')
        .insert({
          order_id: orderId,
          delivery_person_id: deliveryPersonId,
          base_amount: baseAmount,
          gross_amount: baseAmount,
          net_amount: baseAmount,
          status: 'pending'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating pending payment:', error);
      return false;
    }
  };

  const getPaymentStats = () => {
    const pending = payments.filter(p => p.status === 'pending');
    const paid = payments.filter(p => p.status === 'paid');

    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.base_amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, p) => sum + p.net_amount, 0),
      totalAmount: payments.reduce((sum, p) => sum + p.base_amount, 0)
    };
  };

  return {
    payments,
    loading,
    fetchPayments,
    fetchMyPayments,
    processPayments,
    createPendingPayment,
    getPaymentStats,
    isAdmin,
    isDeliveryPerson
  };
}
