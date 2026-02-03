import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';

// Configuración para navegador web (4 horas de sesión)
const WEB_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutos
const WEB_AUTO_REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hora - renovar automáticamente
const WEB_EXPIRY_WARNING = 5 * 60 * 1000; // 5 minutos - mostrar modal

// Configuración para PWA (365 días de sesión)
const PWA_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 horas
const PWA_AUTO_REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 días - renovar automáticamente

export function useSessionKeepAlive() {
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const isRefreshing = useRef(false);
  
  // Detectar si es sesión PWA
  const isPWA = useMemo(() => {
    return localStorage.getItem(STORAGE_KEYS.STAFF_IS_PWA) === 'true';
  }, []);

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
    // Intervalos diferenciados según tipo de sesión
    const REFRESH_INTERVAL = isPWA ? PWA_REFRESH_INTERVAL : WEB_REFRESH_INTERVAL;
    const AUTO_REFRESH_THRESHOLD = isPWA ? PWA_AUTO_REFRESH_THRESHOLD : WEB_AUTO_REFRESH_THRESHOLD;
    
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

        // Renovar automáticamente si queda menos del threshold (silencioso)
        if (timeUntilExpiry < AUTO_REFRESH_THRESHOLD) {
          // Para PWA: siempre renovar silenciosamente, sin modal
          if (isPWA) {
            console.log('PWA: Token próximo a expirar, renovando silenciosamente...');
            await refreshToken(true);
            return;
          }
          
          // Para web: renovar silenciosamente si queda más de 5 min
          if (timeUntilExpiry > WEB_EXPIRY_WARNING) {
            console.log('Web: Token próximo a expirar, renovando automáticamente...');
            const success = await refreshToken(true);
            if (!success) {
              console.warn('Renovación automática falló, se mostrará modal pronto');
            }
            return;
          }

          // Web: Fallback - mostrar modal si queda menos de 5 minutos
          if (timeUntilExpiry > 0) {
            console.log('Sesión próxima a expirar, mostrando modal');
            setShowExpiryModal(true);
            return;
          }
        }
      } catch (error) {
        console.error('Error en keep-alive:', error);
      }
    };

    checkAndRefresh();
    const intervalId = setInterval(checkAndRefresh, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [handleForceLogout, refreshToken, isPWA]);

  return {
    showExpiryModal,
    handleStayActive,
    handleForceLogout
  };
}
