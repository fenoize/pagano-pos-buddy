// OneSignal Web SDK Integration for Paganos Customer App
// Documentation: https://documentation.onesignal.com/docs/web-push-sdk

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Check if we're in a customer app context (not POS/admin)
 */
export function isCustomerAppContext(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  // Only load in customer routes - NOT in /pos, /login (staff), /admin
  return !path.startsWith('/pos') && path !== '/login';
}

/**
 * Initialize OneSignal SDK with the provided App ID
 * Should be called once when the customer app loads
 */
export async function initOneSignal(appId: string): Promise<boolean> {
  // Don't initialize in POS/admin context
  if (!isCustomerAppContext()) {
    console.log('[OneSignal] Skipping initialization - not in customer app context');
    return false;
  }

  if (!appId) {
    console.log('[OneSignal] No appId provided');
    return false;
  }

  if (isInitialized) {
    console.log('[OneSignal] Already initialized');
    return true;
  }

  // Return existing promise if initialization is in progress
  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve) => {
    try {
      // Check if push is supported
      if (!isPushSupported()) {
        console.log('[OneSignal] Push notifications not supported in this browser');
        resolve(false);
        return;
      }

      // Initialize the deferred array
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      
      // Check if script already loaded
      const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
      if (existingScript) {
        console.log('[OneSignal] Script already loaded, using existing');
        doInit(appId, resolve);
        return;
      }

      // Load OneSignal SDK script
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      
      script.onload = () => {
        doInit(appId, resolve);
      };
      
      script.onerror = () => {
        console.error('[OneSignal] Failed to load SDK script');
        initPromise = null;
        resolve(false);
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.error('[OneSignal] Error initializing:', error);
      initPromise = null;
      resolve(false);
    }
  });

  return initPromise;
}

function doInit(appId: string, resolve: (value: boolean) => void) {
  window.OneSignalDeferred!.push(async function(OneSignal: any) {
    try {
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        // Service worker is in public/
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        // Disable native prompt - we use our own custom banner
        promptOptions: {
          autoPrompt: false,
          slidedown: {
            prompts: [] // Disable slidedown prompts
          }
        },
        notifyButton: {
          enable: false, // Disable floating bell button
        },
        welcomeNotification: {
          disable: true, // Disable welcome notification
        }
      });
      
      isInitialized = true;
      console.log('[OneSignal] Initialized successfully');
      resolve(true);
    } catch (error) {
      console.error('[OneSignal] Initialization failed:', error);
      initPromise = null;
      resolve(false);
    }
  });
}

/**
 * Set the external user ID to associate push subscriptions with our customer ID
 */
export async function setExternalUserId(userId: string): Promise<void> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('[OneSignal] Not initialized, cannot set external user ID');
    return;
  }

  try {
    await window.OneSignal.login(userId);
    console.log('[OneSignal] External user ID set:', userId);
  } catch (error) {
    console.error('[OneSignal] Error setting external user ID:', error);
  }
}

/**
 * Set tags for user segmentation
 */
export async function setUserTags(tags: Record<string, string | number | boolean>): Promise<void> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('[OneSignal] Not initialized, cannot set tags');
    return;
  }

  try {
    await window.OneSignal.User.addTags(tags);
    console.log('[OneSignal] Tags set:', tags);
  } catch (error) {
    console.error('[OneSignal] Error setting tags:', error);
  }
}

/**
 * Remove the external user ID (logout from OneSignal)
 */
export async function removeExternalUserId(): Promise<void> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('[OneSignal] Not initialized, cannot remove external user ID');
    return;
  }

  try {
    await window.OneSignal.logout();
    console.log('[OneSignal] External user ID removed (logged out)');
  } catch (error) {
    console.error('[OneSignal] Error removing external user ID:', error);
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
    console.warn('[OneSignal] Not initialized, cannot prompt for permission');
    return false;
  }

  try {
    // Check current permission
    const currentPermission = await window.OneSignal.Notifications.permission;
    
    if (currentPermission === true) {
      console.log('[OneSignal] Already has permission');
      return true;
    }

    // Request permission
    await window.OneSignal.Notifications.requestPermission();
    
    // Check result
    const newPermission = await window.OneSignal.Notifications.permission;
    console.log('[OneSignal] Permission result:', newPermission);
    
    return newPermission === true;
  } catch (error) {
    console.error('[OneSignal] Error requesting permission:', error);
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
    const permission = await window.OneSignal.Notifications.permission;
    return permission === true;
  } catch (error) {
    console.error('[OneSignal] Error checking permission:', error);
    return false;
  }
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
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
    const pushSubscription = window.OneSignal.User?.PushSubscription;
    const subscriptionId = pushSubscription?.id || null;
    
    return {
      isSubscribed: isPushEnabled && !!subscriptionId,
      isPushEnabled: isPushEnabled === true,
      userId: subscriptionId
    };
  } catch (error) {
    console.error('[OneSignal] Error getting subscription state:', error);
    return { isSubscribed: false, isPushEnabled: false, userId: null };
  }
}

/**
 * Check if OneSignal is initialized
 */
export function isOneSignalInitialized(): boolean {
  return isInitialized;
}
