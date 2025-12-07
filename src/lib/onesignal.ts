// OneSignal Web SDK Integration for Paganos POS
// Documentation: https://documentation.onesignal.com/docs/web-push-sdk

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

let isInitialized = false;

/**
 * Initialize OneSignal SDK with the provided App ID
 * Should be called once when the app loads
 */
export async function initOneSignal(appId: string): Promise<boolean> {
  if (!appId || isInitialized) {
    console.log('OneSignal: Already initialized or no appId provided');
    return isInitialized;
  }

  return new Promise((resolve) => {
    try {
      // Load OneSignal SDK script
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.onload = () => {
        window.OneSignalDeferred!.push(async function(OneSignal: any) {
          try {
            await OneSignal.init({
              appId: appId,
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerParam: { scope: '/push/onesignal/' },
              serviceWorkerPath: '/push/onesignal/OneSignalSDKWorker.js',
              notifyButton: {
                enable: false,
              },
              welcomeNotification: {
                disable: true,
              }
            });
            
            isInitialized = true;
            console.log('OneSignal: Initialized successfully');
            resolve(true);
          } catch (error) {
            console.error('OneSignal: Initialization failed', error);
            resolve(false);
          }
        });
      };
      
      script.onerror = () => {
        console.error('OneSignal: Failed to load SDK script');
        resolve(false);
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('OneSignal: Error initializing', error);
      resolve(false);
    }
  });
}

/**
 * Set the external user ID to associate push subscriptions with our user ID
 */
export async function setExternalUserId(userId: string): Promise<void> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('OneSignal: Not initialized, cannot set external user ID');
    return;
  }

  try {
    await window.OneSignal.login(userId);
    console.log('OneSignal: External user ID set:', userId);
  } catch (error) {
    console.error('OneSignal: Error setting external user ID', error);
  }
}

/**
 * Remove the external user ID (logout from OneSignal)
 */
export async function removeExternalUserId(): Promise<void> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('OneSignal: Not initialized, cannot remove external user ID');
    return;
  }

  try {
    await window.OneSignal.logout();
    console.log('OneSignal: External user ID removed (logged out)');
  } catch (error) {
    console.error('OneSignal: Error removing external user ID', error);
  }
}

/**
 * Logout the current user from OneSignal (alias for removeExternalUserId)
 */
export async function logoutOneSignal(): Promise<void> {
  return removeExternalUserId();
}

/**
 * Prompt the user for push notification permission
 * Returns true if permission was granted
 */
export async function promptForPushPermission(): Promise<boolean> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('OneSignal: Not initialized, cannot prompt for permission');
    return false;
  }

  try {
    const permission = await window.OneSignal.Notifications.permission;
    
    if (permission) {
      console.log('OneSignal: Already has permission');
      return true;
    }

    await window.OneSignal.Notifications.requestPermission();
    
    const newPermission = await window.OneSignal.Notifications.permission;
    console.log('OneSignal: Permission result:', newPermission);
    
    return newPermission === true;
  } catch (error) {
    console.error('OneSignal: Error requesting permission', error);
    return false;
  }
}

/**
 * Check if the user has granted push notification permission
 */
export async function isPushPermissionGranted(): Promise<boolean> {
  if (!window.OneSignal || !isInitialized) {
    return false;
  }

  try {
    return await window.OneSignal.Notifications.permission;
  } catch (error) {
    console.error('OneSignal: Error checking permission', error);
    return false;
  }
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get the current subscription state
 */
export async function getSubscriptionState(): Promise<{
  isSubscribed: boolean;
  isPushEnabled: boolean;
  userId: string | null;
}> {
  if (!window.OneSignal || !isInitialized) {
    return { isSubscribed: false, isPushEnabled: false, userId: null };
  }

  try {
    const isPushEnabled = await window.OneSignal.Notifications.permission;
    const userId = await window.OneSignal.User?.PushSubscription?.id || null;
    
    return {
      isSubscribed: isPushEnabled && !!userId,
      isPushEnabled,
      userId
    };
  } catch (error) {
    console.error('OneSignal: Error getting subscription state', error);
    return { isSubscribed: false, isPushEnabled: false, userId: null };
  }
}
