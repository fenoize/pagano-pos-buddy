import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortalConfig {
  iconUrl: string | null;
  subtitle: string;
}

export function useCustomerPortalConfig() {
  const [config, setConfig] = useState<PortalConfig>({
    iconUrl: null,
    subtitle: 'Gestiona tus pedidos y runas'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('pwa_config')
          .select('portal_icon_url, portal_subtitle')
          .eq('app_type', 'customer')
          .maybeSingle();

        if (!error && data) {
          setConfig({
            iconUrl: data.portal_icon_url || null,
            subtitle: data.portal_subtitle || 'Gestiona tus pedidos y runas'
          });
        }
      } catch (err) {
        console.error('Error loading portal config:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { config, loading };
}
