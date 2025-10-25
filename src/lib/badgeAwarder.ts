import { supabase } from '@/integrations/supabase/client';

interface BadgeCheckResult {
  badgeCode: string;
  awarded: boolean;
}

/**
 * Verifica y otorga insignias al cliente basándose en su actividad
 */
export async function checkAndAwardBadges(
  customerId: string,
  orderId: string
): Promise<BadgeCheckResult[]> {
  const results: BadgeCheckResult[] = [];

  try {
    // Obtener información del cliente y sus pedidos
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, fecha_nacimiento')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, created_at, status')
      .eq('customer_id', customerId)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: true });

    if (ordersError) throw ordersError;

    const orderCount = orders?.length || 0;
    const totalSpent = orders?.reduce((sum, o) => sum + o.total, 0) || 0;

    // 1. Primera Orden
    if (orderCount === 1) {
      const awarded = await awardBadge(customerId, 'first_order');
      results.push({ badgeCode: 'first_order', awarded });
    }

    // 2. 10 Órdenes
    if (orderCount === 10) {
      const awarded = await awardBadge(customerId, 'ten_orders');
      results.push({ badgeCode: 'ten_orders', awarded });
    }

    // 3. Gran Gastador (más de $100,000)
    if (totalSpent >= 100000) {
      const awarded = await awardBadge(customerId, 'big_spender');
      results.push({ badgeCode: 'big_spender', awarded });
    }

    // 4. Cumpleañero (pedido en cumpleaños)
    if (customer.fecha_nacimiento) {
      const today = new Date();
      const birthday = new Date(customer.fecha_nacimiento);
      
      if (
        today.getMonth() === birthday.getMonth() &&
        today.getDate() === birthday.getDate()
      ) {
        const awarded = await awardBadge(customerId, 'birthday_order');
        results.push({ badgeCode: 'birthday_order', awarded });
      }
    }

    // 5. Devoto Semanal (4 semanas consecutivas)
    const hasConsecutiveWeeks = await checkConsecutiveWeeks(customerId);
    if (hasConsecutiveWeeks) {
      const awarded = await awardBadge(customerId, 'weekly_loyal');
      results.push({ badgeCode: 'weekly_loyal', awarded });
    }

  } catch (error) {
    console.error('Error checking badges:', error);
  }

  return results;
}

/**
 * Otorga una insignia al cliente si no la tiene
 */
async function awardBadge(customerId: string, badgeCode: string): Promise<boolean> {
  try {
    console.log(`🏅 Intentando otorgar insignia ${badgeCode} a cliente ${customerId}`);
    
    const { data, error } = await supabase.rpc('check_and_award_badge', {
      p_customer_id: customerId,
      p_badge_code: badgeCode,
    });

    if (error) {
      console.error(`❌ Error SQL al otorgar ${badgeCode}:`, error);
      throw error;
    }
    
    if (data === true) {
      console.log(`✅ Insignia ${badgeCode} otorgada exitosamente`);
    } else {
      console.log(`ℹ️ Insignia ${badgeCode} no otorgada (ya la tiene o no existe)`);
    }
    
    return data === true;
  } catch (error: any) {
    console.error(`❌ Error awarding badge ${badgeCode}:`, error);
    return false;
  }
}

/**
 * Verifica si el cliente tiene pedidos en las últimas 4 semanas consecutivas
 */
async function checkConsecutiveWeeks(customerId: string): Promise<boolean> {
  try {
    console.log(`📅 Verificando pedidos en 4 semanas consecutivas para cliente ${customerId}`);
    
    const { data, error } = await supabase.rpc('has_orders_in_last_4_weeks', {
      p_customer_id: customerId,
    });

    if (error) {
      console.error('❌ Error verificando semanas consecutivas:', error);
      throw error;
    }
    
    console.log(`✅ Resultado verificación 4 semanas: ${data}`);
    return data === true;
  } catch (error: any) {
    console.error('❌ Error checking consecutive weeks:', error);
    return false;
  }
}