import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutos
const EXPIRY_WARNING = 5 * 60 * 1000; // Mostrar modal si expira en <5 minutos

export function useSessionKeepAlive() {
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const handleStayActive = async () => {
    setShowExpiryModal(false);
    const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
    
    if (!token) return;
    
    try {
      const { data: refreshData, error: refreshError } = await supabase
        .rpc('refresh_staff_token', { _token: token });
      
      if (refreshError || !refreshData || refreshData.length === 0) {
        console.error('Error al renovar token:', refreshError);
        handleForceLogout(); // Si falla, cerrar sesión
        return;
      }
      
      const newToken = refreshData[0].new_token;
      localStorage.setItem(STORAGE_KEYS.STAFF_TOKEN, newToken);
      
      toast({
        title: "Sesión renovada",
        description: "Tu sesión ha sido extendida exitosamente.",
      });
      
      console.log('Token renovado manualmente, expira:', refreshData[0].expires_at);
    } catch (error) {
      console.error('Error renovando sesión:', error);
      handleForceLogout();
    }
  };

  const handleForceLogout = () => {
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
  };

  useEffect(() => {
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
          // Token inválido - cerrar sesión directamente (no se puede renovar)
          console.log('Token inválido detectado, cerrando sesión');
          handleForceLogout();
          return;
        }

        const expiresAt = new Date(tokenData.expires_at);
        const timeUntilExpiry = expiresAt.getTime() - Date.now();

        // Mostrar modal solo si el token es válido pero expira en menos de 5 minutos
        if (timeUntilExpiry < EXPIRY_WARNING && timeUntilExpiry > 0) {
          console.log('Sesión próxima a expirar, mostrando modal');
          setShowExpiryModal(true);
          return;
        }

        // Si el token expiró, cerrar sesión directamente
        if (timeUntilExpiry <= 0) {
          console.log('Token expirado, cerrando sesión');
          handleForceLogout();
          return;
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

  return {
    showExpiryModal,
    handleStayActive,
    handleForceLogout
  };
}
