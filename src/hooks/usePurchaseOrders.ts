import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type POStatus = 'draft' | 'approved' | 'sent' | 'partial' | 'received' | 'cancelled' | 'rejected';

export interface PurchaseOrderItem {
  id: string;
  purchase_id: string;
  raw_material_id: string;
  raw_material?: {
    id: string;
    name: string;
    code: string;
    base_uom_id: string;
    base_uom?: { id: string; name: string; abbreviation: string };
  };
  qty: number;
  qty_received: number;
  qty_pending: number;
  uom_id: string;
  uom?: { id: string; name: string; abbreviation: string };
  unit_cost: number;
  total_cost: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier?: { id: string; name: string; rut?: string; email?: string; phone?: string };
  warehouse_id: string;
  warehouse?: { id: string; name: string };
  status: POStatus;
  notes: string;
  subtotal: number;
  tax: number;
  total: number;
  expected_date: string | null;
  received_date: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sent_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderStatusHistory {
  id: string;
  purchase_id: string;
  old_status: POStatus | null;
  new_status: POStatus;
  changed_by: string;
  changed_by_user?: { id: string; username: string; full_name: string };
  notes: string;
  changed_at: string;
}

export interface CreatePurchaseOrderData {
  supplier_id: string;
  warehouse_id: string;
  notes?: string;
  expected_date?: string;
  items: {
    raw_material_id: string;
    qty: number;
    uom_id: string;
    unit_cost: number;
  }[];
}

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          warehouse:warehouses(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as unknown as PurchaseOrder[]);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las órdenes de compra',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getOrderById = async (id: string): Promise<PurchaseOrder | null> => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers(*),
          warehouse:warehouses(*)
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('purchase_items')
        .select(`
          *,
          raw_material:raw_materials(
            id, name, code, base_uom_id,
            base_uom:units_of_measure(*)
          ),
          uom:units_of_measure(*)
        `)
        .eq('purchase_id', id)
        .order('created_at');

      if (itemsError) throw itemsError;

      return {
        ...orderData,
        items: itemsData || [],
      } as unknown as PurchaseOrder;
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la orden de compra',
        variant: 'destructive',
      });
      return null;
    }
  };

  const getStatusHistory = async (purchaseId: string): Promise<PurchaseOrderStatusHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('purchase_order_status_history')
        .select(`
          *,
          changed_by_user:users(id, username, full_name)
        `)
        .eq('purchase_id', purchaseId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PurchaseOrderStatusHistory[];
    } catch (error) {
      console.error('Error fetching status history:', error);
      return [];
    }
  };

  const createOrder = async (data: CreatePurchaseOrderData): Promise<string | null> => {
    try {
      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + (item.qty * item.unit_cost), 0);
      const tax = Math.round(subtotal * 0.19);
      const total = subtotal + tax;

      // Create purchase order
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          supplier_id: data.supplier_id,
          warehouse_id: data.warehouse_id,
          notes: data.notes || '',
          expected_date: data.expected_date || null,
          subtotal,
          tax,
          total,
          status: 'draft',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create purchase items (total_cost is a generated column, don't insert it)
      const itemsToInsert = data.items.map(item => ({
        purchase_id: order.id,
        raw_material_id: item.raw_material_id,
        qty: item.qty,
        uom_id: item.uom_id,
        unit_cost: item.unit_cost,
        qty_received: 0,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Orden creada',
        description: `Orden ${order.po_number} creada correctamente`,
      });

      await fetchOrders();
      return order.id;
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la orden',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateOrderStatus = async (
    id: string,
    newStatus: POStatus,
    notes?: string
  ): Promise<boolean> => {
    try {
      const updates: Record<string, any> = { status: newStatus };

      if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
      } else if (newStatus === 'sent') {
        updates.sent_at = new Date().toISOString();
      } else if (newStatus === 'received') {
        updates.received_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      const statusLabels: Record<POStatus, string> = {
        draft: 'Borrador',
        approved: 'Aprobada',
        sent: 'Enviada',
        partial: 'Recepción Parcial',
        received: 'Recibida',
        cancelled: 'Cancelada',
        rejected: 'Rechazada',
      };

      toast({
        title: 'Estado actualizado',
        description: `Orden marcada como "${statusLabels[newStatus]}"`,
      });

      await fetchOrders();
      return true;
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
      return false;
    }
  };

  const receiveItems = async (
    orderId: string,
    itemReceipts: { itemId: string; qtyReceived: number }[],
    ingressToInventory: boolean
  ): Promise<boolean> => {
    try {
      // Get order details
      const order = await getOrderById(orderId);
      if (!order) throw new Error('Orden no encontrada');

      // Update each item's received quantity
      for (const receipt of itemReceipts) {
        const item = order.items?.find(i => i.id === receipt.itemId);
        if (!item) continue;

        const newQtyReceived = (item.qty_received || 0) + receipt.qtyReceived;

        const { error: updateError } = await supabase
          .from('purchase_items')
          .update({ qty_received: newQtyReceived })
          .eq('id', receipt.itemId);

        if (updateError) throw updateError;

        // If ingressing to inventory, create stock movement
        if (ingressToInventory && receipt.qtyReceived > 0) {
          const { error: stockError } = await supabase
            .from('stock_moves')
            .insert({
              move_type: 'purchase' as const,
              raw_material_id: item.raw_material_id,
              warehouse_id: order.warehouse_id,
              qty_in: receipt.qtyReceived,
              qty_out: 0,
              uom_id: item.uom_id,
              unit_cost: item.unit_cost,
              related_purchase_id: orderId,
              notes: `Recepción OC ${order.po_number}`,
            });

          if (stockError) throw stockError;

          // Update stock balance using upsert
          await supabase
            .from('stock_balances')
            .upsert({
              raw_material_id: item.raw_material_id,
              warehouse_id: order.warehouse_id,
              qty_on_hand: receipt.qtyReceived,
              last_cost: item.unit_cost,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'raw_material_id,warehouse_id',
            });
        }
      }

      // Check if order is fully received
      const updatedOrder = await getOrderById(orderId);
      const allItemsReceived = updatedOrder?.items?.every(
        item => (item.qty_received || 0) >= item.qty
      );
      const someItemsReceived = updatedOrder?.items?.some(
        item => (item.qty_received || 0) > 0
      );

      // Update order status based on reception
      if (allItemsReceived) {
        await updateOrderStatus(orderId, 'received');
      } else if (someItemsReceived) {
        await updateOrderStatus(orderId, 'partial');
      }

      toast({
        title: 'Recepción registrada',
        description: ingressToInventory 
          ? 'Items recibidos e ingresados al inventario' 
          : 'Items recibidos (pendiente ingreso a inventario)',
      });

      return true;
    } catch (error: any) {
      console.error('Error receiving items:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo registrar la recepción',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    try {
      // First delete items
      const { error: itemsError } = await supabase
        .from('purchase_items')
        .delete()
        .eq('purchase_id', id);

      if (itemsError) throw itemsError;

      // Then delete history
      await supabase
        .from('purchase_order_status_history')
        .delete()
        .eq('purchase_id', id);

      // Finally delete order
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (orderError) throw orderError;

      toast({
        title: 'Orden eliminada',
        description: 'La orden de compra ha sido eliminada',
      });

      await fetchOrders();
      return true;
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la orden',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    fetchOrders,
    getOrderById,
    getStatusHistory,
    createOrder,
    updateOrderStatus,
    receiveItems,
    deleteOrder,
  };
}