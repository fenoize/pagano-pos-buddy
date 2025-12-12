import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutos
const AUTO_REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hora - renovar automáticamente
const EXPIRY_WARNING = 5 * 60 * 1000; // 5 minutos - mostrar modal (fallback)

export function useSessionKeepAlive() {
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const isRefreshing = useRef(false);

  const handleForceLogout = useCallback(() => {
    setShowExpiryModal(false);
    clearStaffStorage();
    toast({
      title: "Sesión cerrada",
      description: "Tu sesión ha sido cerrada.",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = '/pos/login';
    }, 1000);
  }, []);

  const refreshToken = useCallback(async (silent: boolean = false): Promise<boolean> => {
    if (isRefreshing.current) return false;
    isRefreshing.current = true;

    const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
    if (!token) {
      isRefreshing.current = false;
      return false;
    }

    try {
      const { data: refreshData, error: refreshError } = await supabase
        .rpc('refresh_staff_token', { _token: token });

      if (refreshError || !refreshData || refreshData.length === 0) {
        console.error('Error al renovar token:', refreshError);
        isRefreshing.current = false;
        return false;
      }

      const newToken = refreshData[0].new_token;
      localStorage.setItem(STORAGE_KEYS.STAFF_TOKEN, newToken);

      if (!silent) {
        toast({
          title: "Sesión renovada",
          description: "Tu sesión ha sido extendida exitosamente.",
        });
      }

      console.log('Token renovado' + (silent ? ' automáticamente' : ''), ', expira:', refreshData[0].expires_at);
      isRefreshing.current = false;
      return true;
    } catch (error) {
      console.error('Error renovando sesión:', error);
      isRefreshing.current = false;
      return false;
    }
  }, []);

  const handleStayActive = useCallback(async () => {
    setShowExpiryModal(false);
    const success = await refreshToken(false);
    if (!success) {
      handleForceLogout();
    }
  }, [refreshToken, handleForceLogout]);

  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) return;

      try {
        const { data: validation, error } = await supabase
          .rpc('validate_staff_token', { _token: token });

        if (error || !validation || validation.length === 0) {
          console.error('Error validating token:', error);
          return;
        }

        const tokenData = validation[0];

        if (!tokenData.is_valid) {
          console.log('Token inválido detectado, cerrando sesión');
          handleForceLogout();
          return;
        }

        const expiresAt = new Date(tokenData.expires_at);
        const timeUntilExpiry = expiresAt.getTime() - Date.now();

        // Si el token expiró, cerrar sesión
        if (timeUntilExpiry <= 0) {
          console.log('Token expirado, cerrando sesión');
          handleForceLogout();
          return;
        }

        // Renovar automáticamente si queda menos de 1 hora (silencioso)
        if (timeUntilExpiry < AUTO_REFRESH_THRESHOLD && timeUntilExpiry > EXPIRY_WARNING) {
          console.log('Token próximo a expirar, renovando automáticamente...');
          const success = await refreshToken(true);
          if (!success) {
            console.warn('Renovación automática falló, se mostrará modal pronto');
          }
          return;
        }

        // Fallback: mostrar modal si queda menos de 5 minutos
        if (timeUntilExpiry < EXPIRY_WARNING && timeUntilExpiry > 0) {
          console.log('Sesión próxima a expirar, mostrando modal');
          setShowExpiryModal(true);
          return;
        }
      } catch (error) {
        console.error('Error en keep-alive:', error);
      }
    };

    checkAndRefresh();
    const intervalId = setInterval(checkAndRefresh, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [handleForceLogout, refreshToken]);

  return {
    showExpiryModal,
    handleStayActive,
    handleForceLogout
  };
}
