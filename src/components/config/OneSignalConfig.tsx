import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Bell, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Eye, 
  EyeOff,
  AlertTriangle 
} from 'lucide-react';
import { useOneSignalSettings } from '@/hooks/useOneSignalSettings';
import type { OneSignalSettings } from '@/types/notifications';

export const OneSignalConfig: React.FC = () => {
  const { settings, loading, saving, saveOneSignalSettings } = useOneSignalSettings();
  const [localSettings, setLocalSettings] = useState<OneSignalSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key: keyof OneSignalSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveOneSignalSettings(localSettings);
      setHasChanges(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const isConfigured = localSettings.app_id && localSettings.enabled;

  if (loading) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">OneSignal</h3>
            <p className="text-sm text-muted-foreground">
              Notificaciones push para web y móvil
            </p>
          </div>
        </div>
        {isConfigured ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Configurado
          </Badge>
        ) : localSettings.app_id ? (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="w-3 h-3" />
            Deshabilitado
          </Badge>
        ) : null}
      </div>

      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          Asegúrate de usar las credenciales de OneSignal para <strong>PRODUCCIÓN</strong>.
          La REST API Key se almacena de forma segura en Supabase Secrets.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="onesignal_enabled">Habilitar OneSignal</Label>
            <p className="text-sm text-muted-foreground">
              Activa el envío de notificaciones push
            </p>
          </div>
          <Switch
            id="onesignal_enabled"
            checked={localSettings.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onesignal_app_id">App ID</Label>
          <Input
            id="onesignal_app_id"
            type="text"
            value={localSettings.app_id}
            onChange={(e) => handleChange('app_id', e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
          <p className="text-xs text-muted-foreground">
            El App ID público de tu aplicación OneSignal
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="onesignal_web_site_name">Nombre del Sitio (opcional)</Label>
          <Input
            id="onesignal_web_site_name"
            type="text"
            value={localSettings.web_site_name}
            onChange={(e) => handleChange('web_site_name', e.target.value)}
            placeholder="Pagano's Burger"
          />
          <p className="text-xs text-muted-foreground">
            Nombre que verán los usuarios en las notificaciones
          </p>
        </div>

        <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
          <p className="font-medium">Configuración adicional:</p>
          <p className="text-muted-foreground">
            La <strong>REST API Key</strong> debe configurarse en{' '}
            <a
              href="https://supabase.com/dashboard/project/lxxfhayifyiioglfbsyj/settings/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Supabase Secrets
              <ExternalLink className="w-3 h-3" />
            </a>
            {' '}con el nombre <code className="bg-background px-1 rounded">ONESIGNAL_REST_API_KEY</code>
          </p>
        </div>

        <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
          <p className="font-medium">Con OneSignal podrás:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Enviar notificaciones de estado de pedido</li>
            <li>Notificar asignación de repartidor</li>
            <li>Informar sobre Runas ganadas</li>
            <li>Enviar campañas de marketing masivas</li>
          </ul>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm space-y-2 border border-blue-200 dark:border-blue-800">
          <p className="font-medium text-blue-800 dark:text-blue-200">🧪 Herramientas de Testing</p>
          <p className="text-blue-700 dark:text-blue-300 text-xs">
            Si el banner de notificaciones no aparece en la app de cliente, usa este botón para resetear el estado y probar nuevamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('paganos_notification_banner_dismissed');
              localStorage.removeItem('paganos_notification_permission_asked');
              toast.success('Estado reseteado', {
                description: 'Recarga la app de cliente para ver el banner de notificaciones'
              });
            }}
          >
            Resetear banner de notificaciones
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Obtén tus credenciales en{' '}
          <a
            href="https://app.onesignal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            app.onesignal.com
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      <div className="flex justify-end pt-2">
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
              Guardar OneSignal
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
