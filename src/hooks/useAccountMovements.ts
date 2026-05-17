import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
export type AccountMovementType = 'ingreso' | 'egreso' | 'transferencia';

export function useAccountMovements() {
  const [submitting, setSubmitting] = useState(false);

  const registerMovement = async (params: {
    accountId: string;
    type: AccountMovementType;
    amount: number;
    note?: string;
    category?: string;
    toAccountId?: string;
  }): Promise<boolean> => {
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('register_account_movement', {
        p_account_id: params.accountId,
        p_type: params.type,
        p_amount: params.amount,
        p_note: params.note || null,
        p_category: params.category || null,
        p_to_account_id: params.toAccountId || null,
      });

      if (error) throw error;

      toast.success('Movimiento registrado', { description: 'El saldo de la cuenta se actualizó correctamente' });
      return true;
    } catch (error: any) {
      console.error('Error registering account movement:', error);
      toast.error('Error', { description: error.message || 'No se pudo registrar el movimiento' });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { registerMovement, submitting };
}
