import { ReactNode } from 'react';
import { CustomerSplashScreen } from './CustomerSplashScreen';
import { NotificationPermissionBanner } from './NotificationPermissionBanner';
import { useCustomerAppBootstrap } from '@/hooks/useCustomerAppBootstrap';
import { useCustomerOneSignal } from '@/hooks/useCustomerOneSignal';

interface CustomerAppWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper para la app de cliente que muestra el splash screen
 * durante la carga inicial de datos críticos y maneja OneSignal.
 */
export function CustomerAppWrapper({ children }: CustomerAppWrapperProps) {
  const { isLoading } = useCustomerAppBootstrap();
  const { showBanner, requestPermission, dismissBanner } = useCustomerOneSignal();

  return (
    <>
      <CustomerSplashScreen isLoading={isLoading} />
      <div className="customer-app" style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}>
        {children}
      </div>
      
      {/* OneSignal notification permission banner */}
      {!isLoading && showBanner && (
        <NotificationPermissionBanner
          onRequestPermission={requestPermission}
          onDismiss={dismissBanner}
        />
      )}
    </>
  );
}
