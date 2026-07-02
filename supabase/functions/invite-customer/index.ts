import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://pagano-pos-buddy.lovable.app";
    const loginUrl = `${siteUrl}/login`;

    // Enviar email de invitación con Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { error: emailError } = await resend.emails.send({
      from: "Paganos Burger <noreply@resend.dev>",
      to: [email],
      subject: "⚔️ Has sido convocado al Clan Pagano",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Clan Pagano</title>
        </head>
        <body style="margin:0;padding:0;background-color:#0d0d0d;font-family:'Arial',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding:0 0 32px 0;">
                      <p style="margin:0;font-size:13px;letter-spacing:6px;color:#8B0000;text-transform:uppercase;font-weight:bold;">
                        ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ
                      </p>
                      <h1 style="margin:12px 0 0 0;font-size:36px;font-weight:900;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">
                        PAGANOS BURGER
                      </h1>
                    </td>
                  </tr>

                  <!-- Card principal -->
                  <tr>
                    <td style="background-color:#1a0000;border:1px solid #3d0000;border-radius:4px;padding:48px 40px;">

                      <!-- Título -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding-bottom:32px;">
                            <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:5px;color:#E11D2C;text-transform:uppercase;font-weight:bold;">
                              CONVOCATORIA
                            </p>
                            <h2 style="margin:0;font-size:30px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:1px;line-height:1.2;">
                              FUISTE ELEGIDO
                            </h2>
                          </td>
                        </tr>

                        <!-- Cuerpo -->
                        <tr>
                          <td style="padding-bottom:32px;border-bottom:1px solid #3d0000;">
                            <p style="margin:0 0 16px 0;font-size:16px;color:#cccccc;line-height:1.7;">
                              Alguien del Clan Pagano creyó que eres material.
                            </p>
                            <p style="margin:0 0 16px 0;font-size:16px;color:#cccccc;line-height:1.7;">
                              Los Paganos no nacen — se forjan. Únete a nuestra app, acumula <strong style="color:#E11D2C;">Runas</strong>, desbloquea recompensas exclusivas y forma parte de la leyenda.
                            </p>
                            <p style="margin:0;font-size:15px;color:#999999;line-height:1.7;">
                              Smash burgers de culto. Comunidad real. Una sola app.
                            </p>
                          </td>
                        </tr>

                        <!-- CTA -->
                        <tr>
                          <td align="center" style="padding-top:40px;padding-bottom:40px;">
                            <a href="${loginUrl}"
                               style="display:inline-block;background-color:#E11D2C;color:#ffffff;text-decoration:none;font-size:15px;font-weight:900;letter-spacing:3px;text-transform:uppercase;padding:18px 48px;border-radius:2px;">
                              UNIRME AL CLAN
                            </a>
                          </td>
                        </tr>

                        <!-- Nota -->
                        <tr>
                          <td align="center">
                            <p style="margin:0;font-size:12px;color:#555555;line-height:1.6;">
                              Si no esperabas este correo, puedes ignorarlo.<br/>
                              No es necesario hacer nada si no deseas registrarte.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding:32px 0 0 0;">
                      <p style="margin:0 0 4px 0;font-size:12px;color:#444444;letter-spacing:2px;text-transform:uppercase;">
                        PAGANOS BURGER · SANTIAGO DE CHILE
                      </p>
                      <p style="margin:0;font-size:11px;color:#333333;letter-spacing:1px;">
                        ᚠᚢᚦᚨᚱᚲ
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (emailError) throw emailError;

    // Registrar en log (falla silenciosamente)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error: logError } = await supabaseAdmin.rpc("log_customer_invitation", {
      p_email: email,
      p_invited_by: invited_by ?? null,
    });
    if (logError) console.error("Log fallido:", logError.message);

    return new Response(JSON.stringify({ success: true }), {
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
