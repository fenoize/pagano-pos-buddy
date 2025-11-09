import { ReactNode } from 'react';
import { CustomerSplashScreen } from './CustomerSplashScreen';
import { useCustomerAppBootstrap } from '@/hooks/useCustomerAppBootstrap';

interface CustomerAppWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper para la app de cliente que muestra el splash screen
 * durante la carga inicial de datos críticos.
 */
export function CustomerAppWrapper({ children }: CustomerAppWrapperProps) {
  const { isLoading } = useCustomerAppBootstrap();

  return (
    <>
      <CustomerSplashScreen isLoading={isLoading} />
      <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}>
        {children}
      </div>
    </>
  );
}
