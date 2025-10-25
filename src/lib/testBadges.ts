import { supabase } from '@/integrations/supabase/client';

/**
 * Script de prueba para el sistema de insignias
 * Ejecutar desde consola del navegador con testBadgeSystem(customerId)
 */
export async function testBadgeSystem(customerId: string) {
  console.group('🧪 TEST BADGE SYSTEM');
  
  // Test 1: Verificar que las funciones existen
  console.log('\n📋 Test 1: Verificando funciones RPC...');
  const { data: testFn, error: fnError } = await supabase.rpc('check_and_award_badge', {
    p_customer_id: customerId,
    p_badge_code: 'test_badge_fake_nonexistent'
  });
  
  if (fnError) {
    console.error('❌ Error al llamar función RPC:', fnError);
  } else {
    console.log('✅ Función RPC disponible. Resultado con badge inexistente:', testFn);
  }
  
  // Test 2: Intentar otorgar primera orden
  console.log('\n🏆 Test 2: Intentando otorgar insignia first_order...');
  const { data: badge1, error: err1 } = await supabase.rpc('check_and_award_badge', {
    p_customer_id: customerId,
    p_badge_code: 'first_order'
  });
  
  if (err1) {
    console.error('❌ Error:', err1);
  } else {
    console.log(badge1 ? '✅ Insignia otorgada' : 'ℹ️ Insignia no otorgada (ya la tiene)');
  }
  
  // Test 3: Verificar 4 semanas consecutivas
  console.log('\n📅 Test 3: Verificando pedidos 4 semanas consecutivas...');
  const { data: consecutive, error: err3 } = await supabase.rpc('has_orders_in_last_4_weeks', {
    p_customer_id: customerId
  });
  
  if (err3) {
    console.error('❌ Error:', err3);
  } else {
    console.log(consecutive ? '✅ Cumple requisito' : 'ℹ️ No cumple requisito');
  }
  
  // Test 4: Consultar insignias actuales del cliente
  console.log('\n🎖️ Test 4: Consultando insignias del cliente...');
  const { data: awarded, error: err4 } = await supabase
    .from('customer_badges_awarded')
    .select(`
      badge_id,
      awarded_at,
      customer_badges (
        code,
        name,
        description
      )
    `)
    .eq('customer_id', customerId);
  
  if (err4) {
    console.error('❌ Error:', err4);
  } else {
    console.log('✅ Insignias actuales:', awarded);
    console.table(awarded?.map(a => ({
      Código: (a.customer_badges as any)?.code,
      Nombre: (a.customer_badges as any)?.name,
      Fecha: new Date(a.awarded_at).toLocaleDateString('es-CL')
    })));
  }
  
  // Test 5: Obtener estadísticas del cliente
  console.log('\n📊 Test 5: Estadísticas del cliente...');
  const { data: customer, error: err5 } = await supabase
    .from('customers')
    .select('id, name, valor_cliente, cantidad_runas')
    .eq('id', customerId)
    .single();
  
  if (err5) {
    console.error('❌ Error:', err5);
  } else {
    console.log('✅ Cliente:', customer);
  }
  
  // Test 6: Contar pedidos completados
  console.log('\n🛒 Test 6: Contando pedidos completados...');
  const { count, error: err6 } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .neq('status', 'Cancelado');
  
  if (err6) {
    console.error('❌ Error:', err6);
  } else {
    console.log(`✅ Total de pedidos: ${count}`);
  }
  
  console.log('\n✅ Test completado');
  console.groupEnd();
  
  return {
    functionsWork: !fnError,
    badgesAwarded: awarded?.length || 0,
    customerStats: customer,
    totalOrders: count || 0
  };
}

// Hacer disponible globalmente para testing en consola
if (typeof window !== 'undefined') {
  (window as any).testBadgeSystem = testBadgeSystem;
  console.log('💡 Función testBadgeSystem() disponible en consola. Usa: testBadgeSystem("customer-id")');
}
