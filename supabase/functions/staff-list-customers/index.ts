import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const QueryParamsSchema = z.object({
  q: z.string().max(100).regex(/^[a-zA-Z0-9\s\-@.áéíóúñÑüÜ]*$/).optional(),
  estado: z.enum(['Activo', 'Inactivo', 'Bloqueado']).optional(),
  hasRunas: z.enum(['true', 'false']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).max(10000).default(0),
});

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
      return new Response(JSON.stringify({ error: "Invalid session" }), { 
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    if (new Date(session.expires_at) < new Date()) {
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
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    // 4. Parsear y validar parámetros de consulta
    const url = new URL(req.url);
    
    let params;
    try {
      params = QueryParamsSchema.parse({
        q: url.searchParams.get("q") || undefined,
        estado: url.searchParams.get("estado") || undefined,
        hasRunas: url.searchParams.get("hasRunas") || undefined,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 20,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      });
    } catch (validationError) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid query parameters",
          details: validationError instanceof z.ZodError ? validationError.errors : undefined
        }), 
        { 
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        }
      );
    }

    const { q, estado, hasRunas, limit, offset } = params;

    // 5. Construir query
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
      return new Response(JSON.stringify({ error: "Database error" }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ data, count, limit, offset }), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error" }), { 
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }
});
