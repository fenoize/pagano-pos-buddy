import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SORTABLE_COLUMNS = new Set([
  'nombres',
  'email',
  'cantidad_runas',
  'valor_cliente',
  'estado_cliente',
  'ultima_compra',
  'created_at',
]);

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
    const tagId = url.searchParams.get("tagId") || undefined;
    const includeTags = url.searchParams.get("includeTags") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 5000);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
    const sortByParam = url.searchParams.get("sortBy") || "created_at";
    const sortBy = SORTABLE_COLUMNS.has(sortByParam) ? sortByParam : "created_at";
    const sortOrder = (url.searchParams.get("sortOrder") || "desc").toLowerCase() === "asc";

    // Pre-filter by tag: get customer IDs assigned to that tag
    let tagFilteredIds: string[] | null = null;
    if (tagId) {
      const { data: assigns, error: aErr } = await supabaseAdmin
        .from("customer_tag_assignments")
        .select("customer_id")
        .eq("tag_id", tagId);
      if (aErr) {
        console.error('[DB] Tag filter error:', aErr);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }
      tagFilteredIds = (assigns || []).map((a: any) => a.customer_id);
      if (tagFilteredIds.length === 0) {
        return new Response(JSON.stringify({ data: [], count: 0, runas_sum: 0, limit, offset }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }
    }

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
        runas_sum: data?.cantidad_runas || 0,
        limit: 1, 
        offset: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    // Helper to apply shared filters to any query builder.
    // For multi-word search (e.g. "diego ulloa"), split into tokens and AND them,
    // so each token can match a different column (name vs apellido, etc.).
    const applyFilters = (qb: any) => {
      if (q) {
        const tokens = q.split(/\s+/).filter(Boolean);
        for (const tok of tokens) {
          const safe = tok.replace(/[,()]/g, ' ');
          const pat = `%${safe}%`;
          qb = qb.or(
            `nombres.ilike.${pat},apellidos.ilike.${pat},name.ilike.${pat},apellido.ilike.${pat},email.ilike.${pat},phone.ilike.${pat},rut.ilike.${pat}`
          );
        }
      }
      if (estado) qb = qb.eq("estado_cliente", estado);
      if (hasRunas === 'true') qb = qb.gt("cantidad_runas", 0);
      else if (hasRunas === 'false') qb = qb.eq("cantidad_runas", 0);
      if (tagFilteredIds) qb = qb.in("id", tagFilteredIds);
      return qb;
    };

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
      .order(sortBy, { ascending: sortOrder, nullsFirst: false })
      .range(offset, offset + limit - 1);

    query = applyFilters(query);

    const { data, count, error } = await query;

    if (error) {
      console.error('[DB] Query error:', error);
      return new Response(JSON.stringify({ error: "Database error" }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // Aggregate sum of cantidad_runas across ALL matching customers (ignore pagination)
    let runas_sum = 0;
    {
      let sumQuery = supabaseAdmin.from("customers").select("cantidad_runas").limit(100000);
      sumQuery = applyFilters(sumQuery);
      const { data: sumRows, error: sumErr } = await sumQuery;
      if (sumErr) {
        console.warn('[DB] Sum query error:', sumErr);
      } else {
        runas_sum = (sumRows || []).reduce((s: number, r: any) => s + (r.cantidad_runas || 0), 0);
      }
    }

    // Optionally hydrate tags for each customer
    let dataWithTags: any = data;
    if (includeTags && data && data.length > 0) {
      const ids = data.map((c: any) => c.id);
      const { data: tagAssigns } = await supabaseAdmin
        .from("customer_tag_assignments")
        .select("customer_id, tag:customer_tags(id, name, color)")
        .in("customer_id", ids);
      const byCustomer: Record<string, any[]> = {};
      (tagAssigns || []).forEach((a: any) => {
        if (!byCustomer[a.customer_id]) byCustomer[a.customer_id] = [];
        if (a.tag) byCustomer[a.customer_id].push(a.tag);
      });
      dataWithTags = data.map((c: any) => ({ ...c, tags: byCustomer[c.id] || [] }));
    }

    // 7. Log de auditoría
    console.log(`[AUDIT] User ${userId} accessed customers list (count: ${count}, filters: ${JSON.stringify({ q, estado, hasRunas, sortBy, sortOrder })})`);

    return new Response(JSON.stringify({ data: dataWithTags, count, runas_sum, limit, offset }), {
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
