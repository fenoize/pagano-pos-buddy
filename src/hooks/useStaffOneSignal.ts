import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

const BANNER_DISMISSED_KEY = 'paganos_staff_notification_banner_dismissed';
const PERMISSION_ASKED_KEY = 'paganos_staff_notification_permission_asked';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

let isStaffInitialized = false;
let staffInitPromise: Promise<boolean> | null = null;

/**
 * Check if we're in staff/POS context
 */
function isStaffAppContext(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.startsWith('/pos');
}

/**
 * Check if push notifications are supported
 */
function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function useStaffOneSignal() {
  const { user } = useAuthContext();
  const [initialized, setInitialized] = useState(false);
  const [userLinked, setUserLinked] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const initRef = useRef(false);

  // Check if we should show the banner
  const checkShouldShowBanner = useCallback(async () => {
    if (!isStaffAppContext()) return false;
    if (!isPushSupported()) return false;

    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed === 'true') return false;

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      return false;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return false;
    }

    return true;
  }, []);

  // Fetch OneSignal config
  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', ['onesignal_app_id', 'onesignal_enabled']);

      if (error) throw error;

      const config: Record<string, any> = {};
      data?.forEach(row => {
        let value = row.value;
        if (typeof value === 'string') {
          value = value.replace(/^"|"$/g, '');
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
        }
        config[row.key] = value;
      });

      setAppId(config['onesignal_app_id'] || null);
      setIsEnabled(config['onesignal_enabled'] === true);
    } catch (error) {
      console.error('[useStaffOneSignal] Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Initialize SDK when appId is available
  useEffect(() => {
    if (!appId || !isEnabled || isStaffInitialized || initRef.current) return;
    if (!isStaffAppContext()) {
      setLoading(false);
      return;
    }

    initRef.current = true;

    const init = async () => {
      const success = await initStaffOneSignal(appId);
      setInitialized(success);
      isStaffInitialized = success;

      if (success) {
        const state = await getStaffSubscriptionState();
        setIsSubscribed(state.isSubscribed);
      }
    };

    init();
  }, [appId, isEnabled]);

  // Link user when they log in (MUST happen BEFORE optIn)
  useEffect(() => {
    if (!initialized || !user?.id) {
      setUserLinked(false);
      return;
    }

    const setupUser = async () => {
      console.log('[useStaffOneSignal] Setting up staff user:', user.id);
      
      // Login with staff_ prefix to differentiate from customers
      const externalId = `staff_${user.id}`;
      await setStaffExternalUserId(externalId);
      console.log('[useStaffOneSignal] ✅ Staff linked to OneSignal:', externalId);
      setUserLinked(true);

      // Set tags for segmentation
      await setStaffUserTags({
        role: user.role || 'staff',
        platform: 'web_pwa_pos',
        staff_name: user.full_name || user.username || '',
        is_staff: 'true',
      });

      // Update subscription state
      const state = await getStaffSubscriptionState();
      console.log('[useStaffOneSignal] Subscription state:', state);
      setIsSubscribed(state.isSubscribed);

      // Check if we should show banner
      const shouldShow = await checkShouldShowBanner();
      setShowBanner(shouldShow && !state.isSubscribed);
    };

    setupUser();
  }, [initialized, user?.id, user?.role, user?.full_name, user?.username, checkShouldShowBanner]);

  // Logout from OneSignal
  const logout = useCallback(async () => {
    if (!window.OneSignal || !isStaffInitialized) return;
    
    try {
      await window.OneSignal.logout();
      console.log('[useStaffOneSignal] Logged out from OneSignal');
      setIsSubscribed(false);
      setUserLinked(false);
    } catch (error) {
      console.error('[useStaffOneSignal] Error logging out:', error);
    }
  }, []);

  // Request push permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!initialized) {
      console.warn('[useStaffOneSignal] Not initialized');
      return false;
    }

    if (!userLinked || !user?.id) {
      console.warn('[useStaffOneSignal] User not linked yet');
      return false;
    }

    console.log('[useStaffOneSignal] Requesting push permission for staff:', user.id);
    
    try {
      // Request permission
      await window.OneSignal.Notifications.requestPermission();
      
      localStorage.setItem(PERMISSION_ASKED_KEY, 'true');

      const permission = await window.OneSignal.Notifications.permission;
      
      if (permission === true) {
        console.log('[useStaffOneSignal] ✅ Permission granted!');
        
        // Opt in to create subscription
        const pushSub = window.OneSignal.User?.PushSubscription;
        if (pushSub && !pushSub.optedIn) {
          await pushSub.optIn();
          console.log('[useStaffOneSignal] ✅ Opted in to push');
        }

        setIsSubscribed(true);
        setShowBanner(false);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[useStaffOneSignal] Error requesting permission:', error);
      return false;
    }
  }, [initialized, userLinked, user?.id]);

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setShowBanner(false);
  }, []);

  return {
    initialized,
    isEnabled,
    isSubscribed,
    loading,
    showBanner,
    isPushSupported: isPushSupported(),
    requestPermission,
    dismissBanner,
    logout
  };
}

