import { useState } from 'react';
import { X, Bell, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface NotificationPermissionBannerProps {
  onRequestPermission: () => Promise<boolean>;
  onDismiss: () => void;
}

export function NotificationPermissionBanner({
  onRequestPermission,
  onDismiss,
}: NotificationPermissionBannerProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleActivate = async () => {
    setIsRequesting(true);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        toast.success('¡Notificaciones activadas!', {
          description: 'Recibirás alertas de tus pedidos y promos vikingas 🔥',
        });
      } else {
        // User denied - close banner but don't persist dismissal
        onDismiss();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('No se pudieron activar las notificaciones');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96 animate-in slide-in-from-bottom-5 duration-300">
      <div className="relative bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl shadow-2xl p-5 border border-primary-foreground/10">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/10">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">
              🔥 Activa las notificaciones del Clan
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-primary-foreground/90 mb-4 leading-relaxed">
          Recibe alertas de tus pedidos, promos vikingas y runas extra. ¿Te anotamos?
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleActivate}
            disabled={isRequesting}
            className="flex-1 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isRequesting ? 'Activando...' : 'Activar notificaciones'}
          </Button>
          <Button
            onClick={onDismiss}
            variant="ghost"
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  );
}
