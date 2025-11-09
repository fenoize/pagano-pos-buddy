import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnlineOrderSettings } from '@/hooks/useOnlineOrderSettings';
import { useAuthContext } from '@/contexts/AuthContext';
import { MPDiagnostics } from '@/components/config/MPDiagnostics';
import { Smartphone, CreditCard, ShoppingBag, Truck, Info, Save } from 'lucide-react';
import { toast } from 'sonner';

export function OnlineOrdersConfig() {
  const { settings, loading, updateSettings } = useOnlineOrderSettings();
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'Administrador';
  const [localSettings, setLocalSettings] = useState({
    app_orders_enabled: false,
    app_pickup_enabled: true,
    app_delivery_enabled: false,
    mp_enabled: false,
    mp_mode: 'sandbox' as 'sandbox' | 'production',
    mp_public_key: '',
    mp_client_id: '',
    mp_client_secret: ''
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        app_orders_enabled: settings.app_orders_enabled,
        app_pickup_enabled: settings.app_pickup_enabled,
        app_delivery_enabled: settings.app_delivery_enabled,
        mp_enabled: settings.mp_enabled,
        mp_mode: settings.mp_mode,
        mp_public_key: settings.mp_public_key || '',
        mp_client_id: settings.mp_client_id || '',
        mp_client_secret: settings.mp_client_secret || ''
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  if (loading && !settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Cargando configuración...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>Pedidos desde App Cliente</CardTitle>
          </div>
          <CardDescription>
            Configura si los clientes pueden hacer pedidos desde la aplicación móvil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Los pedidos solo se aceptarán si hay un turno de caja activo con la opción "Recibir pedidos desde app" activada.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="app_orders_enabled" className="text-base font-medium">
                Activar pedidos desde app
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite que los clientes hagan pedidos desde sus dispositivos
              </p>
            </div>
            <Switch
              id="app_orders_enabled"
              checked={localSettings.app_orders_enabled}
              onCheckedChange={(checked) => handleChange('app_orders_enabled', checked)}
              disabled={!isAdmin || loading}
            />
          </div>

          <div className="border-t pt-6 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Opciones de fulfillment
            </h4>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="app_pickup_enabled">Retiro en local</Label>
                <p className="text-sm text-muted-foreground">
                  Los clientes pueden pedir para retirar en el local
                </p>
              </div>
              <Switch
                id="app_pickup_enabled"
                checked={localSettings.app_pickup_enabled}
                onCheckedChange={(checked) => handleChange('app_pickup_enabled', checked)}
                disabled={!localSettings.app_orders_enabled || !isAdmin || loading}
              />
            </div>

            <div className="flex items-center justify-between opacity-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="app_delivery_enabled">Delivery</Label>
                  <Badge variant="secondary" className="text-xs">Próximamente</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Delivery con integración de Mapbox para cálculo de tarifas
                </p>
              </div>
              <Switch
                id="app_delivery_enabled"
                checked={localSettings.app_delivery_enabled}
                disabled={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>MercadoPago</CardTitle>
          </div>
          <CardDescription>
            Configura la pasarela de pagos para pedidos online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="mp_enabled" className="text-base font-medium">
                Activar MercadoPago
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite pagos con tarjetas y otros métodos de MercadoPago
              </p>
            </div>
            <Switch
              id="mp_enabled"
              checked={localSettings.mp_enabled}
              onCheckedChange={(checked) => handleChange('mp_enabled', checked)}
              disabled={!localSettings.app_orders_enabled || !isAdmin || loading}
            />
          </div>

          {localSettings.mp_enabled && (
            <div className="border-t pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mp_mode">Modo de operación</Label>
                <Select
                  value={localSettings.mp_mode}
                  onValueChange={(value) => handleChange('mp_mode', value)}
                  disabled={!isAdmin || loading}
                >
                  <SelectTrigger id="mp_mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">
                      Sandbox (Pruebas)
                    </SelectItem>
                    <SelectItem value="production">
                      Producción (Real)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usa "Sandbox" para pruebas y "Producción" para pagos reales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp_public_key">Public Key</Label>
                <Input
                  id="mp_public_key"
                  type="text"
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={localSettings.mp_public_key}
                  onChange={(e) => handleChange('mp_public_key', e.target.value)}
                  disabled={!isAdmin || loading}
                />
                <p className="text-xs text-muted-foreground">
                  La Public Key de MercadoPago (se puede exponer al frontend)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp_client_id">Client ID</Label>
                <Input
                  id="mp_client_id"
                  type="text"
                  placeholder="1234567890123456"
                  value={localSettings.mp_client_id}
                  onChange={(e) => handleChange('mp_client_id', e.target.value)}
                  disabled={!isAdmin || loading}
                />
                <p className="text-xs text-muted-foreground">
                  El Client ID de tu aplicación de MercadoPago
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mp_client_secret">Client Secret</Label>
                <Input
                  id="mp_client_secret"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={localSettings.mp_client_secret}
                  onChange={(e) => handleChange('mp_client_secret', e.target.value)}
                  disabled={!isAdmin || loading}
                />
                <p className="text-xs text-muted-foreground">
                  El Client Secret de tu aplicación (se almacena de forma segura)
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Access Token:</strong> Configúralo en los secrets del servidor con la clave <code className="px-1 py-0.5 bg-muted rounded">MERCADOPAGO_ACCESS_TOKEN</code>.
                  Esto permite que las edge functions procesen pagos de forma segura.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {localSettings.mp_enabled && (
        <MPDiagnostics />
      )}

      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            size="lg" 
            className="gap-2 shadow-lg"
            disabled={!isAdmin || loading}
          >
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      )}
    </div>
  );
}
