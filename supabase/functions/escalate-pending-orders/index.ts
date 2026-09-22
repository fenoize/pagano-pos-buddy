import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ESCALATION_MINUTES = 2;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const cutoff = new Date(Date.now() - ESCALATION_MINUTES * 60 * 1000).toISOString();

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, total, fulfillment, status, created_at, branch_id')
      .eq('status', 'PendienteAceptacion')
      .is('acceptance_email_sent_at', null)
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(20);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, escalated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Destinatarios: solo administradores activos + responsable(s) de la caja abierta
    // (config.order_alert_emails, si existe, sigue teniendo prioridad)
    const { data: cfgRow } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'order_alert_emails')
      .maybeSingle();

    let fixedRecipients: string[] = [];
    let cfgValue: any = cfgRow?.value;
    if (typeof cfgValue === 'string') {
      try { cfgValue = JSON.parse(cfgValue); } catch { /* ignore */ }
    }
    if (Array.isArray(cfgValue)) {
      fixedRecipients = cfgValue.filter((e: any) => typeof e === 'string' && e.includes('@'));
    }

    // Administradores activos
    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'Administrador')
      .eq('active', true);
    const adminEmails = (admins ?? [])
      .map((u: any) => u.email)
      .filter((e: any) => typeof e === 'string' && e.includes('@'));

    // Responsables de cajas abiertas, con su sucursal
    const { data: openSessions } = await supabase
      .from('cash_sessions')
      .select('user_id, branch_id')
      .is('closed_at', null);

    const cashierUserIds = Array.from(new Set((openSessions ?? []).map((s: any) => s.user_id).filter(Boolean)));
    const emailByUserId = new Map<string, string>();
    if (cashierUserIds.length > 0) {
      const { data: cashierUsers } = await supabase
        .from('users')
        .select('id, email')
        .in('id', cashierUserIds)
        .eq('active', true);
      for (const u of cashierUsers ?? []) {
        if (u.email && u.email.includes('@')) emailByUserId.set(u.id, u.email);
      }
    }

    // Correos de cajeros por sucursal (null = sin sucursal asignada)
    const cashierEmailsByBranch = new Map<string | null, Set<string>>();
    for (const s of openSessions ?? []) {
      const email = emailByUserId.get(s.user_id);
      if (!email) continue;
      const key = s.branch_id ?? null;
      if (!cashierEmailsByBranch.has(key)) cashierEmailsByBranch.set(key, new Set());
      cashierEmailsByBranch.get(key)!.add(email);
    }

    const recipientsFor = (branchId: string | null): string[] => {
      if (fixedRecipients.length > 0) return fixedRecipients;
      const set = new Set<string>(adminEmails);
      const branchCashiers = cashierEmailsByBranch.get(branchId ?? null);
      if (branchCashiers && branchCashiers.size > 0) {
        branchCashiers.forEach((e) => set.add(e));
      } else {
        // Sin caja abierta en esa sucursal: incluir a todos los cajeros con caja abierta
        cashierEmailsByBranch.forEach((emails) => emails.forEach((e) => set.add(e)));
      }
      return Array.from(set);
    };

    const allRecipients = recipientsFor(null);
    if (fixedRecipients.length === 0 && adminEmails.length === 0 && emailByUserId.size === 0) {
      console.warn('⚠️ No hay correos de destino para escalar pedidos pendientes');
      return new Response(
        JSON.stringify({ success: true, escalated: 0, reason: 'no_recipients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) throw new Error('RESEND_API_KEY no configurada');
    const resend = new Resend(apiKey);

    const siteUrl = Deno.env.get('APP_URL') ?? 'https://app.paganosburger.cl';

    let escalated = 0;

    for (const order of orders) {
      const minutes = Math.max(
        ESCALATION_MINUTES,
        Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
      );
      const orderType = order.fulfillment === 'delivery' ? 'Delivery' : 'Retiro';
      const totalFormatted = Number(order.total ?? 0).toLocaleString('es-CL');

      const { error: emailError } = await resend.emails.send({
        from: 'Paganos Burger <sistema@paganosburger.cl>',
        to: recipients,
        subject: `⚠️ Pedido #${order.order_number} sin aceptar hace ${minutes} min`,
        html: `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#0d0d0d;padding:32px;">
          <div style="max-width:560px;margin:0 auto;background:#1a0000;border:1px solid #3d0000;border-radius:6px;padding:32px;color:#ffffff;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:4px;color:#E11D2C;text-transform:uppercase;font-weight:bold;">Alerta de pedido</p>
            <h1 style="margin:0 0 16px 0;font-size:26px;">Pedido #${order.order_number} sin aceptar</h1>
            <p style="margin:0 0 20px 0;color:#d6d6d6;font-size:15px;line-height:1.6;">
              Este pedido lleva <strong>${minutes} minutos</strong> esperando aceptación en el POS.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:15px;color:#ffffff;">
              <tr><td style="padding:6px 0;color:#9a9a9a;">Tipo</td><td style="padding:6px 0;text-align:right;">${orderType}</td></tr>
              <tr><td style="padding:6px 0;color:#9a9a9a;">Total</td><td style="padding:6px 0;text-align:right;">$${totalFormatted}</td></tr>
            </table>
            <p style="margin:28px 0 0 0;">
              <a href="${siteUrl}/pos/ventas" style="display:inline-block;background:#E11D2C;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;">Abrir el POS</a>
            </p>
          </div>
        </div>`,
      });

      if (emailError) {
        console.error(`❌ Error enviando correo del pedido ${order.order_number}:`, emailError);
        continue;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ acceptance_email_sent_at: new Date().toISOString() })
        .eq('id', order.id);

      if (updateError) {
        console.error(`❌ Error marcando pedido ${order.order_number} como escalado:`, updateError);
      }

      escalated++;
    }

    return new Response(
      JSON.stringify({ success: true, escalated, recipients: recipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ escalate-pending-orders error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
