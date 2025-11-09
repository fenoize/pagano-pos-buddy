import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PWAConfig {
  app_type: string;
  icon_192_url: string | null;
  icon_512_url: string | null;
  icon_maskable_url: string | null;
  splash_logo_url: string | null;
  splash_text: string;
  splash_background_color: string;
}

/**
 * Hook para obtener la configuración PWA desde la base de datos.
 * Carga la config para la app de clientes ('customer').
 */
export function usePWAConfig() {
  const [config, setConfig] = useState<PWAConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('pwa_config')
          .select('*')
          .eq('app_type', 'customer')
          .maybeSingle();

        if (!error && data) {
          setConfig(data);
        }
      } catch (err) {
        console.error('Error loading PWA config:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Determinar el mejor logo disponible: splash > 512 > 192
  const logoUrl = config?.splash_logo_url || config?.icon_512_url || config?.icon_192_url;

  return {
    config,
    logoUrl,
    loading,
  };
}
