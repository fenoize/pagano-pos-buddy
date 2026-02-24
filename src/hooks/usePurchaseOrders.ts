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
      const { data, error } = await supabase.rpc('get_purchase_orders');

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
      const { data, error } = await supabase.rpc('get_purchase_order_detail', {
        p_order_id: id,
      });

      if (error) throw error;
      return data as unknown as PurchaseOrder;
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
      const { error } = await supabase.rpc('receive_purchase_items', {
        p_order_id: orderId,
        p_receipts: itemReceipts.map(r => ({
          itemId: r.itemId,
          qtyReceived: r.qtyReceived,
        })),
        p_ingress_to_inventory: ingressToInventory,
      });

      if (error) throw error;

      toast({
        title: 'Recepción registrada',
        description: ingressToInventory 
          ? 'Items recibidos e ingresados al inventario' 
          : 'Items recibidos (pendiente ingreso a inventario)',
      });

      await fetchOrders();
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