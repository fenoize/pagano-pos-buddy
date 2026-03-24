import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface LocationPermissionHelperProps {
  permissionState: 'checking' | 'granted' | 'prompt' | 'denied' | 'unknown';
  onRequestPermission: () => void;
  lastError?: string | null;
}

function detectPlatform(): 'ios' | 'android' | 'unknown' {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'unknown';
}

export const LocationPermissionHelper: React.FC<LocationPermissionHelperProps> = ({
  permissionState,
  onRequestPermission,
  lastError,
}) => {
  if (permissionState === 'checking') {
    return (
      <Alert className="border-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Verificando permisos de ubicación...</AlertDescription>
      </Alert>
    );
  }

  if (permissionState === 'granted') {
    return null; // No need to show anything
  }

  if (permissionState === 'prompt') {
    return (
      <Alert className="border-primary/50 bg-primary/5">
        <MapPin className="h-4 w-4 text-primary" />
        <AlertDescription className="space-y-2">
          <p className="font-medium">Activa tu ubicación para compartir el tracking con el cliente</p>
          <Button size="sm" onClick={onRequestPermission} className="w-full">
            <MapPin className="h-4 w-4 mr-2" />
            Activar ubicación
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Denied or unknown
  const platform = detectPlatform();

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="space-y-2">
        <p className="font-medium">Permiso de ubicación denegado</p>
        {lastError && <p className="text-xs opacity-80">{lastError}</p>}
        
        {platform === 'ios' && (
          <div className="text-xs space-y-1 mt-2 p-2 bg-background/50 rounded">
            <p className="font-semibold">Para activarlo en iPhone:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Abre <strong>Ajustes</strong> del iPhone</li>
              <li>Busca <strong>Safari</strong> (o tu navegador)</li>
              <li>Toca <strong>Ubicación</strong></li>
              <li>Selecciona <strong>Permitir</strong></li>
            </ol>
          </div>
        )}
        
        {platform === 'android' && (
          <div className="text-xs space-y-1 mt-2 p-2 bg-background/50 rounded">
            <p className="font-semibold">Para activarlo en Android:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Toca el <strong>candado</strong> en la barra de direcciones</li>
              <li>Toca <strong>Permisos</strong></li>
              <li>Activa <strong>Ubicación</strong></li>
              <li>Recarga la página</li>
            </ol>
          </div>
        )}

        {platform === 'unknown' && (
          <p className="text-xs mt-2">
            Revisa los permisos de ubicación en la configuración de tu navegador y recarga la página.
          </p>
        )}

        <Button size="sm" variant="outline" onClick={onRequestPermission} className="w-full mt-2">
          Reintentar
        </Button>
      </AlertDescription>
    </Alert>
  );
};
