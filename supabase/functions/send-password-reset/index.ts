import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email?: string;
  username?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, username }: PasswordResetRequest = await req.json();
    
    if (!email && !username) {
      return new Response(
        JSON.stringify({ error: 'Email o usuario requerido' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email or username
    let query = supabase
      .from('users')
      .select('id, username, email, full_name')
      .eq('active', true);

    if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('username', username);
    }

    const { data: user, error: userError } = await query.maybeSingle();

    if (userError || !user) {
      console.log('User not found:', email || username);
      // Return success even if user not found (security measure)
      return new Response(
        JSON.stringify({ success: true, message: 'Si el usuario existe, recibirá un código por email' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!user.email) {
      console.log('User has no email:', user.username);
      return new Response(
        JSON.stringify({ error: 'Usuario no tiene email configurado' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up old codes for this user
    await supabase
      .from('password_reset_codes')
      .delete()
      .eq('user_id', user.id);

    // Save new code
    const { error: saveError } = await supabase
      .from('password_reset_codes')
      .insert({
        user_id: user.id,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (saveError) {
      console.error('Error saving reset code:', saveError);
      return new Response(
        JSON.stringify({ error: 'Error interno del servidor' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Send email using Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const emailResponse = await resend.emails.send({
      from: 'Paganos POS <noreply@resend.dev>',
      to: [user.email],
      subject: 'Código de recuperación de contraseña - Paganos POS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Recuperación de Contraseña</h2>
          <p>Hola ${user.full_name || user.username},</p>
          <p>Has solicitado restablecer tu contraseña en Paganos POS.</p>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px;">${code}</span>
          </div>
          <p>Este código expira en 10 minutos.</p>
          <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">Paganos Burger - Sistema POS</p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: 'Código enviado por email' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('Error in send-password-reset function:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);