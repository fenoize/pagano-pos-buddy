import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Share, Plus, Smartphone } from 'lucide-react';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { usePWAConfig } from '@/hooks/usePWAConfig';

/**
 * Popup de instalación PWA para la app de clientes.
 * 
 * Características:
 * - Solo aparece en la app de clientes (nunca en /pos)
 * - Respeta preferencias del usuario (rechazos por 7 días)
 * - Soporte para Android/Chrome (beforeinstallprompt) e iOS (instrucciones)
 * - Diseño con colores de Paganos Burger
 * - Usa logo desde configuración PWA
 */
export function PWAInstallPrompt() {
  const {
    canInstallPwa,
    shouldShowPopup,
    platform,
    triggerNativeInstall,
    dismissPopup,
  } = usePwaInstallPrompt();

  const { logoUrl, loading: configLoading } = usePWAConfig();

  const [isOpen, setIsOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Mostrar popup después de 3 segundos si cumple condiciones
  useEffect(() => {
    if (shouldShowPopup && !configLoading) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [shouldShowPopup, configLoading]);

  const handleInstall = async () => {
    if (platform === 'ios') {
      // En iOS mostrar instrucciones
      setShowIOSInstructions(true);
    } else if (canInstallPwa) {
      // En Android/Chrome usar prompt nativo
      const outcome = await triggerNativeInstall();
      if (outcome === 'accepted' || outcome === 'dismissed') {
        setIsOpen(false);
      }
    } else {
      // Fallback: mostrar instrucciones genéricas
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    dismissPopup(7);
    setIsOpen(false);
  };

  const handleIOSUnderstood = () => {
    dismissPopup(7);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-md bg-[#1c1e21] border-[#cc2525]/20 text-white"
        onInteractOutside={(e) => e.preventDefault()} // No cerrar con click fuera
      >
        {!showIOSInstructions ? (
          <>
            <DialogHeader className="items-center text-center space-y-4">
              {/* Logo */}
              <div className="mx-auto bg-white/10 p-4 rounded-full w-20 h-20 flex items-center justify-center">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Paganos Burger" 
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <Smartphone className="w-10 h-10 text-[#cc2525]" />
                )}
              </div>

              {/* Título */}
              <DialogTitle className="text-2xl font-bold text-white">
                Instala la App de Paganos Burger
              </DialogTitle>

              {/* Descripción */}
              <DialogDescription className="text-[#b0b3b8] text-base">
                Ten acceso rápido a tu cuenta, runas y pedidos directamente desde la pantalla de inicio de tu celular.
              </DialogDescription>
            </DialogHeader>

            {/* Botones */}
            <div className="space-y-3 mt-4">
              <Button
                onClick={handleInstall}
                className="w-full bg-[#cc2525] hover:bg-[#cc2525]/90 text-white font-semibold py-6 text-base"
              >
                <Download className="mr-2 h-5 w-5" />
                Instalar App
              </Button>

              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="w-full text-white/70 hover:text-white hover:bg-white/5"
              >
                Ahora no
              </Button>

              <p className="text-xs text-[#b0b3b8] text-center mt-2">
                Podrás instalar la app más tarde desde el menú de tu navegador
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="items-center text-center space-y-4">
              {/* Icono de compartir */}
              <div className="mx-auto bg-[#cc2525]/10 p-4 rounded-full w-20 h-20 flex items-center justify-center">
                <Share className="w-10 h-10 text-[#cc2525]" />
              </div>

              {/* Título */}
              <DialogTitle className="text-2xl font-bold text-white">
                Cómo instalar en tu dispositivo
              </DialogTitle>
            </DialogHeader>

            {/* Instrucciones para iOS */}
            <div className="space-y-4 mt-4">
              <div className="bg-[#24262a] rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-[#cc2525] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <p className="text-white text-sm flex-1">
                    Toca el botón de <span className="font-semibold">Compartir</span> <Share className="inline h-4 w-4" /> en la barra de navegación
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-[#cc2525] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <p className="text-white text-sm flex-1">
                    Desplázate y selecciona <span className="font-semibold">"Añadir a pantalla de inicio"</span> <Plus className="inline h-4 w-4" />
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-[#cc2525] text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <p className="text-white text-sm flex-1">
                    Confirma para instalar la app
                  </p>
                </div>
              </div>

              <Button
                onClick={handleIOSUnderstood}
                className="w-full bg-[#cc2525] hover:bg-[#cc2525]/90 text-white font-semibold py-6"
              >
                Entendido
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
