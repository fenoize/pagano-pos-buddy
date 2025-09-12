import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KDSConfig {
  timeGreen: number;
  timeYellow: number;
  timeRed: number;
  columns: number;
  cardSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
}

const defaultConfig: KDSConfig = {
  timeGreen: 10,
  timeYellow: 15,
  timeRed: 20,
  columns: 3,
  cardSize: 'medium',
  soundEnabled: true,
};

export function useKitchenConfig() {
  const [config, setConfig] = useState<KDSConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('key, value')
        .in('key', [
          'kds_time_green',
          'kds_time_yellow', 
          'kds_time_red',
          'kds_columns',
          'kds_card_size',
          'kds_sound_enabled'
        ]);

      if (error) throw error;

      if (data) {
        const configMap = data.reduce((acc, item) => {
          acc[item.key] = item.value;
          return acc;
        }, {} as Record<string, any>);

        setConfig({
          timeGreen: configMap.kds_time_green ?? defaultConfig.timeGreen,
          timeYellow: configMap.kds_time_yellow ?? defaultConfig.timeYellow,
          timeRed: configMap.kds_time_red ?? defaultConfig.timeRed,
          columns: configMap.kds_columns ?? defaultConfig.columns,
          cardSize: configMap.kds_card_size ?? defaultConfig.cardSize,
          soundEnabled: configMap.kds_sound_enabled ?? defaultConfig.soundEnabled,
        });
      }
    } catch (error) {
      console.error('Error fetching KDS config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<KDSConfig>) => {
    const updates = [];
    
    if (newConfig.timeGreen !== undefined) {
      updates.push({ key: 'kds_time_green', value: newConfig.timeGreen });
    }
    if (newConfig.timeYellow !== undefined) {
      updates.push({ key: 'kds_time_yellow', value: newConfig.timeYellow });
    }
    if (newConfig.timeRed !== undefined) {
      updates.push({ key: 'kds_time_red', value: newConfig.timeRed });
    }
    if (newConfig.columns !== undefined) {
      updates.push({ key: 'kds_columns', value: newConfig.columns });
    }
    if (newConfig.cardSize !== undefined) {
      updates.push({ key: 'kds_card_size', value: newConfig.cardSize });
    }
    if (newConfig.soundEnabled !== undefined) {
      updates.push({ key: 'kds_sound_enabled', value: newConfig.soundEnabled });
    }

    try {
      for (const update of updates) {
        await supabase
          .from('config')
          .upsert(update);
      }

      setConfig(prev => ({ ...prev, ...newConfig }));
    } catch (error) {
      console.error('Error updating KDS config:', error);
    }
  };

  return {
    config,
    loading,
    updateConfig,
  };
}