import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Bell, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useStaffOneSignal } from '@/hooks/useStaffOneSignal';
import { useAuthContext } from '@/contexts/AuthContext';

const SESSION_KEY = 'paganos_pos_startup_checks';

function isPushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Validaciones al iniciar sesión en el POS:
 * 1. Versión de la app (obliga a actualizar si hay una versión nueva publicada)
 * 2. Permisos de notificaciones (para que suene al entrar un pedido de la app o la web)
 */
export function StaffStartupChecks() {
  const { user } = useAuthContext();
  const { updateAvailable, remoteVersion, currentVersion, applyUpdate } = useVersionCheck();
  const { requestPermission, initialized } = useStaffOneSignal();

  const [updating, setUpdating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Chequeo de notificaciones: una vez por sesión de navegador tras iniciar sesión
  useEffect(() => {
    if (!user?.id || updateAvailable) return;
    if (!isPushSupported()) return;
    if (Notification.permission === 'granted') return;

    const alreadyChecked = sessionStorage.getItem(`${SESSION_KEY}_${user.id}`);
    if (alreadyChecked === 'true') return;

    setShowNotifications(true);
  }, [user?.id, updateAvailable]);

  const markChecked = () => {
    if (user?.id) sessionStorage.setItem(`${SESSION_KEY}_${user.id}`, 'true');
  };

  const handleUpdate = async () => {
    setUpdating(true);
    await applyUpdate();
  };

  const handleEnableNotifications = async () => {
    setRequesting(true);
    try {
      let granted = false;

      if (initialized) {
        granted = await requestPermission();
      }

      if (!granted && Notification.permission !== 'granted') {
        const result = await Notification.requestPermission();
        granted = result === 'granted';
      } else if (Notification.permission === 'granted') {
        granted = true;
      }

      if (granted) {
        toast.success('Notificaciones activadas', {
          description: 'Sonarán las alertas de pedidos entrantes.',
        });
        setShowNotifications(false);
        markChecked();
      } else {
        toast.error('Notificaciones bloqueadas', {
          description: 'Actívalas en la configuración del navegador para escuchar los pedidos.',
        });
      }
    } catch (error) {
      console.error('[StaffStartupChecks] Error al pedir permisos:', error);
      toast.error('No se pudieron activar las notificaciones');
    } finally {
      setRequesting(false);
    }
  };

  const handleSkipNotifications = () => {
    markChecked();
    setShowNotifications(false);
  };

  if (!user?.id) return null;

  return (
    <>
      {/* Actualización disponible */}
      <AlertDialog open={updateAvailable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Actualización disponible
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hay una nueva versión de Paganos POS
              {remoteVersion ? ` (v${remoteVersion})` : ''}. Tu equipo está usando la v{currentVersion}.
              Debes actualizar para continuar y evitar errores de sincronización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={handleUpdate} disabled={updating} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              {updating ? 'Actualizando...' : 'Actualizar ahora'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permisos de notificaciones */}
      <AlertDialog open={showNotifications && !updateAvailable}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Activar notificaciones
            </AlertDialogTitle>
            <AlertDialogDescription>
              {Notification.permission === 'denied'
                ? 'Las notificaciones están bloqueadas en este navegador. Habilítalas desde el candado de la barra de direcciones para escuchar la alerta cuando entre un pedido por la app o la página.'
                : 'Necesitamos tu permiso para avisarte y hacer sonar la alarma cuando entre un pedido por la app o la página web.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" onClick={handleSkipNotifications}>
              Ahora no
            </Button>
            <Button onClick={handleEnableNotifications} disabled={requesting || Notification.permission === 'denied'}>
              <Bell className="h-4 w-4 mr-2" />
              {requesting ? 'Activando...' : 'Activar notificaciones'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
