import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEYS = {
  DISMISSED_AT: 'paganos_pos_pwa_dismissed_at',
  INSTALLED: 'paganos_pos_pwa_installed',
};

const DISMISS_DURATION_DAYS = 7;

type Platform = 'ios' | 'android' | 'desktop';

export function usePOSInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  // Detectar plataforma
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }
  }, []);

  // Detectar si ya está instalado como standalone
  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkStandalone);
    
    return () => mediaQuery.removeEventListener('change', checkStandalone);
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[POS PWA] beforeinstallprompt captured');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Verificar si fue descartado recientemente
  const wasDismissedRecently = (): boolean => {
    const dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
    if (!dismissedAt) return false;
    
    const dismissedDate = new Date(dismissedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff < DISMISS_DURATION_DAYS;
  };

  // Verificar si ya fue instalado
  const wasInstalledBefore = (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true';
  };

  // Solo mostrar en rutas /pos
  const isPOSRoute = window.location.pathname.startsWith('/pos');

  // Determinar si mostrar el popup
  const canInstallPwa = deferredPrompt !== null || platform === 'ios';
  const shouldShowPopup = 
    isPOSRoute &&
    !isStandalone &&
    !wasDismissedRecently() &&
    !wasInstalledBefore() &&
    canInstallPwa;

  // Trigger instalación nativa
  const triggerNativeInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('[POS PWA] No deferred prompt available');
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[POS PWA] User accepted install');
        markAsInstalled();
        return true;
      } else {
        console.log('[POS PWA] User dismissed install');
        return false;
      }
    } catch (error) {
      console.error('[POS PWA] Install error:', error);
      return false;
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Descartar popup temporalmente
  const dismissPopup = (days: number = DISMISS_DURATION_DAYS) => {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, new Date().toISOString());
    console.log(`[POS PWA] Dismissed for ${days} days`);
  };

  // Marcar como instalado permanentemente
  const markAsInstalled = () => {
    localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
    console.log('[POS PWA] Marked as installed');
  };

  return {
    canInstallPwa,
    isStandalone,
    shouldShowPopup,
    platform,
    triggerNativeInstall,
    dismissPopup,
    markAsInstalled,
  };
}
