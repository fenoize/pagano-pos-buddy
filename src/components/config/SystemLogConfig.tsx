import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Terminal, 
  Info, 
  CheckCircle2,
  Loader2,
  HardDrive,
  Calendar,
  Code2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { APP_VERSION, APP_BUILD_DATE, APP_NAME } from '@/config/version.ts';

export function SystemLogConfig() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>('checking');

  useEffect(() => {
    const checkServiceWorkerStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            setSwStatus('active');
          } else {
            setSwStatus('none');
          }
        } catch {
          setSwStatus('none');
        }
      } else {
        setSwStatus('none');
      }
    };
    
    checkServiceWorkerStatus();
  }, []);

  const forceUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        console.log('Service Workers desregistrados:', registrations.length);
      }

      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
        console.log('Cachés eliminados:', cacheNames.length);
      }

      // 3. Clear localStorage items related to app state (but not auth)
      const keysToKeep = ['staff_token', 'staff_user'];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({
        title: "Actualización en progreso",
        description: "Recargando la aplicación...",
      });

      // 4. Force reload bypassing cache
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error forzando actualización:', error);
      setIsUpdating(false);
      toast({
        title: "Error",
        description: "No se pudo forzar la actualización. Intenta recargar manualmente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* System Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Información del Sistema
          </CardTitle>
          <CardDescription>
            Detalles de la versión actual y estado del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* App Version */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Code2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Versión</p>
                <p className="text-lg font-semibold">{APP_VERSION}</p>
                <Badge variant="outline" className="mt-1">{APP_NAME}</Badge>
              </div>
            </div>

            {/* Build Date */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Build</p>
                <p className="text-lg font-semibold">{APP_BUILD_DATE}</p>
              </div>
            </div>

            {/* Service Worker Status */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <HardDrive className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service Worker</p>
                <div className="flex items-center gap-2 mt-1">
                  {swStatus === 'checking' && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Verificando...
                    </Badge>
                  )}
                  {swStatus === 'active' && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Activo
                    </Badge>
                  )}
                  {swStatus === 'none' && (
                    <Badge variant="secondary">No registrado</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Update Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h4 className="font-medium">Buscar Actualización</h4>
              <p className="text-sm text-muted-foreground">
                Limpia caché y recarga la aplicación para obtener la última versión
              </p>
            </div>
            <Button 
              onClick={forceUpdate} 
              disabled={isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Buscar Actualización
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Log de Actividad
          </CardTitle>
          <CardDescription>
            Registro de actividad reciente del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Terminal className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium text-muted-foreground">Próximamente</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              El registro detallado de actividad estará disponible en una próxima actualización.
              Incluirá: logins, cambios de configuración, y acciones importantes del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
