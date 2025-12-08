import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  initOneSignal,
  setExternalUserId,
  setUserTags,
  logoutOneSignal,
  promptForPushPermission,
  isPushPermissionGranted,
  isPushSupported,
  getSubscriptionState,
  isCustomerAppContext
} from '@/lib/onesignal';

const BANNER_DISMISSED_KEY = 'paganos_notification_banner_dismissed';
const PERMISSION_ASKED_KEY = 'paganos_notification_permission_asked';

export function useCustomerOneSignal() {
  const { customer } = useCustomerAuth();
  const [initialized, setInitialized] = useState(false);
  const [userLinked, setUserLinked] = useState(false); // Track if external_id is set
  const [appId, setAppId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const initRef = useRef(false);

  // Check if we should show the banner
  const checkShouldShowBanner = useCallback(async () => {
    // Only show in customer app context
    if (!isCustomerAppContext()) {
      return false;
    }

    // Check if push is supported
    if (!isPushSupported()) {
      return false;
    }

    // Check if user already dismissed the banner
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed === 'true') {
      return false;
    }

    // Check if already granted permission
    const permission = await isPushPermissionGranted();
    if (permission) {
      return false;
    }

    // Check if already asked (Notification.permission !== 'default')
    if (typeof Notification !== 'undefined' && Notification.permission !== 'default') {
      return false;
    }

    return true;
  }, []);

  // Fetch OneSignal config from database
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
      console.error('[useCustomerOneSignal] Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize OneSignal when config is ready
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Initialize SDK when appId is available and in customer context
  useEffect(() => {
    if (!appId || !isEnabled || initialized || initRef.current) return;
    
    // Only initialize in customer app context
    if (!isCustomerAppContext()) {
      setLoading(false);
      return;
    }

    initRef.current = true;

    const init = async () => {
      const success = await initOneSignal(appId);
      setInitialized(success);
      
      if (success) {
        const state = await getSubscriptionState();
        setIsSubscribed(state.isSubscribed);
        // Don't show banner here - wait until user is linked in the next useEffect
      }
    };

    init();
  }, [appId, isEnabled, initialized]);

  // Set external user ID and tags when customer logs in
  // IMPORTANT: This MUST happen BEFORE optIn() for the subscription to be linked
  useEffect(() => {
    if (!initialized || !customer?.id) {
      setUserLinked(false);
      return;
    }

    const setupUser = async () => {
      console.log('[useCustomerOneSignal] Setting up user:', customer.id);
      
      // First, login to set the external_id
      await setExternalUserId(customer.id);
      console.log('[useCustomerOneSignal] ✅ User linked to OneSignal');
      setUserLinked(true);
      
      // Set user tags for segmentation
      await setUserTags({
        role: 'client',
        email: customer.email || '',
        platform: 'web_pwa',
        customer_name: customer.name || '',
      });

      // Update subscription status
      const state = await getSubscriptionState();
      console.log('[useCustomerOneSignal] Subscription state:', state);
      setIsSubscribed(state.isSubscribed);
      
      // Now check if we should show the banner (only after user is linked)
      const shouldShow = await checkShouldShowBanner();
      setShowBanner(shouldShow && !state.isSubscribed);
    };

    setupUser();
  }, [initialized, customer?.id, customer?.email, customer?.name, checkShouldShowBanner]);

  // Logout from OneSignal when customer logs out
  const logout = useCallback(async () => {
    await logoutOneSignal();
    setIsSubscribed(false);
  }, []);

  // Request push permission (called from banner)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!initialized) {
      console.warn('[useCustomerOneSignal] Not initialized');
      return false;
    }

    if (!userLinked || !customer?.id) {
      console.warn('[useCustomerOneSignal] User not linked yet, cannot request permission');
      return false;
    }

    console.log('[useCustomerOneSignal] Requesting push permission for user:', customer.id);
    const granted = await promptForPushPermission();
    
    // Mark as asked
    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    
    if (granted) {
      console.log('[useCustomerOneSignal] ✅ Permission granted!');
      setIsSubscribed(true);
      setShowBanner(false);
      
      // Update tags to mark as subscribed
      await setUserTags({
        notifications_enabled: true,
      });

      // Update preferences in database
      console.log('[useCustomerOneSignal] Updating notification_preferences for customer:', customer.id);
      try {
        const { error } = await supabase
          .from('notification_preferences')
          .upsert({ 
            customer_id: customer.id,
            onesignal_subscribed: true,
            permission_prompted_at: new Date().toISOString()
          }, { onConflict: 'customer_id' });
        
        if (error) {
          console.error('[useCustomerOneSignal] Error updating subscription status:', error);
        } else {
          console.log('[useCustomerOneSignal] ✅ notification_preferences updated successfully');
        }
      } catch (error) {
        console.error('[useCustomerOneSignal] Exception updating subscription status:', error);
      }
    } else {
      console.log('[useCustomerOneSignal] Permission denied or failed');
    }

    return granted;
  }, [initialized, userLinked, customer?.id]);

  // Dismiss the banner without requesting permission
  const dismissBanner = useCallback(() => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    setShowBanner(false);
  }, []);

  // Check current permission status
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!initialized) return false;
    return await isPushPermissionGranted();
  }, [initialized]);

  return {
    initialized,
    isEnabled,
    isSubscribed,
    loading,
    showBanner,
    isPushSupported: isPushSupported(),
    requestPermission,
    dismissBanner,
    checkPermission,
    logout
  };
}
