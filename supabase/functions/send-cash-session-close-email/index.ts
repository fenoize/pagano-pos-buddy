// Sends a HTML email to admins when a cash session is closed.
// Triggered by a Postgres AFTER UPDATE trigger via pg_net.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtCLP = (n: number) =>
  "$" + Math.round(Number(n) || 0).toLocaleString("es-CL").replace(/,/g, ".");

const escapeHtml = (s: string) =>
  (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function fmtDateTimeCL(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function fmtTimeCL(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id required");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Session + cashier + branch
    const { data: session, error: sErr } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session || !session.closed_at) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_session_or_open" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: cajero }, { data: branch }] = await Promise.all([
      supabase.from("users").select("username, full_name, email").eq("id", session.user_id).maybeSingle(),
      supabase.from("branches").select("name").eq("id", session.branch_id).maybeSingle(),
    ]);
    const cajeroNombre = cajero?.full_name || cajero?.username || "Cajero";
    const branchName = branch?.name || "Sucursal";

    // 2. Orders of the shift
    const { data: orders } = await supabase
      .from("orders")
      .select("order_number, fulfillment, total, created_at, payment_efectivo, payment_mp, payment_pos, payment_aplicacion, status")
      .eq("branch_id", session.branch_id)
      .gte("created_at", session.opened_at)
      .lte("created_at", session.closed_at)
      .neq("status", "Cancelado")
      .order("created_at", { ascending: true });

    const list = orders || [];
    const summary = {
      total_pedidos: list.length,
      total_ventas: 0,
      sum_efectivo: 0,
      ventas_efectivo: 0,
      sum_mp: 0,
      ventas_mp: 0,
      sum_pos: 0,
      ventas_pos: 0,
      sum_aplicacion: 0,
      ventas_aplicacion: 0,
      ventas_mixtas: 0,
    };
    for (const o of list) {
      const ef = Number(o.payment_efectivo) || 0;
      const mp = Number(o.payment_mp) || 0;
      const pos = Number(o.payment_pos) || 0;
      const ap = Number(o.payment_aplicacion) || 0;
      summary.total_ventas += Number(o.total) || 0;
      summary.sum_efectivo += ef;
      summary.sum_mp += mp;
      summary.sum_pos += pos;
      summary.sum_aplicacion += ap;
      const methods = (ef > 0 ? 1 : 0) + (mp > 0 ? 1 : 0) + (pos > 0 ? 1 : 0) + (ap > 0 ? 1 : 0);
      if (ef > 0 && mp === 0 && pos === 0 && ap === 0) summary.ventas_efectivo++;
      if (mp > 0) summary.ventas_mp++;
      if (pos > 0) summary.ventas_pos++;
      if (ap > 0) summary.ventas_aplicacion++;
      if (methods > 1) summary.ventas_mixtas++;
    }

    // 3. Cash movements
    const { data: movements } = await supabase
      .from("cash_movements")
      .select("amount, note, type, created_at")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    // 4. Admin emails
    const { data: admins } = await supabase
      .from("users")
      .select("email")
      .eq("role", "Administrador")
      .eq("active", true)
      .not("email", "is", null);
    const adminEmails = (admins || [])
      .map((a: any) => a.email)
      .filter((e: string) => !!e && /.+@.+\..+/.test(e));
    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Build HTML
    const detailUrl = `https://app.paganosburger.cl/pos/cierres-diarios?session=${session.id}`;
    const periodLabel = `${fmtDateTimeCL(session.opened_at)} → ${fmtTimeCL(session.closed_at)}`;
    const subject = `🔒 Cierre de Turno — ${cajeroNombre} | ${fmtDateTimeCL(session.closed_at)}`;

    const ordersToShow = list.slice(0, 50);
    const ordersExtra = Math.max(0, list.length - 50);

    const ordersRows = ordersToShow
      .map((o: any, i: number) => {
        const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
        const tipo = o.fulfillment === "delivery" ? "Delivery" : "Retiro";
        return `
          <tr style="background:${bg};">
            <td style="padding:10px 12px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">#${o.order_number}</td>
            <td style="padding:10px 12px;color:#555;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">${tipo}</td>
            <td style="padding:10px 12px;color:#555;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">${fmtTimeCL(o.created_at)}</td>
            <td align="right" style="padding:10px 12px;color:#1a1a1a;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">${fmtCLP(o.total)}</td>
          </tr>`;
      })
      .join("");

    const movementsHtml = (movements && movements.length > 0)
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">
          <tr><td style="padding:24px;">
            <h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">Movimientos de Caja (${movements.length})</h2>
            ${movements.map((m: any) => {
              const isEgreso = String(m.type).toLowerCase().includes("egreso") || Number(m.amount) < 0;
              const color = isEgreso ? "#dc2626" : "#16a34a";
              const arrow = isEgreso ? "↓" : "↑";
              const sign = isEgreso ? "-" : "+";
              const amt = Math.abs(Number(m.amount) || 0);
              return `
                <div style="display:block;padding:12px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">
                  <div style="font-size:13px;color:#1a1a1a;">
                    <span style="color:${color};font-weight:700;">${arrow} ${escapeHtml(String(m.type || ''))}</span>
                    <span style="color:#888;font-size:11px;margin-left:8px;">${fmtDateTimeCL(m.created_at)}</span>
                  </div>
                  <div style="font-size:12px;color:#555;margin-top:4px;">${escapeHtml(m.note || '')}</div>
                  <div style="font-size:14px;color:${color};font-weight:700;margin-top:4px;">${sign}${fmtCLP(amt)}</div>
                </div>`;
            }).join("")}
          </td></tr>
        </table>`
      : "";

    const obsHtml = session.observaciones && String(session.observaciones).trim()
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin:16px;width:calc(100% - 32px);">
          <tr><td style="padding:16px;">
            <h2 style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:14px;color:#92400e;">Observaciones</h2>
            <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;white-space:pre-wrap;">${escapeHtml(session.observaciones)}</p>
          </td></tr>
        </table>`
      : "";

    const html = `
<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cierre de Turno</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#f4f4f4;">

        <!-- HEADER -->
        <tr><td style="background:#1a1a1a;padding:24px;border-radius:8px 8px 0 0;">
          <div style="font-family:Arial,sans-serif;color:#cc2525;font-weight:700;font-size:22px;letter-spacing:1px;">PAGANOS BURGER</div>
          <div style="font-family:Arial,sans-serif;color:#ffffff;font-size:14px;margin-top:4px;">Cierre de Turno</div>
          <div style="font-family:Arial,sans-serif;color:#cccccc;font-size:12px;margin-top:12px;">
            <strong style="color:#fff;">${escapeHtml(cajeroNombre)}</strong> &nbsp;|&nbsp; ${escapeHtml(branchName)} &nbsp;|&nbsp; ${periodLabel}
          </div>
        </td></tr>

        <!-- RESUMEN FINANCIERO -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">
            <tr><td style="padding:24px;">
              <h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">$ Resumen Financiero</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- IZQUIERDA -->
                  <td valign="top" width="50%" style="padding-right:12px;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;">
                    <div style="padding:6px 0;"><span style="color:#666;">Efectivo Inicial:</span> <strong style="float:right;">${fmtCLP(session.opening_cash)}</strong></div>
                    <div style="padding:6px 0;"><span style="color:#666;">Efectivo Final:</span> <strong style="float:right;">${fmtCLP(session.closing_cash || 0)}</strong></div>
                    <div style="border-top:1px solid #eee;margin-top:6px;padding-top:10px;">
                      <span style="color:#1a1a1a;font-weight:700;">Total Ventas:</span>
                      <strong style="float:right;color:#1a1a1a;">${fmtCLP(summary.total_ventas)}</strong>
                    </div>
                  </td>
                  <!-- DERECHA -->
                  <td valign="top" width="50%" style="padding-left:12px;font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;border-left:1px solid #f0f0f0;">
                    <div style="padding:5px 0;"><span style="color:#555;">Efectivo</span> <strong style="float:right;">${fmtCLP(summary.sum_efectivo)} <span style="color:#888;font-weight:400;">· ${summary.ventas_efectivo}</span></strong></div>
                    <div style="padding:5px 0;"><span style="color:#555;">Mercado Pago</span> <strong style="float:right;">${fmtCLP(summary.sum_mp)} <span style="color:#888;font-weight:400;">· ${summary.ventas_mp}</span></strong></div>
                    <div style="padding:5px 0;"><span style="color:#555;">POS (Tarjeta)</span> <strong style="float:right;">${fmtCLP(summary.sum_pos)} <span style="color:#888;font-weight:400;">· ${summary.ventas_pos}</span></strong></div>
                    <div style="padding:5px 0;"><span style="color:#555;">App (Uber/PY)</span> <strong style="float:right;">${fmtCLP(summary.sum_aplicacion)} <span style="color:#888;font-weight:400;">· ${summary.ventas_aplicacion}</span></strong></div>
                    <div style="padding:5px 0;"><span style="color:#555;">Pagos Mixtos</span> <strong style="float:right;color:#888;">— <span style="color:#888;font-weight:400;">· ${summary.ventas_mixtas}</span></strong></div>
                  </td>
                </tr>
              </table>
              <div style="border-top:1px solid #eee;margin-top:16px;padding-top:14px;font-family:Arial,sans-serif;">
                <span style="font-size:14px;color:#1a1a1a;font-weight:700;">Total Ventas Real:</span>
                <strong style="float:right;font-size:18px;color:#cc2525;">${fmtCLP(summary.total_ventas)}</strong>
                <div style="clear:both;"></div>
                <div style="font-size:11px;color:#888;margin-top:4px;">Total sin incluir runas canjeadas</div>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- PEDIDOS -->
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">
            <tr><td style="padding:24px;">
              <h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">Pedidos del Turno (${list.length})</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background:#1a1a1a;color:#ffffff;">
                    <th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;"># Orden</th>
                    <th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Tipo</th>
                    <th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Hora</th>
                    <th align="right" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Total</th>
                  </tr>
                </thead>
                <tbody>${ordersRows || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#888;font-family:Arial,sans-serif;font-size:13px;">Sin pedidos en este turno.</td></tr>`}</tbody>
              </table>
              ${ordersExtra > 0 ? `<p style="margin:12px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#888;text-align:center;">+ ${ordersExtra} pedidos adicionales. Ver detalle completo en el sistema.</p>` : ''}
            </td></tr>
          </table>
        </td></tr>

        ${movementsHtml}
        ${obsHtml}

        <!-- FOOTER -->
        <tr><td style="background:#1a1a1a;padding:24px;text-align:center;border-radius:0 0 8px 8px;margin:16px;">
          <a href="${detailUrl}" style="display:inline-block;background:#cc2525;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Ver detalle en el sistema →</a>
          <div style="font-family:Arial,sans-serif;font-size:11px;color:#888;margin-top:16px;">Paganos Burger · Reporte automático de cierre de turno</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

    // 6. Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Paganos Burger <sistema@notify.paganosburger.cl>",
        to: adminEmails,
        subject,
        html,
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error("Resend error", res.status, body);
      return new Response(JSON.stringify({ error: body, status: res.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, recipients: adminEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-cash-session-close-email error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
