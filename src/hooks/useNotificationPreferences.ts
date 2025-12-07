import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import type { NotificationPreferences } from '@/types/notifications';

export function useNotificationPreferences() {
  const { customer } = useCustomerAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    if (!customer?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (error) throw error;
      setPreferences(data as NotificationPreferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!customer?.id) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customer.id)
        .select()
        .single();

      if (error) throw error;
      setPreferences(data as NotificationPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const markAsSubscribed = async () => {
    return updatePreferences({ onesignal_subscribed: true });
  };

  const markPermissionPrompted = async () => {
    return updatePreferences({ permission_prompted_at: new Date().toISOString() });
  };

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    markAsSubscribed,
    markPermissionPrompted,
    refetch: fetchPreferences
  };
}
