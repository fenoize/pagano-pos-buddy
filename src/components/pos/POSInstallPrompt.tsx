import React, { useState, useEffect } from 'react';
import { Download, X, Share, MoreVertical, Smartphone } from 'lucide-react';
import { usePOSInstallPrompt } from '@/hooks/usePOSInstallPrompt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function POSInstallPrompt() {
  const {
    canInstallPwa,
    shouldShowPopup,
    platform,
    triggerNativeInstall,
    dismissPopup,
    markAsInstalled,
  } = usePOSInstallPrompt();

  const [isOpen, setIsOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Mostrar después de 2 segundos
  useEffect(() => {
    if (shouldShowPopup) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowPopup]);

  const handleInstall = async () => {
    if (platform === 'ios') {
      setShowIOSInstructions(true);
    } else {
      const success = await triggerNativeInstall();
      if (success) {
        setIsOpen(false);
      }
    }
  };

  const handleDismiss = () => {
    dismissPopup(7);
    setIsOpen(false);
  };

  const handleIOSComplete = () => {
    markAsInstalled();
    setIsOpen(false);
  };

  if (!canInstallPwa) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        {!showIOSInstructions ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Smartphone className="h-5 w-5 text-primary" />
                Instalar POS
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <img 
                    src="/icons/paganos-192.png" 
                    alt="Paganos POS"
                    className="w-12 h-12 rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Paganos Burger POS</h3>
                  <p className="text-sm text-muted-foreground">
                    Instala la app para acceso rápido y trabajar sin distracciones
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  Acceso directo desde el escritorio
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  Pantalla completa sin barra de navegación
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-600 text-xs">✓</span>
                  </div>
                  Notificaciones de pedidos y caja
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDismiss}
              >
                Ahora no
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleInstall}
              >
                <Download className="h-4 w-4 mr-2" />
                Instalar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <Share className="h-5 w-5 text-primary" />
                Instalar en iOS
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Sigue estos pasos para instalar la app:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Toca el botón <Share className="inline h-4 w-4 mx-1" /> en la barra de Safari
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Desplázate y selecciona "Agregar a pantalla de inicio"
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Toca "Agregar" para confirmar
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleIOSComplete}
            >
              ¡Entendido!
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
