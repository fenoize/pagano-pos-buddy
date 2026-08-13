import { useCallback, useEffect, useState } from 'react';
import { APP_VERSION } from '@/config/version';

interface RemoteVersion {
  version: string;
  buildDate?: string;
}

/**
 * Compara la versión compilada en el bundle (APP_VERSION) contra /version.json
 * servido sin caché. Si difieren, hay un despliegue nuevo disponible.
 */
export function useVersionCheck() {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      // 1. Comparar versión publicada
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as RemoteVersion;
        if (data?.version) {
          setRemoteVersion(data.version);
          if (data.version !== APP_VERSION) {
            setUpdateAvailable(true);
            return;
          }
        }
      }

      // 2. Comprobar si hay un Service Worker esperando
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update().catch(() => {});
          if (registration.waiting) {
            setUpdateAvailable(true);
          }
        }
      }
    } catch (error) {
      console.warn('[useVersionCheck] No se pudo verificar la versión:', error);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const applyUpdate = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg.unregister().catch(() => {});
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (error) {
      console.error('[useVersionCheck] Error al aplicar la actualización:', error);
    } finally {
      window.location.reload();
    }
  }, []);

  return { checking, updateAvailable, remoteVersion, currentVersion: APP_VERSION, check, applyUpdate };
}
