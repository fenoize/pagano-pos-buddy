import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

const STORAGE_KEYS = {
  DISMISSED_AT: 'paganos_pwa_install_dismissed_at',
  INSTALLED: 'paganos_pwa_installed',
} as const;

const DISMISS_DURATION_DAYS = 7;

/**
 * Hook para gestionar el prompt de instalación de PWA.
 * 
 * Responsabilidades:
 * - Detectar si la PWA ya está instalada (standalone mode)
 * - Capturar evento beforeinstallprompt (Chrome/Edge/Android)
 * - Gestionar localStorage para rechazos temporales (7 días)
 * - Determinar cuándo mostrar el popup
 * - Proporcionar funciones para instalar y rechazar
 */
export function usePwaInstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');

  // Detectar plataforma
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isDesktop = !isIOS && !isAndroid;

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else if (isDesktop) setPlatform('desktop');
  }, []);

  // Detectar si ya está instalada (standalone mode)
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      setIsStandalone(standalone);
      
      if (standalone) {
        localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
      }
    };

    checkStandalone();

    // Listener para cambios en display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = () => checkStandalone();
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Verificar si fue rechazado recientemente
  const wasDismissedRecently = (): boolean => {
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
    if (!dismissedAt) return false;

    const dismissedDate = new Date(dismissedAt);
    const now = new Date();
    const daysSince = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

    return daysSince < DISMISS_DURATION_DAYS;
  };

  // Verificar si ya fue instalado antes
  const wasInstalledBefore = (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true';
  };

  // Verificar si estamos en ruta de POS
  const isPOSRoute = location.pathname.startsWith('/pos');

  // Determinar si se debe mostrar el popup
  const canInstallPwa = deferredPrompt !== null;
  const shouldShowPopup = 
    !isStandalone && 
    !wasInstalledBefore() && 
    !wasDismissedRecently() && 
    !isPOSRoute &&
    (canInstallPwa || platform === 'ios');

  /**
   * Trigger native install prompt (solo en plataformas que soporten beforeinstallprompt)
   */
  const triggerNativeInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      return 'unavailable';
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        markAsInstalled();
      } else {
        dismissPopup(DISMISS_DURATION_DAYS);
      }

      setDeferredPrompt(null);
      return outcome;
    } catch (err) {
      console.error('Error al mostrar prompt de instalación:', err);
      return 'dismissed';
    }
  };

  /**
   * Marcar el popup como rechazado (no mostrar por N días)
   */
  const dismissPopup = (days: number = DISMISS_DURATION_DAYS): void => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, now);
  };

  /**
   * Marcar como instalada permanentemente
   */
  const markAsInstalled = (): void => {
    localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
  };

  return {
    // Estado
    canInstallPwa,
    isStandalone,
    shouldShowPopup,
    platform,
    
    // Funciones
    triggerNativeInstall,
    dismissPopup,
    markAsInstalled,
  };
}
