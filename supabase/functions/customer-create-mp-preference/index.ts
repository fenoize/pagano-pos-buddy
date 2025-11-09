import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ User authenticated:', user.email);
    
    const body = await req.json();
    const { items, customer_id, notes } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required');
    }
    
    console.log('📦 Creating order for customer:', customer_id);
    
    // 1. VALIDAR ESTADO DEL LOCAL
    const { data: storeStatus, error: storeError } = await supabase.rpc('get_store_status');
    
    if (storeError) {
      console.error('❌ Error getting store status:', storeError);
      throw new Error('Error al verificar estado del local');
    }
    
    console.log('🏪 Store status:', storeStatus);
    
    if (!storeStatus.app_orders_enabled || !storeStatus.accept_app_orders) {
      console.warn('⚠️ Store not accepting app orders');
      return new Response(
        JSON.stringify({ 
          error: 'El local no está recibiendo pedidos desde la app en este momento. Por favor intenta más tarde.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 2. CALCULAR TOTALES
    const subtotal = items.reduce((sum: number, item: any) => {
      const itemTotal = (item.basePrice || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);
    
    console.log('💰 Subtotal calculated:', subtotal);
    
    // 3. CREAR ORDEN EN DB con status='Pendiente'
    const orderData = {
      customer_id: customer_id || null,
      source: 'customer_app',
      fulfillment: 'retiro',
      items: items,
      subtotal: subtotal,
      total: subtotal,
      discount: 0,
      delivery_fee: 0,
      status: 'Pendiente',
      payment_method: 'mp',
      payment_mp: 0,
      notes: notes || 'Pedido desde app cliente',
      nombre_resumen: items.map((i: any) => i.productName).join(', ').substring(0, 100)
    };
    
    console.log('📝 Creating order in database...');
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (orderError) {
      console.error('❌ Error creating order:', orderError);
      throw new Error(`Error al crear orden: ${orderError.message}`);
    }
    
    console.log('✅ Order created:', order.id, 'Order number:', order.order_number);
    
    // 4. CREAR PREFERENCE EN MERCADOPAGO
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const APP_URL = Deno.env.get('APP_URL') || 'https://app.paganosburger.cl';
    
    if (!MP_ACCESS_TOKEN) {
      throw new Error('MercadoPago access token not configured');
    }
    
    const preference = {
      items: [{
        title: `Pedido Paganos #${order.order_number}`,
        quantity: 1,
        unit_price: subtotal,
        currency_id: 'CLP'
      }],
      external_reference: order.id,
      back_urls: {
        success: `${APP_URL}/payment-success?order=${order.id}`,
        failure: `${APP_URL}/payment-failure?order=${order.id}`,
        pending: `${APP_URL}/payment-pending?order=${order.id}`
      },
      auto_return: 'all',
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
      statement_descriptor: 'PAGANOS BURGER',
      payer: customer_id ? {
        email: user.email
      } : undefined
    };
    
    console.log('🔗 Creating MercadoPago preference...');
    console.log('Notification URL:', preference.notification_url);
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });
    
    const mpData = await mpResponse.json();
    
    if (!mpResponse.ok) {
      console.error('❌ MercadoPago error:', mpData);
      throw new Error(`Error de MercadoPago: ${mpData.message || 'Unknown error'}`);
    }
    
    console.log('✅ MercadoPago preference created:', mpData.id);
    
    // 5. RETORNAR init_point
    return new Response(
      JSON.stringify({ 
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        preference_id: mpData.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: any) {
    console.error('❌ Error in customer-create-mp-preference:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al procesar el pedido',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
