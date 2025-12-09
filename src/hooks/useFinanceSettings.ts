import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addDays, addWeeks, addMonths, startOfWeek, startOfMonth, format, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';
import { es } from 'date-fns/locale';

export interface FinanceSettings {
  id: string;
  // Datos del negocio
  razon_social: string | null;
  nombre_fantasia: string | null;
  rut: string | null;
  giro: string | null;
  direccion_tributaria: string | null;
  comuna: string | null;
  ciudad: string | null;
  pais: string | null;
  correo_contable: string | null;
  telefono_contable: string | null;
  banco_principal: string | null;
  fecha_inicio_actividades: string | null;
  // Período y moneda
  moneda: string;
  aplicar_redondeo: boolean;
  regla_redondeo: 'entero' | '1_decimal' | '2_decimales';
  periodo_cierre: 'mensual' | 'semanal' | 'manual';
  dia_corte_mensual: number | null;
  dia_corte_semanal: string | null;
  // Reglas de egresos
  monto_min_orden_compra: number;
  monto_max_caja_chica: number;
  exigir_documento_sobre_monto: boolean;
  monto_exigir_documento: number;
  // Alertas y aprobación
  monto_aprobacion_oc: number;
  usuarios_aprobadores_oc: string[];
  alerta_egreso_sobre_monto: boolean;
  monto_alerta_egreso: number;
  alerta_cierre_financiero: boolean;
  correos_notificacion: string | null;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<FinanceSettings, 'id' | 'created_at' | 'updated_at'> = {
  razon_social: null,
  nombre_fantasia: null,
  rut: null,
  giro: null,
  direccion_tributaria: null,
  comuna: null,
  ciudad: 'Santiago',
  pais: 'Chile',
  correo_contable: null,
  telefono_contable: null,
  banco_principal: null,
  fecha_inicio_actividades: null,
  moneda: 'CLP',
  aplicar_redondeo: false,
  regla_redondeo: 'entero',
  periodo_cierre: 'manual',
  dia_corte_mensual: null,
  dia_corte_semanal: null,
  monto_min_orden_compra: 0,
  monto_max_caja_chica: 0,
  exigir_documento_sobre_monto: false,
  monto_exigir_documento: 0,
  monto_aprobacion_oc: 0,
  usuarios_aprobadores_oc: [],
  alerta_egreso_sobre_monto: false,
  monto_alerta_egreso: 0,
  alerta_cierre_financiero: false,
  correos_notificacion: null,
};

export function useFinanceSettings() {
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as unknown as FinanceSettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('finance_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings as unknown as FinanceSettings);
      }
    } catch (error) {
      console.error('Error fetching finance settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la configuración financiera',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<FinanceSettings>): Promise<boolean> => {
    if (!settings?.id) return false;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('finance_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Guardado',
        description: 'Configuración actualizada correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error updating finance settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Calculate next suggested closure date based on settings
  const getNextClosureDate = useCallback((): string => {
    if (!settings) return 'No configurado';
    
    const today = new Date();
    
    if (settings.periodo_cierre === 'manual') {
      return 'Manual (cuando lo desees)';
    }
    
    if (settings.periodo_cierre === 'mensual' && settings.dia_corte_mensual) {
      const day = settings.dia_corte_mensual;
      let nextDate = new Date(today.getFullYear(), today.getMonth(), day);
      if (nextDate <= today) {
        nextDate = addMonths(nextDate, 1);
      }
      return format(nextDate, "d 'de' MMMM, yyyy", { locale: es });
    }
    
    if (settings.periodo_cierre === 'semanal' && settings.dia_corte_semanal) {
      const dayMap: Record<string, (date: Date) => Date> = {
        'lunes': nextMonday,
        'martes': nextTuesday,
        'miércoles': nextWednesday,
        'jueves': nextThursday,
        'viernes': nextFriday,
        'sábado': nextSaturday,
        'domingo': nextSunday,
      };
      const nextFn = dayMap[settings.dia_corte_semanal.toLowerCase()];
      if (nextFn) {
        const nextDate = nextFn(today);
        return format(nextDate, "EEEE d 'de' MMMM", { locale: es });
      }
    }
    
    return 'No configurado';
  }, [settings]);

  return {
    settings,
    loading,
    saving,
    updateSettings,
    getNextClosureDate,
    refetch: fetchSettings,
  };
}
