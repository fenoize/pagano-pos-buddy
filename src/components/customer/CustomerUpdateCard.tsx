import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { APP_VERSION, APP_BUILD_DATE } from '@/config/version';

export function CustomerUpdateCard() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);

  const forceUpdate = async () => {
    setIsUpdating(true);
    try {
      // Desregistrar todos los service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
      }

      // Limpiar caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }

      // Limpiar algunos items del localStorage (excepto sesión)
      const keysToKeep = ['customer_session', 'customer_token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(keep => key.includes(keep))) {
          // Solo eliminar keys relacionados con cache/versión
          if (key.includes('pwa') || key.includes('cache') || key.includes('version')) {
            localStorage.removeItem(key);
          }
        }
      });

      toast.success('Actualización encontrada. Recargando...');
      
      // Recargar la página después de un breve delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al buscar actualizaciones');
      setIsUpdating(false);
    }
  };

  const checkForUpdates = async () => {
    setIsUpdating(true);
    try {
      // Verificar si hay un nuevo service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting) {
            // Hay una actualización pendiente
            toast.info('Actualización disponible. Instalando...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            setTimeout(() => window.location.reload(), 1000);
            return;
          }
        }
      }

      setUpdateChecked(true);
      toast.success('Tu app está actualizada');
      
      setTimeout(() => setUpdateChecked(false), 3000);
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
      toast.error('Error al verificar actualizaciones');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Configuración</h3>
              <p className="text-xs text-muted-foreground">
                v{APP_VERSION} • {APP_BUILD_DATE}
              </p>
            </div>
          </div>
          {updateChecked && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={checkForUpdates}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Buscar Actualizaciones
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={forceUpdate}
            disabled={isUpdating}
            className="text-muted-foreground hover:text-foreground"
          >
            Forzar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
