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
    
    const body = await req.json();
    const { 
      items, customer_id, notes, fulfillment, 
      delivery_address, delivery_fee, delivery_zone_id, delivery_zone_name, delivery_lat, delivery_lng,
      coupon_id, coupon_code,
      subscription_discount_amount, subscription_delivery_discount, alliance_delivery_discount
    } = body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Items are required');
    }
    
    if (!customer_id) {
      throw new Error('Customer ID is required');
    }
    
    // Validar que el customer existe y está activo
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, apellido, nombres, apellidos, email, estado_cliente')
      .eq('id', customer_id)
      .single();
    
    if (customerError || !customer) {
      console.error('❌ Customer not found:', customerError);
      throw new Error('Cliente no encontrado');
    }
    
    if (customer.estado_cliente !== 'Activo') {
      console.error('❌ Customer not active:', customer.estado_cliente);
      throw new Error('Cliente no está activo');
    }
    
    console.log('✅ Customer validated:', customer.name);
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
    
    // 2. CALCULAR SUBTOTAL (incluye items + extras)
    const subtotal = items.reduce((sum: number, item: any) => {
      const base = (item.basePrice || 0) * (item.quantity || 1);
      const extrasTotal = Array.isArray(item.extras)
        ? item.extras.reduce((s: number, e: any) => s + (Number(e.price) || 0) * (Number(e.quantity) || 1) * (item.quantity || 1), 0)
        : 0;
      return sum + base + extrasTotal;
    }, 0);
    
    console.log('💰 Subtotal calculated:', subtotal);
    
    const actualDeliveryFee = Math.max(0, Number(delivery_fee) || 0);
    const actualFulfillment = fulfillment === 'delivery' ? 'delivery' : 'retiro';
    
    // 2b. VALIDAR Y RECALCULAR DESCUENTO POR CUPÓN (server-side, fuente de verdad)
    let couponDiscountProducts = 0;
    let couponDiscountDelivery = 0;
    let validatedCouponId: string | null = null;
    let validatedCouponCode: string | null = null;
    
    if (coupon_id || coupon_code) {
      let couponQuery = supabase
        .from('coupons')
        .select('*');

      if (coupon_id) {
        couponQuery = couponQuery.eq('id', coupon_id);
      } else if (coupon_code) {
        couponQuery = couponQuery.eq('code', String(coupon_code).trim().toUpperCase());
      }

      const { data: coupon, error: couponErr } = await couponQuery.maybeSingle();
      
      if (couponErr || !coupon) {
        console.warn('⚠️ Coupon not found, ignoring:', { coupon_id, coupon_code });
      } else if (!coupon.is_active) {
        console.warn('⚠️ Coupon inactive, ignoring:', coupon.code);
      } else {
        const now = new Date();
        const startOk = !coupon.date_start || new Date(coupon.date_start) <= now;
        const endOk = !coupon.date_end || new Date(coupon.date_end) >= now;
        const minOk = !coupon.min_spend || subtotal >= Number(coupon.min_spend);
        const maxOk = !coupon.max_spend || subtotal <= Number(coupon.max_spend);
        
        // Validar usage_limit_total
        let usageOk = true;
        if (coupon.usage_limit_total) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .not('status', 'in', '(Cancelado,PendientePago)');
          if ((count || 0) >= coupon.usage_limit_total) usageOk = false;
        }
        
        // Validar usage_limit_per_customer
        let perCustomerOk = true;
        if (coupon.usage_limit_per_customer && customer_id) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('customer_id', customer_id)
            .not('status', 'in', '(Cancelado,PendientePago)');
          if ((count || 0) >= coupon.usage_limit_per_customer) perCustomerOk = false;
        }
        
        if (!startOk || !endOk || !minOk || !maxOk || !usageOk || !perCustomerOk) {
          console.warn('⚠️ Coupon validation failed:', { startOk, endOk, minOk, maxOk, usageOk, perCustomerOk });
          return new Response(
            JSON.stringify({ error: `El cupón ${coupon.code} ya no es válido. Por favor revisa tu pedido.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Calcular descuento sobre productos
        if (coupon.affects_products) {
          if (coupon.type === 'percent') {
            couponDiscountProducts = Math.round(subtotal * Number(coupon.amount) / 100);
          } else if (coupon.type === 'fixed_cart') {
            couponDiscountProducts = Math.min(subtotal, Math.round(Number(coupon.amount)));
          } else if (coupon.type === 'fixed_product') {
            couponDiscountProducts = items.reduce((sum: number, item: any) => {
              const base = ((item.basePrice || 0) + (Array.isArray(item.extras)
                ? item.extras.reduce((s: number, e: any) => s + (Number(e.price) || 0) * (Number(e.quantity) || 1), 0)
                : 0));
              const perUnitDiscount = Math.min(Math.round(Number(coupon.amount) || 0), Math.max(0, base));
              return sum + (perUnitDiscount * (Number(item.quantity) || 1));
            }, 0);
          }
        }
        
        // Calcular descuento sobre delivery
        if (coupon.affects_delivery && actualFulfillment === 'delivery' && actualDeliveryFee > 0) {
          if (coupon.delivery_mode === 'free') {
            couponDiscountDelivery = actualDeliveryFee;
          } else if (coupon.delivery_mode === 'fixed') {
            couponDiscountDelivery = Math.min(actualDeliveryFee, Math.round(Number(coupon.delivery_amount) || 0));
          } else if (coupon.delivery_mode === 'percent') {
            couponDiscountDelivery = Math.round(actualDeliveryFee * Number(coupon.delivery_amount || 0) / 100);
          }
        }
        
        validatedCouponId = coupon.id;
        validatedCouponCode = coupon.code;
        console.log('🎟️ Coupon applied server-side:', {
          coupon_id: coupon.id,
          coupon_code: coupon.code,
          coupon_type: coupon.type,
          discount_products: couponDiscountProducts,
          discount_delivery: couponDiscountDelivery,
        });
      }
    }
    
    // Descuentos adicionales (suscripción + alianza) — confiamos en cliente para estos
    const subDiscount = Math.max(0, Number(subscription_discount_amount) || 0);
    const subDeliveryDiscount = Math.max(0, Number(subscription_delivery_discount) || 0);
    const allianceDeliveryDisc = Math.max(0, Number(alliance_delivery_discount) || 0);
    
    const totalProductDiscount = Math.min(subtotal, couponDiscountProducts + subDiscount);
    const totalDeliveryDiscount = Math.min(actualDeliveryFee, couponDiscountDelivery + subDeliveryDiscount + allianceDeliveryDisc);
    const effectiveSubtotal = subtotal - totalProductDiscount;
    const effectiveDeliveryFee = actualDeliveryFee - totalDeliveryDiscount;
    const total = effectiveSubtotal + (actualFulfillment === 'delivery' ? effectiveDeliveryFee : 0);
    
    console.log('💵 Final amounts:', { subtotal, totalProductDiscount, effectiveDeliveryFee, total });
    
    // Validar que el total no sea cero
    if (total <= 0) {
      console.warn('⚠️ Cannot process $0 payment with MercadoPago');
      return new Response(
        JSON.stringify({ error: 'No se puede procesar un pago de $0 con MercadoPago. Por favor verifica tu pedido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. CREAR ORDEN EN DB con status='PendientePago'
    const orderData = {
      customer_id: customer_id || null,
      source: 'customer_app',
      fulfillment: actualFulfillment,
      items: items,
      subtotal: subtotal,
      total: total,
      discount: totalProductDiscount,
      delivery_fee: actualFulfillment === 'delivery' ? effectiveDeliveryFee : 0,
      delivery_address: delivery_address || null,
      delivery_zone_id: delivery_zone_id || null,
      delivery_zone_name: delivery_zone_name || null,
      delivery_lat: delivery_lat || null,
      delivery_lng: delivery_lng || null,
      coupon_id: validatedCouponId,
      coupon_code: validatedCouponCode,
      status: 'PendientePago',
      payment_method: 'mp',
      payment_mp: 0,
      notes: notes || 'Pedido desde app cliente - Pago pendiente',
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
        unit_price: total,
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
      payer: customer.email ? {
        email: customer.email
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
