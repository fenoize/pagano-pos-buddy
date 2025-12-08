import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KardexEntry {
  id: string;
  move_type: 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'waste';
  raw_material_id: string;
  raw_material_name: string;
  raw_material_code: string | null;
  warehouse_id: string;
  warehouse_name: string;
  qty_in: number;
  qty_out: number;
  uom_abbreviation: string;
  unit_cost: number | null;
  notes: string | null;
  related_order_id: string | null;
  order_number: number | null;
  related_purchase_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  running_balance?: number;
}

export interface KardexFilters {
  rawMaterialId?: string;
  warehouseId?: string;
  moveType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useKardex(filters: KardexFilters = {}) {
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchKardex = useCallback(async (page: number = 0, pageSize: number = 50) => {
    setLoading(true);
    try {
      let query = supabase
        .from('stock_moves')
        .select(`
          id,
          move_type,
          raw_material_id,
          warehouse_id,
          qty_in,
          qty_out,
          uom_id,
          unit_cost,
          notes,
          related_order_id,
          related_purchase_id,
          created_by,
          created_at,
          raw_materials!inner(id, name, code),
          warehouses!inner(id, name),
          units_of_measure(abbreviation),
          orders(order_number),
          users:created_by(full_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      if (filters.rawMaterialId) {
        query = query.eq('raw_material_id', filters.rawMaterialId);
      }
      if (filters.warehouseId) {
        query = query.eq('warehouse_id', filters.warehouseId);
      }
      if (filters.moveType) {
        query = query.eq('move_type', filters.moveType as 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'waste');
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const mappedEntries: KardexEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        move_type: item.move_type,
        raw_material_id: item.raw_material_id,
        raw_material_name: item.raw_materials?.name || '',
        raw_material_code: item.raw_materials?.code || null,
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouses?.name || '',
        qty_in: Number(item.qty_in) || 0,
        qty_out: Number(item.qty_out) || 0,
        uom_abbreviation: item.units_of_measure?.abbreviation || '',
        unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
        notes: item.notes,
        related_order_id: item.related_order_id,
        order_number: item.orders?.order_number || null,
        related_purchase_id: item.related_purchase_id,
        created_by: item.created_by,
        created_by_name: item.users?.full_name || null,
        created_at: item.created_at,
      }));

      setEntries(mappedEntries);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching kardex:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.rawMaterialId, filters.warehouseId, filters.moveType, filters.dateFrom, filters.dateTo]);

  // Get summary stats for a material
  const getMaterialSummary = useCallback(async (rawMaterialId: string, warehouseId?: string) => {
    try {
      let query = supabase
        .from('stock_moves')
        .select('qty_in, qty_out, move_type')
        .eq('raw_material_id', rawMaterialId);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary = {
        totalIn: 0,
        totalOut: 0,
        receiptCount: 0,
        saleCount: 0,
        adjustmentCount: 0,
        transferCount: 0,
      };

      (data || []).forEach((move: any) => {
        summary.totalIn += Number(move.qty_in) || 0;
        summary.totalOut += Number(move.qty_out) || 0;
        
        switch (move.move_type) {
          case 'purchase':
            summary.receiptCount++;
            break;
          case 'sale':
          case 'waste':
            summary.saleCount++;
            break;
          case 'adjustment':
            summary.adjustmentCount++;
            break;
          case 'transfer_in':
          case 'transfer_out':
            summary.transferCount++;
            break;
        }
      });

      return summary;
    } catch (error) {
      console.error('Error fetching material summary:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchKardex();
  }, [fetchKardex]);

  return {
    entries,
    loading,
    totalCount,
    fetchKardex,
    getMaterialSummary,
  };
}
