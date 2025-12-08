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

/**
 * Perform the actual initialization
 * Uses the main sw.js which includes OneSignal SDK
 */
function doInit(appId: string, resolve: (value: boolean) => void) {
  window.OneSignalDeferred!.push(async function(OneSignal: any) {
    try {
      console.log('[OneSignal] Starting initialization with appId:', appId);
      
      // Initialize using the main service worker (sw.js) which imports OneSignal SDK
      // This avoids conflicts between PWA SW and OneSignal SW
      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        // Use the main sw.js which imports OneSignal SDK
        serviceWorkerPath: '/sw.js',
        serviceWorkerParam: { scope: '/' },
        // Disable automatic prompts - we use custom banner
        promptOptions: {
          autoPrompt: false
        },
        notifyButton: {
          enable: false,
        },
        welcomeNotification: {
          disable: true,
        }
      });
      
      isInitialized = true;
      console.log('[OneSignal] ✅ SDK initialized successfully');
      
      // Log current subscription state
      const pushSub = OneSignal.User?.PushSubscription;
      if (pushSub) {
        console.log('[OneSignal] optedIn:', pushSub.optedIn);
        console.log('[OneSignal] subscription ID:', pushSub.id || 'none');
      }
      
      resolve(true);
    } catch (error) {
      console.error('[OneSignal] ❌ Initialization failed:', error);
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
    // Small delay to avoid race conditions with login()
    await new Promise(resolve => setTimeout(resolve, 300));
    await window.OneSignal.User.addTags(tags);
    console.log('[OneSignal] Tags set:', tags);
  } catch (error: any) {
    // 409 Conflict errors are expected with concurrent operations - ignore silently
    if (error?.status === 409 || error?.message?.includes('409') || error?.message?.includes('Conflict')) {
      console.log('[OneSignal] Tags conflict (409), already being set - ignoring');
      return;
    }
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
 * Returns true if permission was granted and subscription was created
 * 
 * IMPORTANT: In SDK v16, the order matters:
 * 1. First request permission via Notifications.requestPermission()
 * 2. Then optIn() to create the push subscription
 * 3. The subscription will be linked to whatever external_id was set via login()
 */
export async function promptForPushPermission(): Promise<boolean> {
  if (!window.OneSignal || !isInitialized) {
    console.warn('[OneSignal] Not initialized, cannot prompt for permission');
    return false;
  }

  try {
    // Check current permission
    const currentPermission = await window.OneSignal.Notifications.permission;
    console.log('[OneSignal] Current permission:', currentPermission);
    
    if (currentPermission === true) {
      console.log('[OneSignal] Already has permission, ensuring subscription is active');
      await ensurePushSubscription();
      return true;
    }

    // Request permission using Notifications.requestPermission
    console.log('[OneSignal] Requesting permission...');
    await window.OneSignal.Notifications.requestPermission();
    
    // Check result
    const newPermission = await window.OneSignal.Notifications.permission;
    console.log('[OneSignal] Permission result:', newPermission);
    
    if (newPermission === true) {
      // After permission granted, explicitly opt-in to create the push subscription
      // This MUST happen after login() was called for the external_id to be linked
      console.log('[OneSignal] Permission granted, creating subscription...');
      await ensurePushSubscription();
      
      // Wait a moment for the subscription to be registered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify subscription was created
      const pushSub = window.OneSignal.User?.PushSubscription;
      if (pushSub?.id) {
        console.log('[OneSignal] ✅ Subscription created with ID:', pushSub.id);
      } else {
        console.warn('[OneSignal] ⚠️ Subscription may not be fully registered yet');
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[OneSignal] Error requesting permission:', error);
    return false;
  }
}

/**
 * Ensure push subscription is active by calling optIn()
 * This is required in SDK v16 to create the actual subscription after permission is granted
 */
async function ensurePushSubscription(): Promise<void> {
  if (!window.OneSignal) return;
  
  try {
    // In SDK v16, User.PushSubscription.optIn() creates/activates the subscription
    const pushSub = window.OneSignal.User?.PushSubscription;
    if (pushSub) {
      // Check if already opted in
      const optedIn = pushSub.optedIn;
      console.log('[OneSignal] Current optedIn status:', optedIn);
      
      if (!optedIn) {
        console.log('[OneSignal] Calling optIn() to create subscription...');
        await pushSub.optIn();
        console.log('[OneSignal] ✅ optIn() completed - subscription created');
      }
      
      // Log subscription ID for debugging
      const subId = pushSub.id;
      if (subId) {
        console.log('[OneSignal] ✅ PushSubscription activa, ID:', subId);
      } else {
        console.warn('[OneSignal] ⚠️ No subscription ID yet');
      }
    }
  } catch (error) {
    console.error('[OneSignal] ❌ Error ensuring push subscription:', error);
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
    
    // In SDK v16, check optedIn status and subscription id
    const optedIn = pushSubscription?.optedIn ?? false;
    const subscriptionId = pushSubscription?.id || null;
    
    console.log('[OneSignal] getSubscriptionState:', { isPushEnabled, optedIn, subscriptionId });
    
    return {
      isSubscribed: isPushEnabled && optedIn && !!subscriptionId,
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
