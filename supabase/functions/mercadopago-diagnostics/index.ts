import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticsResult {
  publicKey: {
    configured: boolean;
    valid: boolean;
    error?: string;
  };
  accessToken: {
    configured: boolean;
    valid: boolean;
    error?: string;
  };
  clientId: {
    configured: boolean;
  };
  clientSecret: {
    configured: boolean;
  };
  mode: 'sandbox' | 'production';
  overall: 'success' | 'partial' | 'error';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtener configuración de la base de datos
    const { data: settings, error: settingsError } = await supabase
      .from('online_order_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('No se pudo obtener la configuración');
    }

    const result: DiagnosticsResult = {
      publicKey: {
        configured: false,
        valid: false,
      },
      accessToken: {
        configured: false,
        valid: false,
      },
      clientId: {
        configured: false,
      },
      clientSecret: {
        configured: false,
      },
      mode: settings.mp_mode || 'sandbox',
      overall: 'error',
    };

    // Verificar Public Key
    if (settings.mp_public_key) {
      result.publicKey.configured = true;
      const publicKeyValid = settings.mp_public_key.startsWith('APP_USR') || 
                            settings.mp_public_key.startsWith('TEST-');
      result.publicKey.valid = publicKeyValid;
      if (!publicKeyValid) {
        result.publicKey.error = 'Formato de Public Key inválido';
      }
    } else {
      result.publicKey.error = 'Public Key no configurada';
    }

    // Verificar Access Token
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (accessToken) {
      result.accessToken.configured = true;

      // Validar Access Token contra API de MercadoPago
      try {
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments/search', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (mpResponse.ok || mpResponse.status === 400) {
          // 400 puede ser por parámetros faltantes, pero el token es válido
          result.accessToken.valid = true;
        } else if (mpResponse.status === 401) {
          result.accessToken.valid = false;
          result.accessToken.error = 'Access Token inválido o expirado';
        } else {
          result.accessToken.valid = false;
          result.accessToken.error = `Error ${mpResponse.status}`;
        }
      } catch (error) {
        console.error('Error validating Access Token:', error);
        result.accessToken.valid = false;
        result.accessToken.error = 'No se pudo validar con MercadoPago';
      }
    } else {
      result.accessToken.error = 'Access Token no configurado en secrets';
    }

    // Verificar Client ID y Client Secret
    result.clientId.configured = !!settings.mp_client_id;
    result.clientSecret.configured = !!settings.mp_client_secret;

    // Determinar estado general
    const allValid = result.publicKey.valid && 
                    result.accessToken.valid && 
                    result.clientId.configured && 
                    result.clientSecret.configured;
    
    const someValid = result.publicKey.configured || 
                     result.accessToken.configured || 
                     result.clientId.configured || 
                     result.clientSecret.configured;

    if (allValid) {
      result.overall = 'success';
    } else if (someValid) {
      result.overall = 'partial';
    } else {
      result.overall = 'error';
    }

    console.log('Diagnostics result:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in diagnostics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
