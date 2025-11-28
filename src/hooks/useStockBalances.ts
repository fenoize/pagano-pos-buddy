import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface StockBalance {
  raw_material_id: string;
  raw_material_name: string;
  raw_material_code: string | null;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  uom_abbreviation: string;
  min_stock: number;
  is_low_stock: boolean;
}

export interface StockStats {
  totalMaterials: number;
  lowStockCount: number;
  movementsToday: number;
}

export function useStockBalances(warehouseId?: string) {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [stats, setStats] = useState<StockStats>({
    totalMaterials: 0,
    lowStockCount: 0,
    movementsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stock balances with material and warehouse info
      let query = supabase
        .from('stock_balances')
        .select(`
          quantity,
          raw_material_id,
          warehouse_id,
          raw_materials!inner(id, name, code, min_stock, is_active, base_uom_id, units_of_measure!raw_materials_base_uom_id_fkey(abbreviation)),
          warehouses!inner(id, name, is_active)
        `)
        .eq('raw_materials.is_active', true)
        .eq('warehouses.is_active', true);

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedBalances: StockBalance[] = (data || []).map((item: any) => ({
        raw_material_id: item.raw_material_id,
        raw_material_name: item.raw_materials?.name || '',
        raw_material_code: item.raw_materials?.code || null,
        warehouse_id: item.warehouse_id,
        warehouse_name: item.warehouses?.name || '',
        quantity: item.quantity || 0,
        uom_abbreviation: item.raw_materials?.units_of_measure?.abbreviation || '',
        min_stock: item.raw_materials?.min_stock || 0,
        is_low_stock: (item.quantity || 0) < (item.raw_materials?.min_stock || 0),
      }));

      setBalances(mappedBalances);
    } catch (error) {
      console.error('Error fetching stock balances:', error);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  const fetchStats = useCallback(async () => {
    try {
      // Total active materials
      const { count: materialsCount } = await supabase
        .from('raw_materials')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Low stock count
      const { data: lowStockData } = await supabase
        .from('stock_balances')
        .select(`
          quantity,
          raw_materials!inner(min_stock, is_active)
        `)
        .eq('raw_materials.is_active', true);

      const lowStockCount = (lowStockData || []).filter(
        (item: any) => (item.quantity || 0) < (item.raw_materials?.min_stock || 0)
      ).length;

      // Movements today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: movementsCount } = await supabase
        .from('stock_moves')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setStats({
        totalMaterials: materialsCount || 0,
        lowStockCount,
        movementsToday: movementsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stock stats:', error);
    }
  }, []);

  const getBalanceByMaterial = useCallback((materialId: string): number => {
    const balance = balances.find(b => b.raw_material_id === materialId);
    return balance?.quantity || 0;
  }, [balances]);

  useEffect(() => {
    fetchBalances();
    fetchStats();
  }, [fetchBalances, fetchStats]);

  return {
    balances,
    stats,
    loading,
    fetchBalances,
    fetchStats,
    getBalanceByMaterial,
  };
}
