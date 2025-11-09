import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomerSplashScreenProps {
  isLoading: boolean;
}

export function CustomerSplashScreen({ isLoading }: CustomerSplashScreenProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [splashText, setSplashText] = useState<string>('Cargando tu experiencia pagana…');
  const [backgroundColor, setBackgroundColor] = useState<string>('#1c1e21');
  const [logoError, setLogoError] = useState(false);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Cargar configuración splash desde PWA config
    const loadSplashConfig = async () => {
      try {
        // Intentar obtener desde cache primero
        const cachedConfig = localStorage.getItem('paganos_splash_config');
        if (cachedConfig) {
          const config = JSON.parse(cachedConfig);
          setLogoUrl(config.logo);
          setSplashText(config.text || 'Cargando tu experiencia pagana…');
          setBackgroundColor(config.bgColor || '#1c1e21');
        }

        // Cargar desde DB en background
        const { data, error } = await supabase
          .from('pwa_config')
          .select('splash_logo_url, icon_512_url, icon_192_url, splash_text, splash_background_color')
          .eq('app_type', 'customer')
          .maybeSingle();

        if (!error && data) {
          // Prioridad: splash_logo_url > icon_512_url > icon_192_url
          const logo = data.splash_logo_url || data.icon_512_url || data.icon_192_url;
          const text = data.splash_text || 'Cargando tu experiencia pagana…';
          const bgColor = data.splash_background_color || '#1c1e21';
          
          if (logo) {
            setLogoUrl(logo);
          }
          setSplashText(text);
          setBackgroundColor(bgColor);
          
          // Guardar en cache
          localStorage.setItem('paganos_splash_config', JSON.stringify({
            logo,
            text,
            bgColor
          }));
        }
      } catch (err) {
        console.error('Error loading splash config:', err);
        // No bloquear si falla
      }
    };

    loadSplashConfig();
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
        backgroundColor: backgroundColor,
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

        {/* Texto de carga personalizable */}
        <p className="text-white/70 text-sm animate-pulse">
          {splashText}
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
