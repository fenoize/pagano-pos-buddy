import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { order_id } = await req.json();

    if (!order_id || typeof order_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'order_id requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, total, fulfillment, status, branch_id')
      .eq('id', order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Orden no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.status !== 'PendienteAceptacion') {
      return new Response(
        JSON.stringify({ success: false, reason: 'La orden no está pendiente de aceptación' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sessionsQuery = supabase
      .from('cash_sessions')
      .select('user_id')
      .is('closed_at', null);

    if (order.branch_id) {
      sessionsQuery = sessionsQuery.eq('branch_id', order.branch_id);
    }

    const { data: activeSessions } = await sessionsQuery;

    // Destinatarios: cajeros con turno (caja) abierto en la sucursal + administradores activos.
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'Administrador')
      .eq('active', true);

    const recipientIds = Array.from(new Set([
      ...(activeSessions ?? []).map((s: any) => s.user_id).filter(Boolean),
      ...(adminUsers ?? []).map((u: any) => u.id),
    ]));

    if (recipientIds.length === 0) {
      console.log('ℹ️ No hay destinatarios para el aviso de pedido');
      return new Response(
        JSON.stringify({ success: true, recipients: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orderType = order.fulfillment === 'delivery' ? 'Delivery 🛵' : 'Retiro 🏃';
    const totalFormatted = Number(order.total).toLocaleString('es-CL');

    let sent = 0;
    const { error: pushError } = await supabase.functions.invoke('send-staff-push', {
      body: {
        user_ids: recipientIds,
        type: 'new_app_order',
        title: `⚔️ Nuevo pedido #${order.order_number}`,
        body: `${orderType} • $${totalFormatted} — requiere aceptación en el POS`,
        payload: { order_id: order.id, order_number: order.order_number }
      }
    });
    if (pushError) {
      console.warn('⚠️ Push error:', pushError);
    } else {
      sent = recipientIds.length;
    }

    return new Response(
      JSON.stringify({ success: true, recipients: sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ notify-new-app-order error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
