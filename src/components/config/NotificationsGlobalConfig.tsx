import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Save, Loader2, Users, Truck } from 'lucide-react';
import { useOneSignalSettings } from '@/hooks/useOneSignalSettings';
import type { GlobalNotificationSettings } from '@/types/notifications';

export const NotificationsGlobalConfig: React.FC = () => {
  const { globalSettings, loading, saving, saveGlobalSettings } = useOneSignalSettings();
  const [localSettings, setLocalSettings] = React.useState<GlobalNotificationSettings>(globalSettings);
  const [hasChanges, setHasChanges] = React.useState(false);

  React.useEffect(() => {
    setLocalSettings(globalSettings);
  }, [globalSettings]);

  const handleToggle = (key: keyof GlobalNotificationSettings) => {
    const newSettings = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveGlobalSettings(localSettings);
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notificaciones Globales
        </CardTitle>
        <CardDescription>
          Configura qué notificaciones transaccionales se envían automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sección Clientes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="w-4 h-4" />
            Clientes
          </div>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_order_status">Cambios de estado del pedido</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando el pedido pasa a preparación, listo, en camino, etc.
                </p>
              </div>
              <Switch
                id="notify_order_status"
                checked={localSettings.notify_client_order_status}
                onCheckedChange={() => handleToggle('notify_client_order_status')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_delivery_assigned">Asignación de repartidor</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando se asigna un repartidor al pedido
                </p>
              </div>
              <Switch
                id="notify_delivery_assigned"
                checked={localSettings.notify_client_delivery_assigned}
                onCheckedChange={() => handleToggle('notify_client_delivery_assigned')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_runas_earned">Runas ganadas</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando el cliente gana Runas en una compra
                </p>
              </div>
              <Switch
                id="notify_runas_earned"
                checked={localSettings.notify_client_runas_earned}
                onCheckedChange={() => handleToggle('notify_client_runas_earned')}
              />
            </div>
          </div>
        </div>

        {/* Sección Repartidores */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Truck className="w-4 h-4" />
            Repartidores
          </div>
          
          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify_rider_new_order">Nuevos pedidos asignados</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar al repartidor cuando se le asigna un nuevo pedido
                </p>
              </div>
              <Switch
                id="notify_rider_new_order"
                checked={localSettings.notify_rider_new_order}
                onCheckedChange={() => handleToggle('notify_rider_new_order')}
              />
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
