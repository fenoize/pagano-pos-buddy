import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
export interface SupplierPayable {
  id: string;
  supplier_id: string;
  purchase_order_id?: string;
  amount_total: number;
  amount_paid: number;
  amount_pending: number;
  document_type?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  status: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
  notes?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  // Joined data
  supplier?: {
    name: string;
    rut?: string;
  };
  purchase_order?: {
    po_number: string;
  };
}

export type CreatePayableData = {
  supplier_id: string;
  purchase_order_id?: string;
  amount_total: number;
  document_type?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  notes?: string;
};

export function useSupplierPayables(supplierId?: string) {
  const [payables, setPayables] = useState<SupplierPayable[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPending, setTotalPending] = useState(0);

  const fetchPayables = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('supplier_payables')
        .select(`
          *,
          supplier:suppliers(name, rut),
          purchase_order:purchase_orders(po_number)
        `)
        .order('due_date', { ascending: true });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calcular monto pendiente y marcar vencidos
      const today = new Date().toISOString().split('T')[0];
      const processed = (data || []).map(p => ({
        ...p,
        amount_pending: p.amount_total - p.amount_paid,
        status: p.status === 'pagado' ? 'pagado' 
          : (p.due_date && p.due_date < today && p.amount_paid < p.amount_total) ? 'vencido'
          : p.amount_paid > 0 ? 'parcial'
          : 'pendiente'
      })) as SupplierPayable[];

      setPayables(processed);
      setTotalPending(processed.reduce((sum, p) => sum + (p.amount_total - p.amount_paid), 0));
    } catch (error) {
      console.error('Error fetching payables:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const createPayable = async (data: CreatePayableData) => {
    try {
      const { error } = await supabase
        .from('supplier_payables')
        .insert([{
          ...data,
          amount_paid: 0,
          status: 'pendiente'
        }]);

      if (error) throw error;

      toast.success('Cuenta por pagar creada', { description: 'Se ha registrado la deuda correctamente' });

      await fetchPayables();
      return true;
    } catch (error) {
      console.error('Error creating payable:', error);
      toast.error('Error', { description: 'No se pudo crear la cuenta por pagar' });
      return false;
    }
  };

  const registerPayment = async (id: string, amount: number, notes?: string) => {
    try {
      const payable = payables.find(p => p.id === id);
      if (!payable) throw new Error('Cuenta no encontrada');

      const newAmountPaid = payable.amount_paid + amount;
      const isPaidInFull = newAmountPaid >= payable.amount_total;

      const { error } = await supabase
        .from('supplier_payables')
        .update({
          amount_paid: newAmountPaid,
          status: isPaidInFull ? 'pagado' : 'parcial',
          paid_at: isPaidInFull ? new Date().toISOString() : null,
          notes: notes ? `${payable.notes || ''}\n${notes}`.trim() : payable.notes
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Pago registrado', { description: isPaidInFull 
          ? 'La cuenta ha sido saldada completamente'
          : `Se registró un pago de $${amount.toLocaleString('es-CL')}` });

      await fetchPayables();
      return true;
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Error', { description: 'No se pudo registrar el pago' });
      return false;
    }
  };

  const getOverduePayables = () => payables.filter(p => p.status === 'vencido');
  
  const getPendingPayables = () => payables.filter(p => p.status !== 'pagado');

  useEffect(() => {
    fetchPayables();
  }, [fetchPayables]);

  return {
    payables,
    loading,
    totalPending,
    createPayable,
    registerPayment,
    getOverduePayables,
    getPendingPayables,
    refetch: fetchPayables,
  };
}
