import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerBadge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CustomerBadgeAwarded extends CustomerBadge {
  awarded_at: string;
}

export const useCustomerBadges = (customerId?: string) => {
  const [allBadges, setAllBadges] = useState<CustomerBadge[]>([]);
  const [awardedBadges, setAwardedBadges] = useState<CustomerBadgeAwarded[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Obtener todas las badges activas del catálogo
  const fetchAllBadges = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_badges')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setAllBadges(data || []);
    } catch (error: any) {
      console.error('Error fetching badges:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las insignias',
        variant: 'destructive',
      });
    }
  };

  // Obtener badges obtenidas por el cliente
  const fetchAwardedBadges = async () => {
    if (!customerId) {
      setAwardedBadges([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_badges_awarded')
        .select(`
          badge_id,
          awarded_at,
          customer_badges (
            id,
            code,
            name,
            description,
            icon,
            category,
            sort_order,
            is_active
          )
        `)
        .eq('customer_id', customerId);

      if (error) throw error;

      // Transformar datos para incluir awarded_at en cada badge
      const transformedData = (data || []).map((item: any) => ({
        ...item.customer_badges,
        awarded_at: item.awarded_at,
      }));

      setAwardedBadges(transformedData);
    } catch (error: any) {
      console.error('Error fetching awarded badges:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar tus insignias obtenidas',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadBadges = async () => {
      setLoading(true);
      await fetchAllBadges();
      await fetchAwardedBadges();
      setLoading(false);
    };

    loadBadges();
  }, [customerId]);

  // Verificar si el cliente tiene una badge específica
  const hasBadge = (badgeCode: string): boolean => {
    return awardedBadges.some(badge => badge.code === badgeCode);
  };

  // Obtener badges por categoría
  const getBadgesByCategory = (category: string | null) => {
    if (category === null) return allBadges;
    return allBadges.filter(badge => badge.category === category);
  };

  // Obtener categorías únicas
  const categories = Array.from(
    new Set(allBadges.map(badge => badge.category).filter(Boolean))
  );

  return {
    allBadges,
    awardedBadges,
    loading,
    hasBadge,
    getBadgesByCategory,
    categories,
    totalBadges: allBadges.length,
    totalAwarded: awardedBadges.length,
  };
};
