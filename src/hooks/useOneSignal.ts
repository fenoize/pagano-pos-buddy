import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  initOneSignal,
  setExternalUserId,
  logoutOneSignal,
  promptForPushPermission,
  isPushPermissionGranted,
  isPushSupported,
  getSubscriptionState
} from '@/lib/onesignal';

export function useOneSignal() {
  const { customer } = useCustomerAuth();
  const [initialized, setInitialized] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

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
      console.error('Error fetching OneSignal config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize OneSignal when config is ready
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Initialize SDK when appId is available
  useEffect(() => {
    if (!appId || !isEnabled || initialized) return;

    const init = async () => {
      const success = await initOneSignal(appId);
      setInitialized(success);
      
      if (success) {
        const state = await getSubscriptionState();
        setIsSubscribed(state.isSubscribed);
      }
    };

    init();
  }, [appId, isEnabled, initialized]);

  // Set external user ID when customer logs in
  useEffect(() => {
    if (!initialized || !customer?.id) return;

    setExternalUserId(customer.id);
  }, [initialized, customer?.id]);

  // Logout from OneSignal when customer logs out
  const logout = useCallback(async () => {
    await logoutOneSignal();
    setIsSubscribed(false);
  }, []);

  // Request push permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!initialized) {
      console.warn('OneSignal not initialized');
      return false;
    }

    const granted = await promptForPushPermission();
    
    if (granted) {
      setIsSubscribed(true);
      
      // Update preferences in database
      if (customer?.id) {
        try {
          await supabase
            .from('notification_preferences')
            .update({ 
              onesignal_subscribed: true,
              permission_prompted_at: new Date().toISOString()
            })
            .eq('customer_id', customer.id);
        } catch (error) {
          console.error('Error updating subscription status:', error);
        }
      }
    }

    return granted;
  }, [initialized, customer?.id]);

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
    isPushSupported: isPushSupported(),
    requestPermission,
    checkPermission,
    logout
  };
}
