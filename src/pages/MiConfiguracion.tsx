import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Info, 
  CheckCircle2,
  Loader2,
  HardDrive,
  Calendar,
  Code2,
  Palette
} from 'lucide-react';
import { APP_VERSION, APP_BUILD_DATE, APP_NAME, CHANGELOG } from '@/config/version';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { toast } from "sonner";

export default function MiConfiguracion() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [swStatus, setSwStatus] = useState<'checking' | 'active' | 'none'>('checking');

  useEffect(() => {
    const checkServiceWorkerStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          setSwStatus(registrations.length > 0 ? 'active' : 'none');
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
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
      const keysToKeep = ['staff_token', 'staff_user'];
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast.success("Actualización en progreso", { description: "Recargando la aplicación..." });
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error forzando actualización:', error);
      setIsUpdating(false);
      toast.error("Error", { description: "No se pudo forzar la actualización. Intenta recargar manualmente." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Mi Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza tu experiencia en la aplicación
        </p>
      </div>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Personaliza el tema visual de la aplicación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h4 className="font-medium">Tema de la aplicación</h4>
              <p className="text-sm text-muted-foreground">
                El tema oscuro reduce la fatiga visual en ambientes con poca luz
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Code2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Versión</p>
                <p className="text-lg font-semibold">{APP_VERSION}</p>
                <Badge variant="outline" className="mt-1">{APP_NAME}</Badge>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de Build</p>
                <p className="text-lg font-semibold">{APP_BUILD_DATE}</p>
              </div>
            </div>
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

      {/* Changelog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Log de Actualizaciones
          </CardTitle>
          <CardDescription>
            Historial de cambios y mejoras del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {CHANGELOG.map((release, index) => (
              <div key={release.version} className="relative">
                {index < CHANGELOG.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
                )}
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm">v{release.version}</h4>
                      <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                        {release.date}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs text-primary border-primary">
                          Actual
                        </Badge>
                      )}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {release.changes.map((change, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
