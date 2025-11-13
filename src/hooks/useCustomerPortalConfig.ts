import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PortalConfig {
  icon: string;
  subtitle: string;
}

export function useCustomerPortalConfig() {
  const [config, setConfig] = useState<PortalConfig>({
    icon: 'Flame',
    subtitle: 'Gestiona tus pedidos y runas'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('pwa_config')
          .select('portal_icon, portal_subtitle')
          .eq('app_type', 'customer')
          .maybeSingle();

        if (!error && data) {
          setConfig({
            icon: data.portal_icon || 'Flame',
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
