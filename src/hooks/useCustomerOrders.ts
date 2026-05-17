import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, FulfillmentType, PaymentMethod } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

export interface CustomerOrderFilters {
  status?: OrderStatus;
  fulfillment?: FulfillmentType;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export interface CustomerOrderStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate?: string;
}

export function useCustomerOrders() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const canViewOrders = user?.role === 'Administrador' || user?.role === 'Cajero' || user?.role === 'Reparto';

  // Obtener historial de pedidos de un cliente usando RPC para evitar problemas de RLS
  const getCustomerOrders = async (
    customerId: string,
    filters: CustomerOrderFilters = {},
    page = 0,
    limit = 20
  ): Promise<{ orders: Order[], totalCount: number }> => {
    // No verificamos canViewOrders aquí - el RPC es SECURITY DEFINER y maneja autorización internamente
    try {
      setLoading(true);

      const { data: rpcResult, error } = await supabase.rpc('get_customer_orders_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId,
        p_status: filters.status || null,
        p_fulfillment: filters.fulfillment || null,
        p_date_from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : null,
        p_date_to: filters.dateTo ? new Date(filters.dateTo).toISOString() : null,
        p_page: page,
        p_limit: limit
      });

      if (error) throw error;

      const result = rpcResult as unknown as { success: boolean; orders?: any[]; total_count?: number; error?: string } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      return {
        orders: (result.orders || []).map(order => ({
          ...order,
          items: order.items as any
        })) as Order[],
        totalCount: result.total_count || 0
      };
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      toast.error("Error", { description: "Error al cargar el historial de pedidos" });
      return { orders: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Obtener estadísticas de pedidos del cliente usando RPC
  const getCustomerOrderStats = async (customerId: string): Promise<CustomerOrderStats> => {
    // No verificamos canViewOrders aquí - el RPC es SECURITY DEFINER y maneja autorización internamente
    try {
      const { data: rpcResult, error } = await supabase.rpc('get_customer_order_stats_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId
      });

      if (error) throw error;

      const result = rpcResult as unknown as { 
        success: boolean; 
        total_orders?: number; 
        total_spent?: number; 
        average_order_value?: number; 
        last_order_date?: string; 
        error?: string 
      } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      return {
        totalOrders: result.total_orders || 0,
        totalSpent: result.total_spent || 0,
        averageOrderValue: result.average_order_value || 0,
        lastOrderDate: result.last_order_date || undefined
      };
    } catch (error) {
      console.error('Error fetching customer order stats:', error);
      return {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0
      };
    }
  };

  // Obtener un pedido específico con todos los detalles
  const getOrderById = async (orderId: string): Promise<Order | null> => {
    if (!canViewOrders) return null;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers (
            id,
            nombres,
            apellidos,
            name,
            apellido,
            phone,
            rut,
            email,
            created_at,
            updated_at,
            addresses (
              id,
              customer_id,
              alias,
              calle,
              numero,
              depto,
              comuna,
              ciudad,
              is_default,
              created_at,
              updated_at
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        ...data,
        items: data.items as any
      };
    } catch (error) {
      console.error('Error fetching order by id:', error);
      return null;
    }
  };

  // Duplicar un pedido para "Reordenar"
  const reorderCustomerOrder = async (orderId: string): Promise<Order | null> => {
    if (user?.role !== 'Administrador' && user?.role !== 'Cajero') {
      toast.error("Error", { description: "No tienes permisos para reordenar" });
      return null;
    }

    try {
      const originalOrder = await getOrderById(orderId);
      if (!originalOrder) {
        toast.error("Error", { description: "No se pudo encontrar el pedido original" });
        return null;
      }

      const insertData = {
        customer_id: originalOrder.customer_id,
        fulfillment: originalOrder.fulfillment,
        delivery_address: originalOrder.delivery_address,
        delivery_number: originalOrder.delivery_number,
        delivery_comuna: originalOrder.delivery_comuna,
        delivery_distance: originalOrder.delivery_distance,
        items: originalOrder.items as any,
        subtotal: originalOrder.subtotal,
        delivery_fee: originalOrder.delivery_fee || 0,
        discount: 0,
        total: originalOrder.subtotal + (originalOrder.delivery_fee || 0),
        payment_efectivo: 0,
        payment_mp: 0,
        payment_pos: 0,
        payment_method: 'efectivo' as PaymentMethod,
        status: 'Pendiente' as OrderStatus,
        notes: `Reorden basado en pedido #${originalOrder.order_number}`,
        created_by_user_id: user?.id
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;

      toast.success("Éxito", { description: `Pedido duplicado como #${data.order_number}` });

      return {
        ...data,
        items: data.items as any
      } as Order;
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error("Error", { description: "Error al duplicar el pedido" });
      return null;
    }
  };

  // Obtener pedidos recientes para sugerencias
  const getRecentCustomerOrders = async (customerId: string, limit = 5): Promise<Order[]> => {
    if (!canViewOrders) return [];

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          items,
          total,
          fulfillment,
          status,
          created_at,
          subtotal,
          delivery_fee,
          discount,
          payment_efectivo,
          payment_mp,
          payment_pos,
          payment_aplicacion,
          payment_runas,
          payment_method,
          delivery_address,
          delivery_number,
          delivery_comuna,
          delivery_distance,
          notes,
          customer_id,
          created_by_user_id,
          updated_at
        `)
        .eq('customer_id', customerId)
        .eq('status', 'Entregado')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data?.map(order => ({
        ...order,
        items: order.items as any
      })) || [];
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  };

  return {
    loading,
    canViewOrders,
    getCustomerOrders,
    getCustomerOrderStats,
    getOrderById,
    reorderCustomerOrder,
    getRecentCustomerOrders
  };
}