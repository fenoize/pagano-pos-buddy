import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Save, RefreshCw } from 'lucide-react';
import type { AppRole } from '@/types';

interface RolePermission {
  role: string;
  permission: string;
  description: string | null;
}

// Agrupar permisos por módulo
const PERMISSION_GROUPS = {
  'Clientes': ['customers.manage', 'customers.view', 'customers.create', 'customers.edit', 'customers.export'],
  'Runas': ['runas.adjust', 'runas.view'],
  'Caja': ['cash_sessions.manage_all', 'cash_sessions.view_all', 'cash_sessions.manage_own', 'cash_sessions.view_own'],
  'Productos': ['products.manage', 'products.view'],
  'Categorías': ['categories.manage'],
  'Órdenes': ['orders.create', 'orders.edit', 'orders.delete', 'orders.view_all', 'orders.view_kitchen', 'orders.update_status', 'orders.view_delivery', 'orders.update_delivery'],
  'Reportes': ['reports.view', 'reports.export'],
  'Usuarios': ['users.manage'],
  'Configuración': ['config.manage'],
  'Cupones': ['coupons.manage', 'coupons.apply'],
};

// Roles disponibles en la BD (mapear con AppRole si es necesario)
type DatabaseRole = 'Administrador' | 'Caja' | 'Cajero' | 'Cocina' | 'Preparador' | 'Reparto' | 'Viewer';

const ROLES: DatabaseRole[] = ['Administrador', 'Cajero', 'Cocina', 'Reparto', 'Viewer'];

export default function PermisosManagement() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changedPermissions, setChangedPermissions] = useState<Set<string>>(new Set());
  const { user } = useAuthContext();
  const { canManageConfig } = usePermissions();
  const { toast } = useToast();

  // Administradores siempre tienen acceso
  const hasAccess = user?.role === 'Administrador' || canManageConfig;

  useEffect(() => {
    if (hasAccess) {
      fetchPermissions();
    }
  }, [hasAccess]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('permission', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast({
        title: 'Error al cargar permisos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (role: string, permission: string): boolean => {
    return permissions.some(p => p.role === role && p.permission === permission);
  };

  const togglePermission = (role: string, permission: string) => {
    const key = `${role}:${permission}`;
    const newChanges = new Set(changedPermissions);
    
    if (newChanges.has(key)) {
      newChanges.delete(key);
    } else {
      newChanges.add(key);
    }
    
    setChangedPermissions(newChanges);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Procesar cada cambio
      for (const change of changedPermissions) {
        const [role, permission] = change.split(':');
        const exists = hasPermission(role, permission);

        if (exists) {
          // Eliminar permiso
          await supabase
            .from('role_permissions')
            .delete()
            .eq('role', role as DatabaseRole)
            .eq('permission', permission);
        } else {
          // Agregar permiso
          await supabase
            .from('role_permissions')
            .insert([{ 
              role: role as DatabaseRole, 
              permission 
            }]);
        }
      }

      toast({
        title: 'Permisos actualizados',
        description: 'Los cambios han sido guardados exitosamente.',
      });

      setChangedPermissions(new Set());
      await fetchPermissions();
    } catch (error: any) {
      toast({
        title: 'Error al guardar permisos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPermissionDescription = (permission: string): string => {
    const perm = permissions.find(p => p.permission === permission);
    return perm?.description || permission;
  };

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
            <CardDescription>
              No tienes permisos para gestionar los permisos del sistema.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Gestión de Permisos
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra los permisos de cada rol en el sistema
          </p>
        </div>
        {changedPermissions.size > 0 && (
          <Button onClick={saveChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios ({changedPermissions.size})
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {Object.entries(PERMISSION_GROUPS).map(([group, groupPermissions]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle>{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupPermissions.map((permission) => (
                  <div key={permission}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{permission}</p>
                        <p className="text-xs text-muted-foreground">
                          {getPermissionDescription(permission)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-4">
                      {ROLES.map((role) => {
                        const key = `${role}:${permission}`;
                        const currentHasPermission = hasPermission(role, permission);
                        const isChanged = changedPermissions.has(key);
                        const willHavePermission = isChanged ? !currentHasPermission : currentHasPermission;

                        return (
                          <label
                            key={role}
                            className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${
                              isChanged ? 'bg-amber-100 dark:bg-amber-900/20' : ''
                            }`}
                          >
                            <Checkbox
                              checked={willHavePermission}
                              onCheckedChange={() => togglePermission(role, permission)}
                            />
                            <span className="text-sm">{role}</span>
                            {isChanged && (
                              <Badge variant="outline" className="ml-1">
                                {willHavePermission ? '+' : '-'}
                              </Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {changedPermissions.size > 0 && (
        <div className="fixed bottom-6 right-6">
          <Button size="lg" onClick={saveChanges} disabled={saving}>
            <Save className="h-5 w-5 mr-2" />
            Guardar {changedPermissions.size} Cambios
          </Button>
        </div>
      )}
    </div>
  );
}
