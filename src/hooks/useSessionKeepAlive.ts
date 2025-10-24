import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutos
const EXPIRY_THRESHOLD = 2 * 60 * 60 * 1000; // Renovar si expira en <2 horas
const WARNING_THRESHOLD = 30 * 60 * 1000; // Advertir a 30 minutos

export function useSessionKeepAlive() {
  useEffect(() => {
    let hasShownWarning = false;

    const checkAndRefresh = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) return;

      try {
        // Validar token actual
        const { data: validation, error } = await supabase
          .rpc('validate_staff_token', { _token: token });

        if (error || !validation || validation.length === 0) {
          console.error('Error validating token:', error);
          return;
        }

        const tokenData = validation[0];

        if (!tokenData.is_valid) {
          // Token inválido - cerrar sesión
          console.log('Token inválido detectado, cerrando sesión');
          clearStaffStorage();
          toast({
            title: "Sesión expirada",
            description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = '/pos/login';
          }, 2000);
          return;
        }

        const expiresAt = new Date(tokenData.expires_at);
        const timeUntilExpiry = expiresAt.getTime() - Date.now();

        // Advertencia si expira en menos de 30 minutos
        if (timeUntilExpiry < WARNING_THRESHOLD && !hasShownWarning) {
          hasShownWarning = true;
          const minutesLeft = Math.floor(timeUntilExpiry / 60000);
          toast({
            title: "Sesión por expirar",
            description: `Tu sesión expirará en ${minutesLeft} minutos. Se renovará automáticamente.`,
          });
        }

        // Renovar si expira en menos de 2 horas
        if (timeUntilExpiry < EXPIRY_THRESHOLD) {
          console.log('Renovando token automáticamente...');
          const { data: refreshData, error: refreshError } = await supabase
            .rpc('refresh_staff_token', { _token: token });

          if (refreshError || !refreshData || refreshData.length === 0) {
            console.error('Error al renovar token:', refreshError);
            return;
          }

          // Actualizar token en localStorage
          const newToken = refreshData[0].new_token;
          localStorage.setItem(STORAGE_KEYS.STAFF_TOKEN, newToken);
          hasShownWarning = false; // Reset warning para el nuevo token
          console.log('Token renovado exitosamente, expira:', refreshData[0].expires_at);
        }
      } catch (error) {
        console.error('Error en keep-alive:', error);
      }
    };

    // Ejecutar inmediatamente al montar
    checkAndRefresh();

    // Ejecutar cada 10 minutos
    const intervalId = setInterval(checkAndRefresh, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);
}
