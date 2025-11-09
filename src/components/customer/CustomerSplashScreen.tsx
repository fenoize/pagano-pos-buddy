import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomerSplashScreenProps {
  isLoading: boolean;
}

export function CustomerSplashScreen({ isLoading }: CustomerSplashScreenProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Cargar logo desde configuración PWA (sin bloquear)
    const loadLogo = async () => {
      try {
        // Intentar obtener desde cache primero
        const cachedLogo = localStorage.getItem('paganos_customer_logo');
        if (cachedLogo) {
          setLogoUrl(cachedLogo);
        }

        // Cargar desde DB en background
        const { data, error } = await supabase
          .from('pwa_config')
          .select('icon_512_url, icon_192_url')
          .eq('app_type', 'customer')
          .maybeSingle();

        if (!error && data) {
          const url = data.icon_512_url || data.icon_192_url;
          if (url) {
            setLogoUrl(url);
            localStorage.setItem('paganos_customer_logo', url);
          }
        }
      } catch (err) {
        console.error('Error loading logo:', err);
        // No bloquear si falla
      }
    };

    loadLogo();
  }, []);

  useEffect(() => {
    // Ocultar el splash con fade out cuando termine la carga
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShow(false);
      }, 300); // Tiempo de la animación fade-out
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!show && !isLoading) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300"
      style={{
        backgroundColor: '#1c1e21',
        opacity: isLoading ? 1 : 0,
        pointerEvents: isLoading ? 'auto' : 'none',
      }}
    >
      {/* Logo o texto fallback */}
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt="Paganos Burger"
            className="w-32 h-32 object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-wider">
              PAGANOS BURGER
            </h1>
          </div>
        )}

        {/* Texto de carga */}
        <p className="text-white/70 text-sm animate-pulse">
          Cargando tu experiencia pagana…
        </p>

        {/* Loader animado con CSS puro */}
        <div className="flex gap-2">
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: '#cc2525',
              animationDelay: '0ms',
              animationDuration: '1s',
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: '#cc2525',
              animationDelay: '150ms',
              animationDuration: '1s',
            }}
          />
          <div
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              backgroundColor: '#cc2525',
              animationDelay: '300ms',
              animationDuration: '1s',
            }}
          />
        </div>
      </div>
    </div>
  );
}
