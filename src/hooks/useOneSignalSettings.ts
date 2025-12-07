import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OneSignalSettings, GlobalNotificationSettings } from '@/types/notifications';

export function useOneSignalSettings() {
  const [settings, setSettings] = useState<OneSignalSettings>({
    app_id: '',
    web_site_name: '',
    enabled: false
  });
  const [globalSettings, setGlobalSettings] = useState<GlobalNotificationSettings>({
    notify_client_order_status: true,
    notify_client_delivery_assigned: true,
    notify_client_runas_earned: true,
    notify_rider_new_order: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', [
          'onesignal_app_id',
          'onesignal_web_site_name',
          'onesignal_enabled',
          'notify_client_order_status',
          'notify_client_delivery_assigned',
          'notify_client_runas_earned',
          'notify_rider_new_order'
        ]);

      if (error) throw error;

      const configMap: Record<string, any> = {};
      data?.forEach(row => {
        let value = row.value;
        if (typeof value === 'string') {
          // Remove surrounding quotes if present
          value = value.replace(/^"|"$/g, '');
          // Parse boolean strings
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
        }
        configMap[row.key] = value;
      });

      setSettings({
        app_id: configMap['onesignal_app_id'] || '',
        web_site_name: configMap['onesignal_web_site_name'] || '',
        enabled: configMap['onesignal_enabled'] === true
      });

      setGlobalSettings({
        notify_client_order_status: configMap['notify_client_order_status'] !== false,
        notify_client_delivery_assigned: configMap['notify_client_delivery_assigned'] !== false,
        notify_client_runas_earned: configMap['notify_client_runas_earned'] !== false,
        notify_rider_new_order: configMap['notify_rider_new_order'] !== false
      });
    } catch (error) {
      console.error('Error fetching OneSignal settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveOneSignalSettings = async (newSettings: OneSignalSettings) => {
    setSaving(true);
    try {
      const updates = [
        { key: 'onesignal_app_id', value: JSON.stringify(newSettings.app_id) },
        { key: 'onesignal_web_site_name', value: JSON.stringify(newSettings.web_site_name) },
        { key: 'onesignal_enabled', value: JSON.stringify(newSettings.enabled) }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('config')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      setSettings(newSettings);
      toast.success('Configuración de OneSignal guardada');
    } catch (error) {
      console.error('Error saving OneSignal settings:', error);
      toast.error('Error al guardar configuración');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveGlobalSettings = async (newSettings: GlobalNotificationSettings) => {
    setSaving(true);
    try {
      const updates = [
        { key: 'notify_client_order_status', value: JSON.stringify(newSettings.notify_client_order_status) },
        { key: 'notify_client_delivery_assigned', value: JSON.stringify(newSettings.notify_client_delivery_assigned) },
        { key: 'notify_client_runas_earned', value: JSON.stringify(newSettings.notify_client_runas_earned) },
        { key: 'notify_rider_new_order', value: JSON.stringify(newSettings.notify_rider_new_order) }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('config')
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq('key', update.key);

        if (error) throw error;
      }

      setGlobalSettings(newSettings);
      toast.success('Configuración de notificaciones guardada');
    } catch (error) {
      console.error('Error saving global notification settings:', error);
      toast.error('Error al guardar configuración');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    globalSettings,
    loading,
    saving,
    saveOneSignalSettings,
    saveGlobalSettings,
    refetch: fetchSettings
  };
}
