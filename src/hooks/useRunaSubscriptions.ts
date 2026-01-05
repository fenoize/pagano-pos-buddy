import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SubscriptionType = 'monthly' | 'weekly' | 'birthday';

export interface RunaSubscription {
  id: string;
  customer_id: string;
  subscription_type: SubscriptionType;
  runas_amount: number;
  is_active: boolean;
  next_execution_date: string | null;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface RunaAutoConfig {
  birthday_bonus: {
    enabled: boolean;
    runas_amount: number;
    message: string;
  };
  monthly_subscription: {
    default_runas: number;
    enabled: boolean;
  };
  weekly_subscription: {
    default_runas: number;
    enabled: boolean;
  };
}

export function useRunaSubscriptions(customerId?: string) {
  const [subscriptions, setSubscriptions] = useState<RunaSubscription[]>([]);
  const [config, setConfig] = useState<RunaAutoConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSubscriptions = useCallback(async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_runa_subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions((data || []) as RunaSubscription[]);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('runa_auto_config')
        .select('config_key, config_value');

      if (error) throw error;

      const configMap: Record<string, unknown> = {};
      data?.forEach((item: { config_key: string; config_value: unknown }) => {
        configMap[item.config_key] = item.config_value;
      });
      
      setConfig({
        birthday_bonus: configMap.birthday_bonus as RunaAutoConfig['birthday_bonus'],
        monthly_subscription: configMap.monthly_subscription as RunaAutoConfig['monthly_subscription'],
        weekly_subscription: configMap.weekly_subscription as RunaAutoConfig['weekly_subscription']
      });
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchConfig();
  }, [fetchSubscriptions, fetchConfig]);

  const createSubscription = async (
    type: SubscriptionType,
    runasAmount: number,
    notes?: string,
    startDate?: string | null,
    endDate?: string | null
  ): Promise<boolean> => {
    if (!customerId) return false;

    try {
      // Calcular próxima fecha de ejecución
      const today = new Date();
      let nextExecutionDate: string;
      
      if (type === 'monthly') {
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1); // Primero del mes siguiente
        nextExecutionDate = nextMonth.toISOString().split('T')[0];
      } else if (type === 'weekly') {
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextExecutionDate = nextWeek.toISOString().split('T')[0];
      } else {
        // Para cumpleaños, usar la fecha del próximo cumpleaños
        nextExecutionDate = today.toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('customer_runa_subscriptions')
        .insert({
          customer_id: customerId,
          subscription_type: type,
          runas_amount: runasAmount,
          next_execution_date: nextExecutionDate,
          notes: notes || null,
          is_active: true,
          start_date: startDate || today.toISOString().split('T')[0],
          end_date: endDate || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Error",
            description: "Este cliente ya tiene una suscripción de este tipo",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return false;
      }

      toast({
        title: "Éxito",
        description: `Suscripción ${type === 'monthly' ? 'mensual' : type === 'weekly' ? 'semanal' : 'de cumpleaños'} creada`,
      });

      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast({
        title: "Error",
        description: "Error al crear la suscripción",
        variant: "destructive"
      });
      return false;
    }
  };

  const updateSubscription = async (
    subscriptionId: string,
    updates: Partial<Pick<RunaSubscription, 'runas_amount' | 'is_active' | 'notes' | 'start_date' | 'end_date'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customer_runa_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Suscripción actualizada",
      });

      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la suscripción",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteSubscription = async (subscriptionId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('customer_runa_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Suscripción eliminada",
      });

      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      toast({
        title: "Error",
        description: "Error al eliminar la suscripción",
        variant: "destructive"
      });
      return false;
    }
  };

  const getActiveSubscription = (type: SubscriptionType): RunaSubscription | undefined => {
    return subscriptions.find(s => s.subscription_type === type && s.is_active);
  };

  return {
    subscriptions,
    config,
    loading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    getActiveSubscription,
    refetch: fetchSubscriptions
  };
}