// ========== Helper functions ==========

async function initStaffOneSignal(appId: string): Promise<boolean> {
  if (!isStaffAppContext()) {
    console.log('[StaffOneSignal] Skipping - not in POS context');
    return false;
  }

  if (!appId) {
    console.log('[StaffOneSignal] No appId provided');
    return false;
  }

  if (isStaffInitialized) {
    console.log('[StaffOneSignal] Already initialized');
    return true;
  }

  if (staffInitPromise) {
    return staffInitPromise;
  }

  staffInitPromise = new Promise((resolve) => {
    try {
      if (!isPushSupported()) {
        console.log('[StaffOneSignal] Push not supported');
        resolve(false);
        return;
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];

      const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
      if (existingScript) {
        console.log('[StaffOneSignal] Script already loaded');
        doStaffInit(appId, resolve);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;

      script.onload = () => doStaffInit(appId, resolve);
      script.onerror = () => {
        console.error('[StaffOneSignal] Failed to load SDK');
        staffInitPromise = null;
        resolve(false);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('[StaffOneSignal] Error:', error);
      staffInitPromise = null;
      resolve(false);
    }
  });

  return staffInitPromise;
}

function doStaffInit(appId: string, resolve: (value: boolean) => void) {
  window.OneSignalDeferred!.push(async function(OneSignal: any) {
    try {
      console.log('[StaffOneSignal] Initializing with appId:', appId);

      await OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true,
        // Use POS service worker
        serviceWorkerPath: '/sw-pos.js',
        serviceWorkerParam: { scope: '/pos/' },
        promptOptions: { autoPrompt: false },
        notifyButton: { enable: false },
        welcomeNotification: { disable: true }
      });

      console.log('[StaffOneSignal] ✅ Initialized successfully');
      resolve(true);
    } catch (error) {
      console.error('[StaffOneSignal] ❌ Init failed:', error);
      staffInitPromise = null;
      resolve(false);
    }
  });
}

async function setStaffExternalUserId(userId: string): Promise<void> {
  if (!window.OneSignal || !isStaffInitialized) return;

  try {
    await window.OneSignal.login(userId);
    console.log('[StaffOneSignal] External ID set:', userId);
  } catch (error) {
    console.error('[StaffOneSignal] Error setting external ID:', error);
  }
}

async function setStaffUserTags(tags: Record<string, string>): Promise<void> {
  if (!window.OneSignal || !isStaffInitialized) return;

  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    await window.OneSignal.User.addTags(tags);
    console.log('[StaffOneSignal] Tags set:', tags);
  } catch (error: any) {
    if (error?.status === 409 || error?.message?.includes('409')) {
      console.log('[StaffOneSignal] Tags conflict, ignoring');
      return;
    }
    console.error('[StaffOneSignal] Error setting tags:', error);
  }
}

async function getStaffSubscriptionState(): Promise<{
  isSubscribed: boolean;
  isPushEnabled: boolean;
}> {
  if (!window.OneSignal || !isStaffInitialized) {
    return { isSubscribed: false, isPushEnabled: false };
  }

  try {
    const isPushEnabled = await window.OneSignal.Notifications.permission;
    const pushSubscription = window.OneSignal.User?.PushSubscription;
    const optedIn = pushSubscription?.optedIn ?? false;
    const subscriptionId = pushSubscription?.id || null;

    return {
      isSubscribed: isPushEnabled && optedIn && !!subscriptionId,
      isPushEnabled: isPushEnabled === true
    };
  } catch (error) {
    console.error('[StaffOneSignal] Error getting state:', error);
    return { isSubscribed: false, isPushEnabled: false };
  }
}
