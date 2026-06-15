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
- orders: id, total, payment_method, source, sales_channel_slug, external_order_id, customer_id, branch_id, created_at, status
- customers: id, nombres, apellidos, email, phone, is_vip, created_at, auth_user_id
- cash_sessions: id, branch_id, opened_at, closed_at, opening_cash, closing_cash, observaciones
- cash_movements: id, session_id, type, amount, note, created_at
- runas_transactions: id, customer_id, order_id, amount, type, created_at
- customer_points_log: id, customer_id, order_id, points, created_at
- products: id, name, active, show_in_app, category
- config: key, value (contiene runas_exclude_if_discounted, runa_value, runa_reward_value, max_runas_per_order, etc.)
- users: id, name, email, role
- sales_channels: id, name, slug, type, active
- loyalty_campaigns: id, name, active
- coupons: id, code, active, discount_type, discount_value
- combo_products: id, product_id, base_price, pricing_mode

Cuando respondas con datos numéricos, formatea los valores en pesos chilenos (ej: $18.990). Sé directo y conciso. Tono profesional, no generes texto innecesario.`;

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
        throw new Error(`Gateway ${res.status}: ${txt}`);
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
  } catch (err) {
    console.error("lia-query error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
