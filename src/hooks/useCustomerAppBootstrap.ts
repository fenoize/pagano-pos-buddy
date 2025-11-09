import { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useCustomerLevel } from '@/hooks/useCustomerLevel';

/**
 * Hook que maneja la carga inicial de la app cliente.
 * Retorna isLoading = true mientras se verifican:
 * - Estado de autenticación
 * - Datos del cliente
 * - Nivel del cliente
 * 
 * Sin delays artificiales - se oculta apenas todo está listo.
 */
export function useCustomerAppBootstrap() {
  const { user, customer, loading: authLoading } = useCustomerAuth();
  const { data: customerLevel, isLoading: levelLoading } = useCustomerLevel(customer?.id);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    // Verificar si todos los datos críticos están listos
    const isReady = 
      !authLoading && // Auth verificada
      !levelLoading && // Nivel cargado (o no hay cliente)
      (user === null || (user && customer)); // Si hay user, debe haber customer

    if (isReady) {
      setIsBootstrapping(false);
    }
  }, [authLoading, levelLoading, user, customer]);

  return {
    isLoading: isBootstrapping,
    user,
    customer,
    customerLevel,
  };
}
