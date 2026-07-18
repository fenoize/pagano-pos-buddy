import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-staff-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SYSTEM_PROMPT = `Eres ATENEA, asistente de datos interna de Paganos Burger.
Respondes ÚNICAMENTE preguntas sobre los datos, configuraciones y métricas del sistema Paganos. No realizas búsquedas de internet, no respondes preguntas generales, no das consejos fuera del sistema.

Si te preguntan algo que no está en la base de datos de Paganos, responde: "Solo puedo consultarte información del sistema Paganos."

Cuando necesites datos, usa la herramienta run_sql con SQL válido para PostgreSQL/Supabase. Solo puedes usar SELECT. Nunca uses INSERT, UPDATE, DELETE, DROP.

SCHEMA DISPONIBLE:

orders — pedidos del sistema
  id (uuid), order_number (int), customer_id (uuid), branch_id (uuid), cash_session_id (uuid),
  source (text: 'pos'|'customer_app'|'web'), sales_channel_slug (text), external_order_id (text),
  fulfillment (text: 'retiro'|'delivery'), pickup_mode (text: 'servir'|'llevar'),
  subtotal (int, CLP), delivery_fee (int, CLP), discount (int, CLP), total (int, CLP),
  payment_efectivo (int), payment_mp (int), payment_pos (int), payment_aplicacion (int), payment_runas (int),
  payment_method (text), payment_status (text), cash_given (numeric),
  status (text: 'PendientePago'|'PendienteAceptacion'|'Pendiente'|'En preparación'|'En pausa'|'Listo'|'En camino'|'Entregado'|'Cancelado'),
  items (jsonb — array de productos del pedido),
  nombre_resumen (text), customer_name (text), customer_phone (text), notes (text),
  coupon_id (uuid), coupon_code (text),
  delivery_address (text), delivery_number (text), delivery_comuna (text), delivery_zone_name (text),
  delivery_person_id (uuid), delivery_person_name (text),
  delivery_assigned_at (timestamptz), delivery_delivered_at (timestamptz), delivery_distance (numeric),
  receipt_number (text), operation_number (text),
  created_at (timestamptz), updated_at (timestamptz), created_by_user_id (uuid)

customers — clientes registrados
  id (uuid), auth_user_id (uuid),
  nombres (text), apellidos (text), name (text), apellido (text),
  email (text), phone (text), rut (text), fecha_nacimiento (date),
  estado_cliente (text: 'Activo'|'Inactivo'|'Bloqueado'), motivo_estado (text),
  cantidad_runas (int), puntos (int), puntos_lifetime (int),
  valor_cliente (numeric), ultima_compra (timestamptz), is_vip (boolean),
  marketing_opt_in (boolean), created_at (timestamptz)

cash_sessions — turnos de caja
  id (uuid), branch_id (uuid), user_id (uuid),
  opened_at (timestamptz), closed_at (timestamptz, NULL = sesión abierta),
  opening_cash (int, CLP), closing_cash (int, CLP),
  accept_app_orders (boolean), observaciones (text)

cash_movements — movimientos de caja (ingresos/egresos)
  id (uuid), session_id (uuid), branch_id (uuid),
  type (text: 'ingreso'|'egreso'|'transferencia'),
  amount (int, CLP), category (text), note (text), created_at (timestamptz)

runas_transactions — historial de runas
  id (uuid), customer_id (uuid), order_id (uuid),
  type (text: 'acumulacion'|'canje'|'ajuste'|'promo'),
  runas (int), amount (int, CLP),
  origen (text), motivo (text), created_at (timestamptz)

users — usuarios del sistema (staff)
  id (uuid), username (text), full_name (text), email (text),
  role (text: 'Administrador'|'Cajero'|'Cocinero'|'Preparador'|'Reparto'|'Viewer'),
  active (boolean), can_do_delivery (boolean), can_use_lia (boolean),
  created_at (timestamptz)

branches — locales / sucursales
  id (uuid), name (text), address (text),
  is_active (boolean), accepts_online_orders (boolean), timezone (text)

products — productos del menú
  id (uuid), name (text), category (text), active (boolean), show_in_app (boolean)

coupons — cupones de descuento
  id (uuid), code (text), type (text), amount (numeric), description (text),
  is_active (boolean), date_start (timestamptz), date_end (timestamptz),
  usage_limit_total (int), usage_limit_per_customer (int),
  commission_enabled (boolean), commission_type (text), commission_value (numeric)

customer_discount_subscriptions — suscripciones de descuento por cliente
  id (uuid), customer_id (uuid), discount_percent (int),
  is_active (boolean), usage_count (int), usage_limit (int),
  start_date (date), end_date (date), notes (text), created_at (timestamptz)

marketing_push_campaigns — campañas de push marketing
  id (uuid), title (text), message (text), status (text),
  recipients_count (int), sent_count (int), error_count (int),
  created_at (timestamptz), sent_at (timestamptz)

config — configuración del sistema (clave/valor)
  key (text), value (jsonb)
  Claves útiles: 'runa_value', 'runa_reward_value', 'max_runas_per_order', 'onesignal', 'pwa_config'

sales_channels — canales de venta
  id (uuid), name (text), slug (text), type (text), active (boolean)

JOINS ÚTILES:
- orders → customers: orders.customer_id = customers.id
- orders → branches: orders.branch_id = branches.id
- orders → cash_sessions: orders.cash_session_id = cash_sessions.id
- orders → users (cajero): orders.created_by_user_id = users.id
- cash_sessions → users (cajero): cash_sessions.user_id = users.id
- cash_sessions → branches: cash_sessions.branch_id = branches.id
- cash_movements → cash_sessions: cash_movements.session_id = cash_sessions.id
- runas_transactions → customers: runas_transactions.customer_id = customers.id
- runas_transactions → orders: runas_transactions.order_id = orders.id
- customer_discount_subscriptions → customers: customer_discount_subscriptions.customer_id = customers.id

NOTAS IMPORTANTES:
- Todos los montos están en pesos chilenos (CLP) como enteros. Formatea con $ y separadores de miles.
- orders.items es JSONB con los productos del pedido. Usa jsonb_array_elements para desglozarlo.
- Para el nombre del cliente: usa COALESCE(c.nombres || ' ' || c.apellidos, c.name, o.customer_name).
- closed_at IS NULL en cash_sessions significa sesión actualmente abierta.
- status 'Cancelado' en orders excluye ventas reales — filtra con WHERE status != 'Cancelado' para métricas de ventas.
- Para buscar un pedido por número usa order_number (entero), no id.

Cuando respondas con datos numéricos, formatea en pesos chilenos (ej: $18.990). Sé directo y conciso. Tono profesional.`;

