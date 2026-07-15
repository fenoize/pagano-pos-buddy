import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configuredSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { setStaffContext } from '@/lib/dbContext';
import { useAuth } from '@/hooks/useAuth';

// Estados disponibles para mostrar en TV
export const TV_STATUS_OPTIONS = [
  { value: 'En preparación', label: 'En preparación' },
  { value: 'Listo', label: 'Listo' },
] as const;

export interface TVScreenConfig {
  id: string;
  name: string;
  slug: string;
  template: 'full' | 'split_horizontal' | 'split_vertical' | 'promo_only';
  slider_interval_seconds: number;
  show_logo: boolean;
  show_clock: boolean;
  sound_enabled: boolean;
  is_default: boolean;
  columns: number;
  font_size: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark';
  hide_header_fullscreen: boolean;
  visible_statuses: string[];
  idle_screen_config_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TVScreenConfigInput = Omit<TVScreenConfig, 'id' | 'slug' | 'created_at' | 'updated_at'> & { slug?: string };

export const useTVScreenConfigs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ['tv-screen-configs'],
    queryFn: async () => {
      const { data, error } = await configuredSupabase
        .from('tv_screen_configs')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as TVScreenConfig[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (config: TVScreenConfigInput) => {
      if (user?.id) await setStaffContext(user.id);
      
      // Si es default, quitar default de los demás
      if (config.is_default) {
        await configuredSupabase
          .from('tv_screen_configs')
          .update({ is_default: false })
          .eq('is_default', true);
      }
      
      const { data, error } = await configuredSupabase
        .from('tv_screen_configs')
        .insert([config])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-configs'] });
      toast.success('Configuración creada');
    },
    onError: (error: Error) => {
      toast.error('Error al crear: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...config }: Partial<TVScreenConfig> & { id: string }) => {
      if (user?.id) await setStaffContext(user.id);
      
      // Si es default, quitar default de los demás
      if (config.is_default) {
        await configuredSupabase
          .from('tv_screen_configs')
          .update({ is_default: false })
          .neq('id', id);
      }
      
      const { data, error } = await configuredSupabase
        .from('tv_screen_configs')
        .update({ ...config, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-configs'] });
      toast.success('Configuración actualizada');
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (user?.id) await setStaffContext(user.id);
      
      const { error } = await configuredSupabase
        .from('tv_screen_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-screen-configs'] });
      toast.success('Configuración eliminada');
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  const defaultConfig = configs.find(c => c.is_default);

  return {
    configs,
    isLoading,
    error,
    defaultConfig,
    createConfig: createMutation.mutateAsync,
    updateConfig: updateMutation.mutateAsync,
    deleteConfig: deleteMutation.mutateAsync,
  };
};

// Hook para obtener una config específica por ID o nombre
export const useTVScreenConfig = (screenId?: string) => {
  return useQuery({
    queryKey: ['tv-screen-config', screenId],
    queryFn: async () => {
      if (!screenId) {
        // Buscar default
        const { data } = await configuredSupabase
          .from('tv_screen_configs')
          .select('*')
          .eq('is_default', true)
          .maybeSingle();
        return data as TVScreenConfig | null;
      }

      // Buscar por ID o nombre
      const { data: byId } = await configuredSupabase
        .from('tv_screen_configs')
        .select('*')
        .eq('id', screenId)
        .maybeSingle();

      if (byId) return byId as TVScreenConfig;

      // Si no encuentra por ID, buscar por nombre
      const { data: byName } = await configuredSupabase
        .from('tv_screen_configs')
        .select('*')
        .ilike('name', screenId)
        .maybeSingle();

      return byName as TVScreenConfig | null;
    },
    enabled: true,
  });
};
