import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, OrderItem, PaymentMethod } from '@/types';

export interface OrderEditData {
  items: OrderItem[];
  delivery_fee: number;
  fulfillment?: 'retiro' | 'delivery';
  payment_method: PaymentMethod;
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  payment_aplicacion: number;
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
  const [isLoading, setIsLoading] = useState(false);

  const calculateTotals = useCallback((items: OrderItem[], deliveryFee: number, discount: number) => {
    const subtotal = items.reduce((sum, item) => {
      const itemPrice = item.basePrice + (item.extras?.reduce((extSum, ext) => extSum + ext.price, 0) || 0);
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    const finalDiscount = Math.min(discount, subtotal);
    const total = Math.max(0, subtotal - finalDiscount + deliveryFee);
    
    return { subtotal, discount: finalDiscount, total };
  }, []);

  const updateOrder = useCallback(async (
    orderId: string, 
    editData: OrderEditData, 
    reason?: string
  ) => {
    setIsLoading(true);
    try {
      // Check for concurrent changes and get current order data
      const { data: currentOrder, error: checkError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (checkError) {
        throw new Error('Error verificando el pedido');
      }

      // Prepare delivery audit if any delivery field changed
      const deliveryChanges: Array<{ field: string; oldValue: string; newValue: string }> = [];
      
      if (editData.delivery_address !== undefined && editData.delivery_address !== currentOrder.delivery_address) {
        deliveryChanges.push({
          field: 'delivery_address',
          oldValue: currentOrder.delivery_address || '',
          newValue: editData.delivery_address
        });
      }
      
      if (editData.delivery_number !== undefined && editData.delivery_number !== currentOrder.delivery_number) {
        deliveryChanges.push({
          field: 'delivery_number',
          oldValue: currentOrder.delivery_number || '',
          newValue: editData.delivery_number
        });
      }
      
      if (editData.delivery_comuna_id !== undefined && editData.delivery_comuna_id !== (currentOrder as any).delivery_comuna_id) {
        deliveryChanges.push({
          field: 'delivery_comuna_id',
          oldValue: (currentOrder as any).delivery_comuna_id || '',
          newValue: editData.delivery_comuna_id
        });
      }
      
      if (editData.delivery_reference !== undefined && editData.delivery_reference !== (currentOrder as any).delivery_reference) {
        deliveryChanges.push({
          field: 'delivery_reference',
          oldValue: (currentOrder as any).delivery_reference || '',
          newValue: editData.delivery_reference
        });
      }
      
      if (editData.delivery_person_id !== undefined && editData.delivery_person_id !== (currentOrder as any).delivery_person_id) {
        deliveryChanges.push({
          field: 'delivery_person_id',
          oldValue: (currentOrder as any).delivery_person_id || '',
          newValue: editData.delivery_person_id || ''
        });
      }

      // Get comuna name and delivery person name for snapshot
      let comunaName = currentOrder.delivery_comuna;
      let deliveryPersonName = (currentOrder as any).delivery_person_name;
      
      if (editData.delivery_comuna_id && editData.delivery_comuna_id !== (currentOrder as any).delivery_comuna_id) {
        const { data: comuna } = await (supabase as any)
          .from('comunas')
          .select('name')
          .eq('id', editData.delivery_comuna_id)
          .single();
        if (comuna) comunaName = comuna.name;
      }
      
      if (editData.delivery_person_id && editData.delivery_person_id !== (currentOrder as any).delivery_person_id) {
        const { data: user } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('id', editData.delivery_person_id)
          .single();
        if (user) deliveryPersonName = user.full_name || user.username;
      } else if (editData.delivery_person_id === null) {
        deliveryPersonName = null;
      }

      // Update order - Convert empty strings to null for UUID/nullable fields
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          items: editData.items as any,
          subtotal: editData.subtotal,
          discount: editData.discount,
          delivery_fee: editData.delivery_fee,
          fulfillment: editData.fulfillment || currentOrder.fulfillment,
          total: editData.total,
          payment_method: editData.payment_method,
          payment_efectivo: editData.payment_efectivo,
          payment_mp: editData.payment_mp,
          payment_pos: editData.payment_pos,
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
        .single();

      if (updateError) {
        throw new Error('Error actualizando el pedido');
      }

      // Create general audit log if reason provided
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

      // Create delivery audit logs for each changed field
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