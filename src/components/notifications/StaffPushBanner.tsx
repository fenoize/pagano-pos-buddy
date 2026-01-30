import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaffPushBannerProps {
  onRequestPermission: () => Promise<boolean>;
  onDismiss: () => void;
}

/**
 * Banner for requesting push notification permission in POS
 */
export function StaffPushBanner({ onRequestPermission, onDismiss }: StaffPushBannerProps) {
  const handleEnable = async () => {
    await onRequestPermission();
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">
              Activar notificaciones
            </h3>
            <p className="text-muted-foreground text-xs mt-1">
              Recibe alertas de nuevos pedidos, apertura de turnos y movimientos de caja en tiempo real.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleEnable}
                size="sm"
                className="flex-1"
              >
                Activar
              </Button>
              <Button
                onClick={onDismiss}
                variant="outline"
                size="sm"
              >
                Ahora no
              </Button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