const FORBIDDEN = /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|comment|vacuum|reindex|copy|merge|replace)\b/i;

function isSafeSelect(sql: string): boolean {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!/^(select|with)\s/i.test(trimmed)) return false;
  if (FORBIDDEN.test(trimmed)) return false;
  if (trimmed.includes(";")) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization") || "";
    const headerToken = req.headers.get("x-staff-token") || "";
    const token = headerToken || (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: session } = await supabaseAdmin
      .from("staff_sessions")
      .select("user_id, expires_at, is_active")
      .eq("token", token)
      .maybeSingle();

    if (!session || !session.is_active || new Date(session.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user_id);

    const isAdmin = (roles || []).some((r: any) => r.role === "Administrador");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Solo administradores" }), {
        status: 403, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("can_use_lia")
      .eq("id", session.user_id)
      .maybeSingle();

    if (!userRow || !(userRow as any).can_use_lia) {
      return new Response(JSON.stringify({ error: "Tu usuario no tiene habilitado el acceso a LIA" }), {
        status: 403, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const { question, history = [] } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Falta question" }), {
        status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.filter((m: any) => m?.role && m?.content).slice(-10),
      { role: "user", content: question },
    ];

    const tools = [{
      type: "function",
      function: {
        name: "run_sql",
        description: "Ejecuta una consulta SELECT contra la base de datos Paganos. Solo SELECT permitido. Máximo 100 filas.",
        parameters: {
          type: "object",
          properties: { sql: { type: "string", description: "SQL SELECT válido" } },
          required: ["sql"],
        },
      },
    }];

    class GatewayError extends Error {
      status: number;
      constructor(status: number, msg: string) { super(msg); this.status = status; }
    }

    const callGateway = async (msgs: any[]) => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: msgs,
          tools,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new GatewayError(res.status, txt);
      }
      return res.json();
    };

    let convo = messages;
    let finalText = "";
    for (let i = 0; i < 4; i++) {
      const data = await callGateway(convo);
      const msg = data.choices?.[0]?.message;
      if (!msg) break;
      convo.push(msg);

      const calls = msg.tool_calls || [];
      if (!calls.length) {
        finalText = msg.content || "";
        break;
      }

      for (const c of calls) {
        let toolResult: any;
        try {
          const args = JSON.parse(c.function.arguments || "{}");
          const sql: string = args.sql || "";
          if (!isSafeSelect(sql)) {
            toolResult = { error: "No puedo realizar modificaciones a los datos." };
          } else {
            const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("lia_execute_select", { query_text: sql });
            if (rpcError) toolResult = { error: rpcError.message };
            else toolResult = { rows: rpcData };
          }
        } catch (e) {
          toolResult = { error: (e as Error).message };
        }
        convo.push({
          role: "tool",
          tool_call_id: c.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    return new Response(JSON.stringify({ answer: finalText || "Sin respuesta." }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("lia-query error:", err);
    const status = err?.status;
    if (status === 402) {
      return new Response(JSON.stringify({ answer: "⚠️ Se agotaron los créditos del AI Gateway de Lovable. Pide al administrador del workspace que recargue créditos en Settings → Plans & credits para volver a usar ATENEA." }), {
        status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    if (status === 429) {
      return new Response(JSON.stringify({ answer: "⏳ Demasiadas consultas en este momento. Intenta de nuevo en unos segundos." }), {
        status: 200, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
