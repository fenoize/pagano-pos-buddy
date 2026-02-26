import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { withStaffContext } from '@/lib/dbContext';
import { getStaffUserId } from '@/lib/staffSession';
import type {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestStatus,
  CreatePurchaseRequestData,
  UpdatePurchaseRequestData,
} from '@/types/purchaseRequests';

const TAX_RATE = 0.19;

export const usePurchaseRequests = () => {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const staffUserId = getStaffUserId();
      const { data, error } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_requests')
          .select(`
            *,
            warehouse:warehouses(id, name),
            creator:users!purchase_requests_created_by_fkey(id, username, full_name),
            approver:users!purchase_requests_approved_by_fkey(id, username, full_name)
          `)
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setRequests((data || []) as unknown as PurchaseRequest[]);
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes de compra', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getRequestById = async (id: string): Promise<PurchaseRequest | null> => {
    try {
      const staffUserId = getStaffUserId();

      const { data: request, error: requestError } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_requests')
          .select(`
            *,
            warehouse:warehouses(id, name),
            creator:users!purchase_requests_created_by_fkey(id, username, full_name),
            approver:users!purchase_requests_approved_by_fkey(id, username, full_name),
            buyer:users!purchase_requests_buyer_id_fkey(id, username, full_name)
          `)
          .eq('id', id)
          .single()
      );

      if (requestError) throw requestError;

      const { data: items, error: itemsError } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_request_items')
          .select(`
            *,
            raw_material:raw_materials(id, name, code, last_cost, base_uom_id, base_uom:units_of_measure(id, name, abbreviation)),
            supplier:suppliers!purchase_request_items_supplier_id_fkey(id, name, phone, email),
            actual_supplier:suppliers!purchase_request_items_actual_supplier_id_fkey(id, name, phone, email),
            uom:units_of_measure(id, name, abbreviation)
          `)
          .eq('request_id', id)
          .order('created_at', { ascending: true })
      );

      if (itemsError) throw itemsError;

      return {
        ...(request as unknown as PurchaseRequest),
        items: (items || []) as unknown as PurchaseRequestItem[],
      };
    } catch (error) {
      console.error('Error fetching purchase request:', error);
      toast({ title: 'Error', description: 'No se pudo cargar la solicitud de compra', variant: 'destructive' });
      return null;
    }
  };

  const createRequest = async (data: CreatePurchaseRequestData): Promise<string | null> => {
    try {
      const subtotal = data.items.reduce((acc, item) => acc + (item.qty * (item.estimated_unit_cost || 0)), 0);
      const tax = subtotal * TAX_RATE;
      const total = subtotal + tax;

      let warehouseId = data.warehouse_id;
      if (!warehouseId) {
        const { data: defaultWarehouse } = await supabase
          .from('warehouses')
          .select('id')
          .eq('is_default', true)
          .single();
        warehouseId = defaultWarehouse?.id;
      }

      const { data: request, error: requestError } = await supabase
        .from('purchase_requests')
        .insert({
          pr_number: '',
          warehouse_id: warehouseId,
          notes: data.notes || null,
          subtotal,
          tax,
          total,
          status: (data.submit_for_approval ? 'pending_approval' : 'draft') as 'draft' | 'pending_approval',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      const itemsToInsert = data.items.map(item => ({
        request_id: request.id,
        raw_material_id: item.raw_material_id,
        supplier_id: item.supplier_id || null,
        qty: item.qty,
        uom_id: item.uom_id,
        estimated_unit_cost: item.estimated_unit_cost || 0,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_request_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Solicitud creada',
        description: data.submit_for_approval
          ? 'La solicitud ha sido enviada para aprobación'
          : 'La solicitud ha sido guardada como borrador',
      });

      await fetchRequests();
      return request.id;
    } catch (error) {
      console.error('Error creating purchase request:', error);
      toast({ title: 'Error', description: 'No se pudo crear la solicitud de compra', variant: 'destructive' });
      return null;
    }
  };

  const updateRequest = async (id: string, data: UpdatePurchaseRequestData): Promise<boolean> => {
    try {
      let updates: Record<string, unknown> = {
        notes: data.notes,
        warehouse_id: data.warehouse_id,
      };

      if (data.items) {
        const subtotal = data.items.reduce((acc, item) => acc + (item.qty * (item.estimated_unit_cost || 0)), 0);
        const tax = subtotal * TAX_RATE;
        const total = subtotal + tax;
        updates = { ...updates, subtotal, tax, total };

        await supabase.from('purchase_request_items').delete().eq('request_id', id);

        const itemsToInsert = data.items.map(item => ({
          request_id: id,
          raw_material_id: item.raw_material_id,
          supplier_id: item.supplier_id || null,
          qty: item.qty,
          uom_id: item.uom_id,
          estimated_unit_cost: item.estimated_unit_cost || 0,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_request_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      const { error } = await supabase
        .from('purchase_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Solicitud actualizada' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error updating purchase request:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const submitForApproval = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status: 'pending_approval' as PurchaseRequestStatus })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Solicitud enviada', description: 'La solicitud ha sido enviada para aprobación' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast({ title: 'Error', description: 'No se pudo enviar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const approveRequest = async (id: string, userId: string): Promise<boolean> => {
    try {
      // Just approve — don't auto-generate OCs anymore (logística resolves items first)
      const { error } = await supabase
        .from('purchase_requests')
        .update({
          status: 'approved' as PurchaseRequestStatus,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Solicitud aprobada', description: 'La solicitud está lista para gestión de logística' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: 'Error', description: 'No se pudo aprobar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const startProcessing = async (id: string): Promise<boolean> => {
    try {
      // Generate OCs from resolved items grouped by supplier
      await generateOrdersFromRequest(id);

      const staffUserId = getStaffUserId();
      const { error } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_requests')
          .update({ 
            status: 'en_proceso' as PurchaseRequestStatus,
            buyer_id: staffUserId || null,
            buyer_started_at: new Date().toISOString(),
          })
          .eq('id', id)
      );
      if (error) throw error;
      toast({ title: 'Gestión iniciada', description: 'Se generaron las Órdenes de Compra por proveedor' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error starting processing:', error);
      toast({ title: 'Error', description: 'No se pudo iniciar el proceso', variant: 'destructive' });
      return false;
    }
  };

  const generateOrdersFromRequest = async (requestId: string): Promise<string[]> => {
    // Fetch request with items
    const request = await getRequestById(requestId);
    if (!request?.items) return [];

    // Group items by actual_supplier_id where procurement_mode is supplier-based
    const supplierGroups: Record<string, PurchaseRequestItem[]> = {};
    for (const item of request.items) {
      if (
        item.procurement_mode &&
        ['proveedor_despacha', 'retiro_proveedor'].includes(item.procurement_mode) &&
        item.actual_supplier_id
      ) {
        if (!supplierGroups[item.actual_supplier_id]) {
          supplierGroups[item.actual_supplier_id] = [];
        }
        supplierGroups[item.actual_supplier_id].push(item);
      }
    }

    const orderIds: string[] = [];

    for (const [supplierId, items] of Object.entries(supplierGroups)) {
      const subtotal = items.reduce((sum, i) => sum + (i.actual_unit_cost * i.qty), 0);
      const tax = Math.round(subtotal * 0.19);
      const total = subtotal + tax;

      const staffUserId = getStaffUserId();
      const { data: order, error: orderError } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_orders')
          .insert({
            supplier_id: supplierId,
            warehouse_id: request.warehouse_id,
            notes: `Generada desde SC ${request.pr_number}`,
            subtotal,
            tax,
            total,
            status: 'draft',
            request_id: requestId,
          })
          .select()
          .single()
      );

      if (orderError) {
        console.error('Error creating PO:', orderError);
        continue;
      }

      const poItems = items.map(item => ({
        purchase_id: order.id,
        raw_material_id: item.raw_material_id,
        qty: item.qty,
        uom_id: item.uom_id,
        unit_cost: item.actual_unit_cost || 0,
        qty_received: 0,
      }));

      await withStaffContext(staffUserId, async () =>
        await supabase.from('purchase_items').insert(poItems)
      );
      orderIds.push(order.id);
    }

    return orderIds;
  };

  const completeRequest = async (id: string): Promise<boolean> => {
    try {
      const staffUserId = getStaffUserId();
      // Fetch items to update raw_materials with last cost/supplier
      const request = await getRequestById(id);
      if (request?.items) {
        for (const item of request.items) {
          if (item.resolved_at && item.actual_unit_cost > 0) {
            const updates: Record<string, unknown> = {
              last_cost: item.actual_unit_cost,
            };
            if (item.actual_supplier_id) {
              updates.last_supplier_id = item.actual_supplier_id;
            }
            if (item.procurement_mode) {
              updates.last_procurement_mode = item.procurement_mode;
            }
            await withStaffContext(staffUserId, async () =>
              await supabase
                .from('raw_materials')
                .update(updates)
                .eq('id', item.raw_material_id)
            );
          }
        }
      }

      const { error } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('purchase_requests')
          .update({ status: 'completada' as PurchaseRequestStatus })
          .eq('id', id)
      );
      if (error) throw error;
      toast({ title: 'Gestión finalizada', description: 'Los precios y proveedores han sido actualizados' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error completing request:', error);
      toast({ title: 'Error', description: 'No se pudo completar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const updateManagementNotes = async (id: string, notes: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ management_notes: notes })
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating management notes:', error);
      return false;
    }
  };

  const getLastPurchaseInfo = async (rawMaterialIds: string[]): Promise<Record<string, {
    last_supplier_id: string | null;
    last_supplier_name: string | null;
    last_cost: number | null;
    last_procurement_mode: string | null;
  }>> => {
    try {
      const staffUserId = getStaffUserId();
      const { data, error } = await withStaffContext(staffUserId, async () =>
        await supabase
          .from('raw_materials')
          .select('id, last_cost, last_supplier_id, last_procurement_mode, supplier:suppliers!raw_materials_last_supplier_id_fkey(id, name)')
          .in('id', rawMaterialIds)
      );

      if (error) throw error;

      const result: Record<string, any> = {};
      for (const rm of (data || [])) {
        result[rm.id] = {
          last_supplier_id: rm.last_supplier_id,
          last_supplier_name: (rm as any).supplier?.name || null,
          last_cost: rm.last_cost,
          last_procurement_mode: rm.last_procurement_mode,
        };
      }
      return result;
    } catch (error) {
      console.error('Error fetching last purchase info:', error);
      return {};
    }
  };

  const resolveItem = async (
    itemId: string,
    data: {
      procurement_mode: string;
      actual_supplier_id?: string | null;
      actual_unit_cost?: number;
      resolved_by: string;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_request_items')
        .update({
          procurement_mode: data.procurement_mode as 'proveedor_despacha' | 'retiro_proveedor' | 'compra_directa',
          actual_supplier_id: data.actual_supplier_id || null,
          actual_unit_cost: data.actual_unit_cost || 0,
          resolved_at: new Date().toISOString(),
          resolved_by: data.resolved_by,
        })
        .eq('id', itemId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resolving item:', error);
      toast({ title: 'Error', description: 'No se pudo resolver el item', variant: 'destructive' });
      return false;
    }
  };

  const rejectRequest = async (id: string, reason: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status: 'rejected' as PurchaseRequestStatus, rejection_reason: reason })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Solicitud rechazada' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({ title: 'Error', description: 'No se pudo rechazar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const cancelRequest = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status: 'cancelled' as PurchaseRequestStatus })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Solicitud cancelada' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({ title: 'Error', description: 'No se pudo cancelar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const deleteRequest = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('purchase_requests').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Solicitud eliminada' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar la solicitud', variant: 'destructive' });
      return false;
    }
  };

  const returnToDraft = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .update({ status: 'draft' as PurchaseRequestStatus, rejection_reason: null })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Solicitud devuelta a borrador' });
      await fetchRequests();
      return true;
    } catch (error) {
      console.error('Error returning to draft:', error);
      toast({ title: 'Error', description: 'No se pudo devolver la solicitud a borrador', variant: 'destructive' });
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    fetchRequests,
    getRequestById,
    createRequest,
    updateRequest,
    submitForApproval,
    approveRequest,
    startProcessing,
    completeRequest,
    resolveItem,
    rejectRequest,
    cancelRequest,
    deleteRequest,
    returnToDraft,
    updateManagementNotes,
    getLastPurchaseInfo,
  };
};
