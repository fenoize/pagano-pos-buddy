import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, OrderItem, PaymentMethod } from '@/types';
import { useCustomerRunes } from '@/hooks/useCustomerRunes';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCashSession } from '@/hooks/useCashSession';
import { setStaffContext } from '@/lib/dbContext';

export interface OrderEditData {
  items: OrderItem[];
  delivery_fee: number;
  fulfillment?: 'retiro' | 'delivery';
  payment_method: PaymentMethod;
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  payment_aplicacion: number;
  payment_runas: number;
  subtotal: number;
  discount: number;
  total: number;
  delivery_address?: string;
  delivery_number?: string;
  delivery_comuna_id?: string;
  delivery_reference?: string;
  delivery_person_id?: string | null;
}

export interface OrderEditAction {
  type: 'add' | 'update' | 'remove' | 'replace';
  line_id?: string;
  product_id?: string;
  item?: OrderItem;
  quantity?: number;
  unit_price?: number;
}

export function useOrderEdit() {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const { createEditAdjustmentTransaction, getCustomerRunasBalance, fetchRunaValue } = useCustomerRunes();
  const { getSessionSummary, logSessionAudit } = useCashSession();

  const calculateTotals = useCallback((items: OrderItem[], deliveryFee: number, discount: number) => {
    // Validar entradas
    if (!Array.isArray(items)) {
      console.error('[calculateTotals] Items is not an array:', items);
      return { subtotal: 0, discount: 0, total: 0 };
    }
    
    const subtotal = items.reduce((sum, item) => {
      const basePrice = Number(item.basePrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const extrasPrice = item.extras?.reduce((extSum, ext) => extSum + (Number(ext.price) || 0), 0) || 0;
      const itemPrice = basePrice + extrasPrice;
      return sum + (itemPrice * quantity);
    }, 0);
    
    const finalDiscount = Math.min(Number(discount) || 0, subtotal);
    const total = Math.max(0, subtotal - finalDiscount + (Number(deliveryFee) || 0));
    
    console.log('[calculateTotals]', { 
      items_count: items.length, 
      subtotal, 
      discount: finalDiscount, 
      deliveryFee, 
      total 
    });
    
    return { subtotal, discount: finalDiscount, total };
  }, []);

  const updateOrder = useCallback(async (
    orderId: string, 
    editData: OrderEditData, 
    reason?: string
  ) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsLoading(true);
    try {
      // 1. Check for concurrent changes and get current order with cash_session info
      const { data: currentOrder, error: checkError } = await supabase
        .from('orders')
        .select(`
          *,
          cash_sessions (
            id,
            closed_at,
            opened_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (checkError) {
        throw new Error('Error verificando el pedido');
      }

      // 2. Check if order belongs to a closed session
      const orderData = currentOrder as any;
      const isClosed = orderData.cash_sessions?.closed_at != null;
      const cashSessionId = orderData.cash_session_id;
      
      // 3. If closed, get session summary BEFORE changes
      let oldSessionTotals = null;
      if (isClosed && cashSessionId) {
        const summaryBefore = await getSessionSummary(cashSessionId);
        oldSessionTotals = summaryBefore?.summary;
      }

      // 4. Prepare delivery audit if any delivery field changed
      const deliveryChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];
      
      if (editData.delivery_address !== undefined && editData.delivery_address !== orderData.delivery_address) {
        deliveryChanges.push({
          field: 'delivery_address',
          oldValue: orderData.delivery_address || '',
          newValue: editData.delivery_address
        });
      }
      
      if (editData.delivery_number !== undefined && editData.delivery_number !== orderData.delivery_number) {
        deliveryChanges.push({
          field: 'delivery_number',
          oldValue: orderData.delivery_number || '',
          newValue: editData.delivery_number
        });
      }
      
      if (editData.delivery_comuna_id !== undefined && editData.delivery_comuna_id !== orderData.delivery_comuna_id) {
        deliveryChanges.push({
          field: 'delivery_comuna_id',
          oldValue: orderData.delivery_comuna_id || '',
          newValue: editData.delivery_comuna_id
        });
      }
      
      if (editData.delivery_reference !== undefined && editData.delivery_reference !== orderData.delivery_reference) {
        deliveryChanges.push({
          field: 'delivery_reference',
          oldValue: orderData.delivery_reference || '',
          newValue: editData.delivery_reference
        });
      }
      
      if (editData.delivery_person_id !== undefined && editData.delivery_person_id !== orderData.delivery_person_id) {
        deliveryChanges.push({
          field: 'delivery_person_id',
          oldValue: orderData.delivery_person_id || '',
          newValue: editData.delivery_person_id || ''
        });
      }

      // 5. Get comuna name and delivery person name for snapshot
      let comunaName = orderData.delivery_comuna;
      let deliveryPersonName = orderData.delivery_person_name;
      
      if (editData.delivery_comuna_id && editData.delivery_comuna_id !== orderData.delivery_comuna_id) {
        const { data: comuna } = await (supabase as any)
          .from('comunas')
          .select('name')
          .eq('id', editData.delivery_comuna_id)
          .single();
        if (comuna) comunaName = comuna.name;
      }
      
      if (editData.delivery_person_id && editData.delivery_person_id !== orderData.delivery_person_id) {
        const { data: user } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('id', editData.delivery_person_id)
          .single();
        if (user) deliveryPersonName = user.full_name || user.username;
      } else if (editData.delivery_person_id === null) {
        deliveryPersonName = null;
      }

      // 6. Gestión de Runas: calcular delta y crear transacciones
      const oldRunas = orderData.payment_runas || 0;
      const newRunas = editData.payment_runas || 0;
      const deltaRunas = newRunas - oldRunas;

      let runasWarning = '';

      if (deltaRunas !== 0 && orderData.customer_id) {
        const currentBalance = await getCustomerRunasBalance(orderData.customer_id);
        const newBalance = currentBalance - deltaRunas;

        // Permitir con advertencia si queda negativo
        if (newBalance < 0) {
          runasWarning = ` ⚠️ ADVERTENCIA: El cliente quedará con saldo negativo (${newBalance} runas)`;
        }

        // Crear transacción de ajuste
        const adjustmentReason = (reason || 'Edición de pedido') + runasWarning;
        const runaTransaction = await createEditAdjustmentTransaction(
          orderData.customer_id,
          -deltaRunas, // Negativo porque es un canje
          orderId,
          adjustmentReason
        );

        if (!runaTransaction) {
          throw new Error('Error al crear la transacción de runas. Verifica el saldo del cliente.');
        }
      }

      // 7. Set staff context before update (required for RLS)
      console.log('[updateOrder] Updating order:', {
        orderId,
        userId: user.id,
        hasStaffContext: true,
        delivery_person_id: editData.delivery_person_id
      });
      
      await setStaffContext(user.id);

      // 8. Update order - Convert empty strings to null for UUID/nullable fields
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          items: editData.items as any,
          subtotal: editData.subtotal,
          discount: editData.discount,
          delivery_fee: editData.delivery_fee,
          fulfillment: editData.fulfillment || orderData.fulfillment,
          total: editData.total,
          payment_method: editData.payment_method as any,
          payment_efectivo: editData.payment_efectivo,
          payment_mp: editData.payment_mp,
          payment_pos: editData.payment_pos,
          payment_aplicacion: editData.payment_aplicacion,
          payment_runas: editData.payment_runas,
          delivery_address: editData.delivery_address || null,
          delivery_number: editData.delivery_number || null,
          delivery_comuna_id: editData.delivery_comuna_id || null,
          delivery_comuna: comunaName,
          delivery_reference: editData.delivery_reference || null,
          delivery_person_id: editData.delivery_person_id === '' ? null : editData.delivery_person_id,
          delivery_person_name: deliveryPersonName,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(`Error actualizando el pedido: ${updateError.message || JSON.stringify(updateError)}`);
      }

      // Validar que el update devolvió datos
      if (!updatedOrder) {
        console.error('[updateOrder] No se pudo recuperar la orden actualizada. Verificando...');
        // Intenta leer la orden directamente
        const { data: verifyOrder, error: verifyError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();
          
        if (verifyError || !verifyOrder) {
          throw new Error('No se pudo verificar la actualización del pedido. Verifica permisos RLS.');
        }
        
        console.log('[updateOrder] Orden verificada manualmente:', verifyOrder.id);
        toast({
          title: "Pedido actualizado",
          description: "Los cambios se han guardado (verificación manual realizada)",
        });
        
        // Continuar con el flujo usando la orden verificada
        // Re-asignar para que el resto del código funcione
        Object.assign(updatedOrder as any, verifyOrder);
      }

      // 9. If closed session, recalculate and audit
      if (isClosed && cashSessionId) {
        const summaryAfter = await getSessionSummary(cashSessionId);
        
        await logSessionAudit({
          sessionId: cashSessionId,
          orderId,
          changedByUserId: user.id,
          fieldName: 'order_edit',
          oldValue: JSON.stringify({
            total: orderData.total,
            payment_runas: orderData.payment_runas,
            payment_efectivo: orderData.payment_efectivo,
            payment_mp: orderData.payment_mp,
            payment_pos: orderData.payment_pos
          }),
          newValue: JSON.stringify({
            total: editData.total,
            payment_runas: editData.payment_runas,
            payment_efectivo: editData.payment_efectivo,
            payment_mp: editData.payment_mp,
            payment_pos: editData.payment_pos
          }),
          reason: reason || 'Edición de pedido',
          oldTotals: oldSessionTotals,
          newTotals: summaryAfter?.summary
        });
      }

      // 10. Create general audit log if reason provided
      if (reason) {
        await supabase
          .from('order_audits')
          .insert({
            order_id: orderId,
            field_name: 'order_edit',
            old_value: JSON.stringify({ reason: 'Edición completa del pedido' }),
            new_value: JSON.stringify(editData),
            reason
          });
      }

      // 11. Auditoría específica para cambios en runas
      if (deltaRunas !== 0) {
        await supabase
          .from('order_audits')
          .insert({
            order_id: orderId,
            field_name: 'payment_runas',
            old_value: oldRunas.toString(),
            new_value: newRunas.toString(),
            reason: (reason || 'Edición de runas') + (runasWarning ? runasWarning : '')
          });
      }

      // 12. Create delivery audit logs for each changed field
      if (deliveryChanges.length > 0) {
        const auditRecords = deliveryChanges.map(change => ({
          order_id: orderId,
          field_name: change.field,
          old_value: change.oldValue,
          new_value: change.newValue,
          reason: reason || 'Edición desde detalle de pedido',
          changed_at: new Date().toISOString()
        }));
        
        await (supabase as any)
          .from('order_delivery_audit')
          .insert(auditRecords);
      }

      toast({
        title: "Pedido actualizado",
        description: "Los cambios se han guardado correctamente",
      });

      return updatedOrder as any;
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error actualizando el pedido",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const getOrderHistory = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_audits')
        .select(`
          id,
          field_name,
          old_value,
          new_value,
          reason,
          created_at,
          user_id
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching order history:', error);
      toast({
        title: "Error",
        description: "Error cargando el historial de cambios",
        variant: "destructive",
      });
      return [];
    }
  }, [toast]);

  return {
    updateOrder,
    getOrderHistory,
    calculateTotals,
    isLoading
  };
}