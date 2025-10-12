import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useInventory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Descuenta automáticamente el inventario según las recetas de los productos vendidos
   * @param orderId - ID de la orden
   * @param warehouseId - ID del almacén (opcional, usa el predeterminado si no se especifica)
   */
  const deductInventoryFromOrder = async (
    orderId: string,
    warehouseId?: string
  ): Promise<{ success: boolean; errors: string[] }> => {
    setIsLoading(true);
    const errors: string[] = [];

    try {
      // Obtener almacén predeterminado si no se especifica
      let targetWarehouseId = warehouseId;
      if (!targetWarehouseId) {
        const whResult: any = await supabase
          .from('warehouses')
          .select('id')
          .eq('is_default', true)
          .eq('is_active', true)
          .single();

        if (!whResult.data) {
          errors.push('No se encontró almacén predeterminado');
          return { success: false, errors };
        }
        targetWarehouseId = whResult.data.id;
      }

      // Obtener los items de la orden
      const orderResult: any = await supabase
        .from('orders')
        .select('id, items')
        .eq('id', orderId)
        .single();

      if (orderResult.error || !orderResult.data) {
        errors.push('No se pudo obtener la orden');
        return { success: false, errors };
      }

      const items = orderResult.data.items as any[];

      // Procesar cada item de la orden
      for (const item of items) {
        // Buscar receta para el producto
        const recipesResult: any = await supabase
          .from('recipes')
          .select('id')
          .eq('product_id', item.productId)
          .eq('is_active', true);

        if (recipesResult.error || !recipesResult.data || recipesResult.data.length === 0) {
          console.log(`Producto ${item.productName} no tiene receta configurada, omitiendo descuento de inventario`);
          continue;
        }

        // Seleccionar la primera receta disponible
        const selectedRecipe = recipesResult.data[0];

        // Llamar a la función SQL para descontar inventario
        const { error: deductError } = await supabase.rpc('deduct_from_recipe', {
          p_order_id: orderId,
          p_recipe_id: selectedRecipe.id,
          p_quantity: item.quantity,
          p_warehouse_id: targetWarehouseId,
        });

        if (deductError) {
          console.error(`Error descontando inventario para ${item.productName}:`, deductError);
          errors.push(`Error al descontar inventario de ${item.productName}: ${deductError.message}`);
        } else {
          console.log(`✓ Inventario descontado para ${item.productName} x${item.quantity}`);
        }
      }

      return {
        success: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.error('Error en deductInventoryFromOrder:', error);
      errors.push(error instanceof Error ? error.message : 'Error desconocido');
      return { success: false, errors };
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
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
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

      toast({
        title: 'Ajuste registrado',
        description: 'El ajuste de inventario se ha registrado correctamente',
      });

      return { success: true, movementId: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
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

      toast({
        title: 'Transferencia completada',
        description: 'La transferencia se ha realizado correctamente',
      });

      return { success: true, movementIds: data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
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
