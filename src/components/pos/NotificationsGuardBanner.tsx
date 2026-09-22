import { useEffect, useState } from 'react';
import { BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { isAudioUnlocked } from '@/lib/audioManager';

/**
 * Aviso persistente (no descartable) cuando el POS no puede alertar al cajero:
 * faltan permisos de notificación o el navegador aún no permite reproducir sonido.
 * No se puede ocultar hasta resolverlo, para que nunca quede silencioso sin que nadie lo note.
 */
export function NotificationsGuardBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [audioReady, setAudioReady] = useState(true);

  useEffect(() => {
    const check = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }
      setAudioReady(isAudioUnlocked());
    };
    check();
    const interval = window.setInterval(check, 5000);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', check);
    };
  }, []);

  const needsPermission = permission === 'default' || permission === 'denied';
  const needsAudio = !audioReady;

  if (!needsPermission && !needsAudio) return null;

  const handleFix = async () => {
    try {
      if (permission === 'default') {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== 'granted') {
          toast.error('Notificaciones bloqueadas', {
            description: 'Actívalas desde el candado de la barra de direcciones.',
          });
        }
      } else if (permission === 'denied') {
        toast.error('Notificaciones bloqueadas', {
          description: 'Actívalas desde el candado de la barra de direcciones y recarga la página.',
        });
      }
    } catch (e) {
      console.error('[NotificationsGuardBanner]', e);
    }
    setAudioReady(isAudioUnlocked());
  };

  const message = needsPermission
    ? 'Las alertas de pedidos están desactivadas en este equipo'
    : 'Toca la pantalla para habilitar el sonido de las alertas de pedidos';

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 bg-amber-500 text-black px-4 py-2 text-sm font-semibold"
    >
      <span className="flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        {message}
      </span>
      {needsPermission && (
        <button
          onClick={handleFix}
          className="bg-black text-amber-400 rounded px-3 py-1 text-xs font-bold"
        >
          ACTIVAR
        </button>
      )}
    </div>
  );
}

export default NotificationsGuardBanner;
