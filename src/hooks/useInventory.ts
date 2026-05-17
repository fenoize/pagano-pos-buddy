import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
interface InventoryDeductionResult {
  success: boolean;
  processed: number;
  errors: string[];
}

export const useInventory = () => {
  const [isLoading, setIsLoading] = useState(false);
  /**
   * Descuenta automáticamente el inventario según las recetas de los productos vendidos
   * @param orderId - ID de la orden
   * @param warehouseId - ID del almacén (opcional, usa el predeterminado si no se especifica)
   */
  const deductInventoryFromOrder = async (
    orderId: string,
    warehouseId?: string
  ): Promise<InventoryDeductionResult> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('deduct_inventory_from_order', {
        p_order_id: orderId,
        p_warehouse_id: warehouseId || null,
      });

      if (error) {
        console.error('Error en deduct_inventory_from_order:', error);
        return {
          success: false,
          processed: 0,
          errors: [error.message],
        };
      }

      const result = data as { success: boolean; processed: number; errors: string[]; error?: string };

      if (!result.success && result.error) {
        return {
          success: false,
          processed: result.processed || 0,
          errors: [result.error],
        };
      }

      return {
        success: result.success,
        processed: result.processed,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error('Error calling deduct_inventory_from_order:', error);
      return {
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Procesar recepción de compra
   */
  const processReceipt = async (
    purchaseId: string,
    rawMaterialId: string,
    warehouseId: string,
    quantity: number,
    uomId: string,
    unitCost: number,
    lotNumber?: string,
    expiryDate?: string
  ): Promise<{ success: boolean; movementId?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_purchase_receipt', {
        p_purchase_id: purchaseId,
        p_raw_material_id: rawMaterialId,
        p_warehouse_id: warehouseId,
        p_quantity: quantity,
        p_uom_id: uomId,
        p_unit_cost: unitCost,
        p_lot_number: lotNumber || null,
        p_expiry_date: expiryDate || null,
      });

      if (error) {
        toast({
          title: 'Error',
          description: `Error al procesar recepción: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      }

      return { success: true, movementId: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error', { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Ajuste manual de inventario
   */
  const processAdjustment = async (
    rawMaterialId: string,
    warehouseId: string,
    lotId: string | null,
    adjustmentQty: number,
    reason: string,
    userId: string
  ): Promise<{ success: boolean; movementId?: string; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_stock_adjustment', {
        p_raw_material_id: rawMaterialId,
        p_warehouse_id: warehouseId,
        p_lot_id: lotId,
        p_adjustment_qty: adjustmentQty,
        p_reason: reason,
        p_adjusted_by_user_id: userId,
      });

      if (error) {
        toast({
          title: 'Error',
          description: `Error al procesar ajuste: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      }

      toast.success('Ajuste registrado', { description: 'El ajuste de inventario se ha registrado correctamente' });

      return { success: true, movementId: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error', { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Transferencia entre almacenes
   */
  const processTransfer = async (
    rawMaterialId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    lotId: string | null,
    quantity: number,
    uomId: string,
    notes: string,
    userId: string
  ): Promise<{ success: boolean; movementIds?: string[]; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('process_stock_transfer', {
        p_raw_material_id: rawMaterialId,
        p_from_warehouse_id: fromWarehouseId,
        p_to_warehouse_id: toWarehouseId,
        p_lot_id: lotId,
        p_quantity: quantity,
        p_uom_id: uomId,
        p_notes: notes,
        p_transferred_by_user_id: userId,
      });

      if (error) {
        toast({
          title: 'Error',
          description: `Error al procesar transferencia: ${error.message}`,
          variant: 'destructive',
        });
        return { success: false, error: error.message };
      }

      toast.success('Transferencia completada', { description: 'La transferencia se ha realizado correctamente' });

      return { success: true, movementIds: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error', { description: message });
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    deductInventoryFromOrder,
    processReceipt,
    processAdjustment,
    processTransfer,
  };
};
