import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Extraer token de header Authorization
    const auth = req.headers.get("authorization") || "";
    const token = auth.toLowerCase().startsWith("bearer ") 
      ? auth.slice(7).trim() 
      : "";

    if (!token) {
      console.warn('[AUTH] Missing token');
      return new Response(JSON.stringify({ error: "Missing token" }), { 
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Cliente admin con service_role_key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2. Validar sesión
    const { data: session, error: sErr } = await supabaseAdmin
      .from("staff_sessions")
      .select("user_id, expires_at, is_active")
      .eq("token", token)
      .maybeSingle();

    if (sErr || !session || !session.is_active) {
      console.warn('[AUTH] Invalid session:', { token: token.slice(0, 8), error: sErr });
      return new Response(JSON.stringify({ error: "Invalid session" }), { 
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    if (new Date(session.expires_at) < new Date()) {
      console.warn('[AUTH] Expired session:', { token: token.slice(0, 8) });
      return new Response(JSON.stringify({ error: "Expired session" }), { 
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    const userId = session.user_id;

    // 3. Validar permisos (admin o customers.view/customers.manage)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roleList = (roles || []).map((r: any) => r.role);
    const isAdmin = roleList.includes("Administrador");

    let canView = isAdmin;
    if (!canView) {
      const { data: perms } = await supabaseAdmin
        .from("role_permissions")
        .select("permission")
        .in("role", roleList);

      const permSet = new Set((perms || []).map((p: any) => p.permission));
      canView = permSet.has("customers.view") || permSet.has("customers.manage");
    }

    if (!canView) {
      console.warn('[AUTHZ] User lacks permission:', { userId, roles: roleList });
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 4. Parsear parámetros de consulta
    const url = new URL(req.url);
    const id = url.searchParams.get("id") || undefined; // Búsqueda exacta por ID
    const q = (url.searchParams.get("q") || "").trim();
    const estado = url.searchParams.get("estado") || undefined;
    const hasRunas = url.searchParams.get("hasRunas") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

    // 5. Si se proporciona ID, buscar directamente por ID (para escaneo QR)
    if (id) {
      const { data, error } = await supabaseAdmin
        .from("customers")
        .select(`
          id,
          nombres,
          apellidos,
          name,
          apellido,
          email,
          phone,
          rut,
          cantidad_runas,
          valor_cliente,
          estado_cliente,
          ultima_compra,
          created_at,
          updated_at,
          addresses (
            id,
            customer_id,
            alias,
            calle,
            numero,
            depto,
            comuna,
            ciudad,
            observaciones,
            is_default,
            created_at,
            updated_at
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error('[DB] Query by ID error:', error);
        return new Response(JSON.stringify({ error: "Database error" }), { 
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      console.log(`[AUDIT] User ${userId} looked up customer by ID: ${id} (found: ${!!data})`);

      return new Response(JSON.stringify({ 
        data: data ? [data] : [], 
        count: data ? 1 : 0, 
        limit: 1, 
        offset: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // 6. Construir query para búsqueda general
    let query = supabaseAdmin
      .from("customers")
      .select(`
        id,
        nombres,
        apellidos,
        name,
        apellido,
        email,
        phone,
        rut,
        cantidad_runas,
        valor_cliente,
        estado_cliente,
        ultima_compra,
        created_at,
        updated_at,
        addresses (
          id,
          customer_id,
          alias,
          calle,
          numero,
          depto,
          comuna,
          ciudad,
          observaciones,
          is_default,
          created_at,
          updated_at
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (q) {
      const searchPattern = `%${q}%`;
      query = query.or(`nombres.ilike.${searchPattern},apellidos.ilike.${searchPattern},name.ilike.${searchPattern},apellido.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},rut.ilike.${searchPattern}`);
    }

    if (estado) {
      query = query.eq("estado_cliente", estado);
    }

    if (hasRunas === 'true') {
      query = query.gt("cantidad_runas", 0);
    } else if (hasRunas === 'false') {
      query = query.eq("cantidad_runas", 0);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[DB] Query error:', error);
      return new Response(JSON.stringify({ error: "Database error" }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 6. Log de auditoría
    console.log(`[AUDIT] User ${userId} accessed customers list (count: ${count}, filters: ${JSON.stringify({ q, estado, hasRunas })})`);

    return new Response(JSON.stringify({ data, count, limit, offset }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  } catch (e) {
    console.error('[ERROR]', e);
    return new Response(JSON.stringify({ error: "Internal error" }), { 
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});
