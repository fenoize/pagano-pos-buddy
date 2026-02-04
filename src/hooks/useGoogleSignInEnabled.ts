import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para verificar si Google Sign-In está habilitado
 * Usado en la app de clientes para mostrar/ocultar el botón de Google
 */
export function useGoogleSignInEnabled() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const { data, error } = await supabase
          .from('online_order_settings')
          .select('google_signin_enabled')
          .single();

        if (error) throw error;
        
        setEnabled(data?.google_signin_enabled ?? false);
      } catch (error) {
        console.error('Error fetching Google Sign-In setting:', error);
        setEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSetting();
  }, []);

  return { enabled, loading };
}
