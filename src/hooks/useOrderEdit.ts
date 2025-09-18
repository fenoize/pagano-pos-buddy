import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, OrderItem } from '@/types';

export interface OrderEditData {
  items: OrderItem[];
  delivery_fee: number;
  payment_method: 'efectivo' | 'mp' | 'pos' | 'mixto';
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  subtotal: number;
  discount: number;
  total: number;
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
      // Check for concurrent changes
      const { data: currentOrder, error: checkError } = await supabase
        .from('orders')
        .select('updated_at')
        .eq('id', orderId)
        .single();

      if (checkError) {
        throw new Error('Error verificando el pedido');
      }

      // Update order
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          items: editData.items as any,
          subtotal: editData.subtotal,
          discount: editData.discount,
          delivery_fee: editData.delivery_fee,
          total: editData.total,
          payment_method: editData.payment_method,
          payment_efectivo: editData.payment_efectivo,
          payment_mp: editData.payment_mp,
          payment_pos: editData.payment_pos,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        throw new Error('Error actualizando el pedido');
      }

      // Create audit log
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