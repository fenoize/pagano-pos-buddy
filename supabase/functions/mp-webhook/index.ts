import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    console.log('🔔 MercadoPago webhook received');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // MercadoPago puede enviar GET o POST
    let notificationData;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      notificationData = {
        type: url.searchParams.get('type'),
        data: {
          id: url.searchParams.get('data.id')
        }
      };
      console.log('📬 GET notification:', notificationData);
    } else {
      notificationData = await req.json();
      console.log('📬 POST notification:', notificationData);
    }
    
    // MercadoPago envía diferentes tipos de notificaciones
    // Solo procesamos las de tipo "payment"
    if (notificationData.type !== 'payment') {
      console.log('ℹ️ Ignoring non-payment notification type:', notificationData.type);
      return new Response('OK', { status: 200 });
    }
    
    const paymentId = notificationData.data?.id;
    
    if (!paymentId) {
      console.error('❌ No payment ID in notification');
      return new Response('Missing payment ID', { status: 400 });
    }
    
    console.log('💳 Processing payment:', paymentId);
    
    // Obtener detalles del pago desde MercadoPago
    const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!MP_ACCESS_TOKEN) {
      console.error('❌ MercadoPago access token not configured');
      return new Response('Configuration error', { status: 500 });
    }
    
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { 
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!paymentResponse.ok) {
      console.error('❌ Error fetching payment from MercadoPago:', await paymentResponse.text());
      return new Response('Error fetching payment', { status: 500 });
    }
    
    const payment = await paymentResponse.json();
    
    console.log('💳 Payment details:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
      external_reference: payment.external_reference
    });
    
    const orderId = payment.external_reference;
    
    if (!orderId) {
      console.error('❌ No external_reference (order_id) in payment');
      return new Response('Missing order reference', { status: 400 });
    }
    
    // Obtener la orden actual
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching order:', fetchError);
      return new Response('Order not found', { status: 404 });
    }
    
    console.log('📦 Current order status:', currentOrder.status);
    
    // Actualizar orden según el estado del pago
    let newStatus = currentOrder.status;
    let updateData: any = {};
    
    if (payment.status === 'approved') {
     // Check if order is from customer_app - these need cashier acceptance
     const isCustomerAppOrder = currentOrder.source === 'customer_app';
     
     if (isCustomerAppOrder) {
       console.log('✅ Payment approved - updating order to PendienteAceptacion (awaiting cashier acceptance)');
       newStatus = 'PendienteAceptacion';
     } else {
       console.log('✅ Payment approved - updating order to Pendiente (POS order, visible en cocina)');
       newStatus = 'Pendiente';
     }
      updateData = {
        status: newStatus,
        payment_mp: payment.transaction_amount,
        payment_method: 'mp',
        notes: `${currentOrder.notes || ''}\n\n✅ Pago confirmado\nMP ID: ${payment.id}\nMétodo: ${payment.payment_method_id || 'N/A'}\nMonto: $${payment.transaction_amount}`.trim()
      };
    } else if (payment.status === 'pending' || payment.status === 'in_process') {
      console.log('⏳ Payment pending or in process - mantener en PendientePago');
      // No cambiar status, mantener en PendientePago
      updateData = {
        notes: `${currentOrder.notes || ''}\n\n⏳ Pago pendiente\nMP ID: ${payment.id}\nDetalle: ${payment.status_detail || 'En proceso'}`.trim()
      };
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      console.log('❌ Payment rejected/cancelled - cancelando orden');
      newStatus = 'Cancelado';
      updateData = {
        status: 'Cancelado',
        notes: `${currentOrder.notes || ''}\n\n❌ Pago ${payment.status === 'rejected' ? 'rechazado' : 'cancelado'}\nMP ID: ${payment.id}\nRazón: ${payment.status_detail || 'No especificada'}`.trim()
      };
    } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
      console.log('💸 Payment refunded or charged back - cancelar orden');
      newStatus = 'Cancelado';
      updateData = {
        status: newStatus,
        notes: `${currentOrder.notes || ''}\n\n💸 Pago ${payment.status === 'refunded' ? 'reembolsado' : 'contracargado'}\nMP ID: ${payment.id}`.trim()
      };
    }
    
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (updateError) {
        console.error('❌ Error updating order:', updateError);
        throw updateError;
      }
      
      console.log(`✅ Order ${orderId} updated to status: ${newStatus}`);
      
      // Notificar por push a cajeros activos cuando el pedido queda PendienteAceptacion
      if (newStatus === 'PendienteAceptacion') {
        try {
          console.log('📲 Buscando cajeros activos para push notification...');
          
          const orderBranchId = currentOrder.branch_id;

          let sessionsQuery = supabase
            .from('cash_sessions')
            .select('user_id')
            .is('closed_at', null)
            .eq('accept_app_orders', true);

          if (orderBranchId) {
            sessionsQuery = sessionsQuery.eq('branch_id', orderBranchId);
            console.log('🏪 Filtrando cajeros por branch_id:', orderBranchId);
          } else {
            console.warn('⚠️ Orden sin branch_id — notificando a todos los cajeros activos como fallback');
          }

          const { data: activeSessions } = await sessionsQuery;
          
          if (activeSessions && activeSessions.length > 0) {
            const orderNumber = currentOrder.order_number;
            const orderType = currentOrder.fulfillment === 'delivery' ? 'Delivery 🛵' : 'Retiro 🏃';
            const totalFormatted = Number(currentOrder.total).toLocaleString('es-CL');
            
            for (const session of activeSessions) {
              if (session.user_id) {
                const { error: pushError } = await supabase.functions.invoke('send-staff-push', {
                  body: {
                    user_id: session.user_id,
                    type: 'new_app_order',
                    title: `⚔️ Nuevo pedido #${orderNumber}`,
                    body: `${orderType} • $${totalFormatted} — requiere aceptación en el POS`,
                    payload: { order_id: orderId, order_number: orderNumber }
                  }
                });
                if (pushError) {
                  console.warn(`⚠️ Push error for cashier ${session.user_id}:`, pushError);
                } else {
                  console.log(`✅ Push enviado al cajero: ${session.user_id}`);
                }
              }
            }
          } else {
            console.log('ℹ️ No hay sesiones de caja activas con accept_app_orders=true para notificar');
          }
        } catch (pushErr) {
          // No-fatal: logear pero no fallar el webhook
          console.error('⚠️ Error al enviar push a cajeros:', pushErr);
        }
      }
      
      
      // Incrementar usage_count de suscripción de descuento si el pago fue aprobado
      if (payment.status === 'approved' && currentOrder.customer_id && currentOrder.discount > 0) {
        try {
          const { data: sub } = await supabase
            .from('customer_discount_subscriptions')
            .select('id, usage_count')
            .eq('customer_id', currentOrder.customer_id)
            .eq('is_active', true)
            .maybeSingle();
          if (sub) {
            await supabase
              .from('customer_discount_subscriptions')
              .update({ usage_count: (sub.usage_count || 0) + 1 })
              .eq('id', sub.id);
            console.log('✅ Discount subscription usage_count incremented');
          }
        } catch (err) {
          console.error('Error incrementing discount usage_count:', err);
        }
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        order_id: orderId,
        payment_status: payment.status,
        order_status: newStatus
      }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal error',
        message: error.message 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
