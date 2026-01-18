import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook para gestionar permisos de usuario de forma centralizada
 * Conecta con la tabla role_permissions en Supabase
 */
export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.id) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        // Obtener roles del usuario
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Obtener permisos de esos roles
        const roles = userRoles.map(r => r.role);
        const { data: rolePermissions, error: permsError } = await supabase
          .from('role_permissions')
          .select('permission')
          .in('role', roles);

        if (permsError) throw permsError;

        // Extraer permisos únicos
        const uniquePermissions = Array.from(
          new Set(rolePermissions?.map(rp => rp.permission) || [])
        );

        setPermissions(uniquePermissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id]);

  // Función para verificar un permiso específico
  const can = useMemo(() => {
    return (permission: string): boolean => {
      return permissions.includes(permission);
    };
  }, [permissions]);

  // Función para verificar si tiene alguno de varios permisos
  const canAny = useMemo(() => {
    return (permissionList: string[]): boolean => {
      return permissionList.some(p => permissions.includes(p));
    };
  }, [permissions]);

  // Función para verificar si tiene todos los permisos
  const canAll = useMemo(() => {
    return (permissionList: string[]): boolean => {
      return permissionList.every(p => permissions.includes(p));
    };
  }, [permissions]);

  // Permisos específicos pre-calculados (helpers comunes)
  const canManageCustomers = useMemo(() => can('customers.manage'), [can]);
  const canViewCustomers = useMemo(() => can('customers.view'), [can]);
  const canExportCustomers = useMemo(() => can('customers.export'), [can]);
  
  const canAdjustRunes = useMemo(() => can('runas.adjust'), [can]);
  const canViewRunes = useMemo(() => can('runas.view'), [can]);
  
  const canManageCashSessions = useMemo(() => can('cash_sessions.manage_all'), [can]);
  const canManageOwnCashSession = useMemo(() => can('cash_sessions.manage_own'), [can]);
  
  const canManageProducts = useMemo(() => can('products.manage'), [can]);
  const canViewProducts = useMemo(() => can('products.view'), [can]);
  
  const canManageCategories = useMemo(() => can('categories.manage'), [can]);
  
  const canCreateOrders = useMemo(() => can('orders.create'), [can]);
  const canEditOrders = useMemo(() => can('orders.edit'), [can]);
  const canDeleteOrders = useMemo(() => can('orders.delete'), [can]);
  const canViewAllOrders = useMemo(() => can('orders.view_all'), [can]);
  
  const canViewReports = useMemo(() => can('reports.view'), [can]);
  const canExportReports = useMemo(() => can('reports.export'), [can]);
  
  const canManageUsers = useMemo(() => can('users.manage'), [can]);
  const canManageConfig = useMemo(() => can('config.manage'), [can]);
  const canManageCoupons = useMemo(() => can('coupons.manage'), [can]);
  const canApplyCoupons = useMemo(() => can('coupons.apply'), [can]);
  
  // Permisos de Inventario
  const canManageInventory = useMemo(() => can('inventory.manage'), [can]);
  const canViewInventory = useMemo(() => can('inventory.view'), [can]);
  const canManageWarehouses = useMemo(() => can('warehouses.manage'), [can]);
  const canManageRawMaterials = useMemo(() => can('raw_materials.manage'), [can]);
  const canManageRecipes = useMemo(() => can('recipes.manage'), [can]);
  const canManagePurchases = useMemo(() => can('purchases.manage'), [can]);
  const canAdjustStock = useMemo(() => can('stock.adjust'), [can]);
  const canTransferStock = useMemo(() => can('stock.transfer'), [can]);
  const canViewKardex = useMemo(() => can('kardex.view'), [can]);

  // Permisos de Finanzas
  const canViewFinance = useMemo(() => can('finance.view'), [can]);
  const canManageClosures = useMemo(() => can('finance.manage_closures'), [can]);
  const canExportFinance = useMemo(() => can('finance.export'), [can]);

  // Permisos de RRHH
  const canViewHR = useMemo(() => can('hr.view'), [can]);
  const canManageShifts = useMemo(() => can('hr.manage_shifts'), [can]);
  const canApproveShifts = useMemo(() => can('hr.approve_shifts'), [can]);
  const canManagePayroll = useMemo(() => can('hr.manage_payroll'), [can]);
  const canExportPayroll = useMemo(() => can('hr.export_payroll'), [can]);
  const canManageHRConfig = useMemo(() => can('hr.manage_config'), [can]);

  return {
    // Estado
    permissions,
    loading,
    
    // Funciones de verificación
    can,
    canAny,
    canAll,
    
    // Helpers pre-calculados (más eficientes para uso frecuente)
    canManageCustomers,
    canViewCustomers,
    canExportCustomers,
    canAdjustRunes,
    canViewRunes,
    canManageCashSessions,
    canManageOwnCashSession,
    canManageProducts,
    canViewProducts,
    canManageCategories,
    canCreateOrders,
    canEditOrders,
    canDeleteOrders,
    canViewAllOrders,
    canViewReports,
    canExportReports,
    canManageUsers,
    canManageConfig,
    canManageCoupons,
    canApplyCoupons,
    
    // Inventario
    canManageInventory,
    canViewInventory,
    canManageWarehouses,
    canManageRawMaterials,
    canManageRecipes,
    canManagePurchases,
    canAdjustStock,
    canTransferStock,
    canViewKardex,
    
    // Finanzas
    canViewFinance,
    canManageClosures,
    canExportFinance,
    
    // RRHH
    canViewHR,
    canManageShifts,
    canApproveShifts,
    canManagePayroll,
    canExportPayroll,
    canManageHRConfig,
  };
}
