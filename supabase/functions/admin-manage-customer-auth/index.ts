import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-staff-token',
};

interface ManageAuthRequest {
  action:
    | 'resend_verification'
    | 'confirm_email'
    | 'update_password'
    | 'update_email'
    | 'activate_credentials'
    | 'get_auth_status';
  customer_id: string;
  new_password?: string;
  new_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Verify staff token
    const staffToken = req.headers.get('x-staff-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!staffToken) {
      return new Response(
        JSON.stringify({ error: 'No autorizado - Token requerido' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate staff session
    const { data: session, error: sessionError } = await supabase
      .from('staff_sessions')
      .select('user_id, expires_at')
      .eq('token', staffToken)
      .maybeSingle();

    if (sessionError || !session) {
      console.error('Session validation error:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sesión inválida o expirada' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check session expiry
    if (new Date(session.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Sesión expirada' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Verify admin role
    const { data: staffUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user_id)
      .single();

    if (userError || !staffUser) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (staffUser.role !== 'Administrador') {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores pueden gestionar cuentas de clientes' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { action, customer_id, new_password, new_email }: ManageAuthRequest = await req.json();

    if (!action || !customer_id) {
      return new Response(
        JSON.stringify({ error: 'Acción y customer_id son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get customer with auth_user_id
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, auth_user_id, email, nombres, apellidos')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      return new Response(
        JSON.stringify({ error: 'Cliente no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // For get_auth_status, we need to check auth.users even if auth_user_id is null
    if (action === 'get_auth_status') {
      if (!customer.auth_user_id) {
        return new Response(
          JSON.stringify({ 
            has_auth_account: false,
            email_confirmed: false,
            email: customer.email,
            message: 'Cliente sin cuenta de autenticación'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get auth user details
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(customer.auth_user_id);

      if (authError || !authUser?.user) {
        return new Response(
          JSON.stringify({ 
            has_auth_account: false,
            email_confirmed: false,
            email: customer.email,
            message: 'Cuenta de autenticación no encontrada'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({
          has_auth_account: true,
          email_confirmed: !!authUser.user.email_confirmed_at,
          email_confirmed_at: authUser.user.email_confirmed_at,
          email: authUser.user.email,
          last_sign_in: authUser.user.last_sign_in_at,
          created_at: authUser.user.created_at,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // For other actions, auth_user_id is required
    if (!customer.auth_user_id) {
      return new Response(
        JSON.stringify({ error: 'Este cliente no tiene una cuenta de autenticación vinculada' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validación extra: verificar que el usuario de Auth existe (evita estados “fantasma”)
    const { data: existingAuthUser, error: existingAuthUserError } = await supabase.auth.admin.getUserById(customer.auth_user_id);
    if (existingAuthUserError || !existingAuthUser?.user) {
      return new Response(
        JSON.stringify({ error: 'La cuenta de Auth vinculada no existe (auth_user_id inválido). Debes re-registrar al cliente o vincularlo nuevamente.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    switch (action) {
      case 'resend_verification': {
        // Get the user's email
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(customer.auth_user_id);
        
        if (authError || !authUser?.user?.email) {
          return new Response(
            JSON.stringify({ error: 'No se pudo obtener el email del usuario' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        if (authUser.user.email_confirmed_at) {
          return new Response(
            JSON.stringify({ error: 'El email ya está verificado' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Generate a new invite/magic link for verification
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: authUser.user.email,
          options: {
            redirectTo: `${req.headers.get('origin') || 'https://pagano-pos-buddy.lovable.app'}/`,
          }
        });

        if (inviteError) {
          console.error('Error generating verification link:', inviteError);
          return new Response(
            JSON.stringify({ error: 'Error al generar enlace de verificación' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Send the verification email using Resend if available
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey && inviteData?.properties?.action_link) {
          try {
            const { Resend } = await import("npm:resend@2.0.0");
            const resend = new Resend(resendApiKey);

            await resend.emails.send({
              from: 'Paganos Burger <noreply@resend.dev>',
              to: [authUser.user.email],
              subject: '🎮 Activa tu cuenta - Paganos Burger',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1c1e21; color: #fff; padding: 40px;">
                  <h2 style="color: #cc2525;">¡Activa tu cuenta y comienza tu aventura!</h2>
                  <p>Hola ${customer.nombres || 'Aventurero'},</p>
                  <p>Un administrador ha reenviado tu enlace de verificación.</p>
                  <p>Haz clic en el siguiente botón para verificar tu cuenta:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteData.properties.action_link}" 
                       style="background: #cc2525; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Verificar mi cuenta
                    </a>
                  </div>
                  <p style="color: #888; font-size: 12px;">Este enlace expira en 24 horas.</p>
                  <hr style="border-color: #333; margin: 30px 0;">
                  <p style="color: #666; font-size: 12px;">Paganos Burger - Tu aventura gastronómica</p>
                </div>
              `,
            });
          } catch (emailError) {
            console.error('Error sending email via Resend:', emailError);
            // Continue anyway, the link was generated
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Correo de verificación reenviado',
            verification_link: inviteData?.properties?.action_link // For debugging, remove in production
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'confirm_email': {
        // Force confirm the user's email
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          customer.auth_user_id,
          { email_confirm: true }
        );

        if (updateError) {
          console.error('Error confirming email:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error al confirmar email' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email confirmado correctamente',
            email_confirmed_at: updateData?.user?.email_confirmed_at
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'update_password': {
        if (!new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          customer.auth_user_id,
          {
            password: new_password,
            // Asegura que quede activo y funcional en flujos donde el email confirmation bloquea al cliente
            email_confirm: true,
          }
        );

        if (passwordError) {
          console.error('Error updating password:', passwordError);
          return new Response(
            JSON.stringify({ error: 'Error al actualizar contraseña' }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Contraseña actualizada correctamente' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'update_email': {
        if (!new_email || !new_email.includes('@')) {
          return new Response(
            JSON.stringify({ error: 'Email inválido' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const targetEmail = new_email.trim().toLowerCase();

        // Update email in Supabase Auth
        const { error: emailError } = await supabase.auth.admin.updateUserById(
          customer.auth_user_id,
          { email: targetEmail, email_confirm: true }
        );

        if (emailError) {
          console.error('Error updating email:', emailError);
          return new Response(
            JSON.stringify({ error: 'Error al actualizar email en Auth: ' + emailError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Also update email in customers table
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({ email: targetEmail })
          .eq('id', customer_id);

        if (customerUpdateError) {
          console.error('Error updating customer email:', customerUpdateError);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Email actualizado correctamente' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      case 'activate_credentials': {
        if (!new_email || !new_email.includes('@')) {
          return new Response(
            JSON.stringify({ error: 'Email inválido' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        if (!new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const targetEmail = new_email.trim().toLowerCase();

        // Database-first check: re-leer usuario de Auth para evitar estados stale
        const { data: freshAuthUser, error: freshAuthError } = await supabase.auth.admin.getUserById(customer.auth_user_id);
        if (freshAuthError || !freshAuthUser?.user) {
          return new Response(
            JSON.stringify({ error: 'Cuenta de Auth no encontrada (posible eliminación previa)' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(customer.auth_user_id, {
          email: targetEmail,
          password: new_password,
          email_confirm: true,
        });

        if (updateError) {
          console.error('Error activating credentials:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error al activar credenciales: ' + updateError.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Mantener customers.email sincronizado
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({ email: targetEmail, estado_cliente: 'Activo' })
          .eq('id', customer_id);

        if (customerUpdateError) {
          console.error('Error syncing customer after activate:', customerUpdateError);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Acceso activado: email y contraseña actualizados, email verificado.' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Acción no válida' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }

  } catch (error) {
    console.error('Error in admin-manage-customer-auth:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
