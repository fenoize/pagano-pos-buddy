import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { STORAGE_KEYS } from '@/lib/storageKeys';

export const GoogleSignInConfig: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Obtener token de staff
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      // Validar token
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_staff_token_v2', { _token: token });
      
      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Sesión inválida');
      }
      
      const userId = validationData[0].user_id;
      await supabase.rpc('set_staff_context', { p_user_id: userId });
      
      // Obtener configuración
      const { data, error } = await supabase
        .from('online_order_settings')
        .select('google_signin_enabled')
        .single();

      if (error) throw error;
      
      setEnabled(data?.google_signin_enabled ?? false);
    } catch (error) {
      console.error('Error fetching Google Sign-In settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (newValue: boolean) => {
    setSaving(true);
    try {
      // Obtener token de staff
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }
      
      // Validar token
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_staff_token_v2', { _token: token });
      
      if (validationError || !validationData || validationData.length === 0) {
        throw new Error('Sesión inválida');
      }
      
      const userId = validationData[0].user_id;
      const isAdmin = validationData[0].is_admin;
      
      if (!isAdmin) {
        toast.error('Solo administradores pueden modificar esta configuración');
        return;
      }
      
      await supabase.rpc('set_staff_context', { p_user_id: userId });
      
      const { error } = await supabase
        .from('online_order_settings')
        .update({ google_signin_enabled: newValue })
        .not('id', 'is', null);

      if (error) throw error;

      setEnabled(newValue);
      toast.success(newValue ? 'Google Sign-In activado' : 'Google Sign-In desactivado');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border">
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold">Google Sign-In</h3>
            <p className="text-sm text-muted-foreground">
              Permitir inicio de sesión con Google en la app de clientes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={enabled ? "default" : "secondary"} className="gap-1">
            {enabled ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Activo
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3" />
                Inactivo
              </>
            )}
          </Badge>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          )}
        </div>
      </div>

      <div className="bg-muted/50 p-3 rounded-md text-sm space-y-2">
        <p className="font-medium">Requisitos para activar:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>
            Configurar OAuth en{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Google Cloud Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            Habilitar proveedor en{' '}
            <a
              href="https://supabase.com/dashboard/project/lxxfhayifyiioglfbsyj/auth/providers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Supabase Auth Providers
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Para mostrar tu marca en lugar del dominio de Supabase, requiere plan Pro de Supabase (Custom Auth Domain)</li>
        </ul>
      </div>
    </div>
  );
};
