import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invited_by } = await req.json();
    if (!email) throw new Error("El correo es obligatorio");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://pagano-pos-buddy.lovable.app";

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/login`,
      data: { invited_by: invited_by ?? null, type: "customer" },
    });
    if (error) throw error;

    const { error: logError } = await supabaseAdmin.rpc("log_customer_invitation", {
      p_email: email,
      p_invited_by: invited_by ?? null,
    });
    if (logError) console.error("Log fallido:", logError.message);

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
