import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffPushRequest {
  user_id?: string;
  role_target?: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OneSignal settings from config (keys are stored individually)
    const { data: configRows } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['onesignal_app_id', 'onesignal_enabled', 'pwa_config']);

    const cfg: Record<string, any> = {};
    (configRows ?? []).forEach((row: any) => {
      let value = row.value;
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { /* keep string */ }
      }
      cfg[row.key] = value;
    });

    const oneSignalAppId = cfg['onesignal_app_id'];
    const oneSignalEnabled = cfg['onesignal_enabled'] === true || cfg['onesignal_enabled'] === 'true';

    if (!oneSignalAppId || !oneSignalEnabled) {
      console.log('OneSignal not configured or disabled');
      return new Response(
        JSON.stringify({ success: false, reason: 'OneSignal not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oneSignalApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY') ?? Deno.env.get('ONESIGNAL_API_KEY');

    if (!oneSignalApiKey) {
      console.log('OneSignal API key not set');
      return new Response(
        JSON.stringify({ success: false, reason: 'OneSignal API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: StaffPushRequest = await req.json();
    console.log('Staff push request:', body);

    // Collect target user IDs
    const targetUserIds: string[] = [];

    if (Array.isArray((body as any).user_ids) && (body as any).user_ids.length > 0) {
      targetUserIds.push(...(body as any).user_ids);
    } else if (body.user_id) {
      // Specific user
      targetUserIds.push(body.user_id);
    } else if (body.role_target) {
      // All users with this role (single role or list)
      const roles = Array.isArray(body.role_target) ? body.role_target : [body.role_target];
      const { data: users, error } = await supabase
        .from('users')
        .select('id')
        .in('role', roles)
        .eq('active', true);

      if (error) {
        console.error('Error fetching users by role:', error);
      } else if (users) {
        targetUserIds.push(...users.map(u => u.id));
      }
    }

    if (targetUserIds.length === 0) {
      console.log('No target users found');
      return new Response(
        JSON.stringify({ success: false, reason: 'No target users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push to ${targetUserIds.length} users:`, targetUserIds);

    // Get app base URL for click action
    const { data: pwaConfig } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'pwa_config')
      .single();

    const baseUrl = pwaConfig?.value?.pos_url || 'https://pagano-pos-buddy.lovable.app';

    // Generate click URL based on notification type
    let clickUrl = baseUrl;
    if (body.type === 'cash_session_open' || body.type === 'cash_session_close' || body.type === 'cash_movement') {
      clickUrl = `${baseUrl}/pos/ventas`;
    } else if (body.type === 'order_assigned') {
      clickUrl = `${baseUrl}/pos/delivery`;
    } else if (body.type === 'order_delivered') {
      clickUrl = `${baseUrl}/pos/ventas`;
    } else if (body.type === 'shift_assigned') {
      clickUrl = `${baseUrl}/pos/mi-calendario`;
    } else if (body.type === 'shift_accepted' || body.type === 'shift_rejected') {
      clickUrl = `${baseUrl}/pos/rrhh/turnos`;
    } else if (body.type === 'new_app_order') {
      clickUrl = `${baseUrl}/pos/ventas`;
    }

    // Build OneSignal payload
    // For staff, we use external_id = staff user UUID (prefixed with "staff_" to differentiate)
    const externalIds = targetUserIds.map(id => `staff_${id}`);

    const oneSignalPayload = {
      app_id: oneSignalAppId,
      include_aliases: {
        external_id: externalIds
      },
      target_channel: 'push',
      headings: { en: body.title, es: body.title },
      contents: { en: body.body, es: body.body },
      url: clickUrl,
      data: {
        type: body.type,
        ...body.payload
      },
      // Web push options
      chrome_web_icon: `${baseUrl}/icons/paganos-192.png`,
      chrome_web_badge: `${baseUrl}/icons/paganos-192.png`,
    };

    console.log('Sending to OneSignal:', JSON.stringify(oneSignalPayload, null, 2));

    // Send to OneSignal
    const osResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const osResult = await osResponse.json();
    console.log('OneSignal response:', osResult);

    if (!osResponse.ok) {
      console.error('OneSignal error:', osResult);
      return new Response(
        JSON.stringify({ success: false, error: osResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipients: targetUserIds.length,
        onesignal_id: osResult.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-staff-push:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
