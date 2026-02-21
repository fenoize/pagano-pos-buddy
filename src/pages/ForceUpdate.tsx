import { useEffect, useState } from 'react';

export default function ForceUpdate() {
  const [status, setStatus] = useState('Actualizando...');

  useEffect(() => {
    const run = async () => {
      try {
        // 1. Desregistrar todos los Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
          setStatus('Service Workers eliminados...');
        }

        // 2. Limpiar todos los cachés
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
          setStatus('Caché limpiado...');
        }

        // 3. Limpiar localStorage de versiones antiguas (sin borrar sesión)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('paganos-sw') || k.startsWith('workbox'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));

        setStatus('¡Actualización completa! Redirigiendo...');

        // 4. Redirigir tras breve pausa
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (err) {
        console.error('Force update error:', err);
        setStatus('Error al actualizar. Recargando...');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
        <p className="text-white text-lg font-medium">{status}</p>
        <p className="text-gray-400 text-sm">Paganos POS — Actualización forzada</p>
      </div>
    </div>
  );
}
