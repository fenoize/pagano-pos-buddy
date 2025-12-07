import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

interface NotificationRequest {
  customer_id?: string;
  user_id?: string;
  type: 'order_status' | 'delivery_assigned' | 'runas_earned' | 'marketing' | 'rider_new_order';
  title: string;
  body: string;
  payload?: Record<string, any>;
  campaign_id?: string;
}

interface BulkNotificationRequest {
  type: 'marketing';
  title: string;
  body: string;
  payload?: Record<string, any>;
  campaign_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const oneSignalRestApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action = 'single', ...data } = body;

    // Get OneSignal configuration
    const { data: configRows, error: configError } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['onesignal_app_id', 'onesignal_enabled']);

    if (configError) {
      console.error('Error fetching OneSignal config:', configError);
      throw new Error('Failed to fetch OneSignal configuration');
    }

    const config: Record<string, any> = {};
    configRows?.forEach(row => {
      let value = row.value;
      if (typeof value === 'string') {
        value = value.replace(/^"|"$/g, '');
      }
      config[row.key] = value;
    });

    const oneSignalAppId = config['onesignal_app_id'];
    const oneSignalEnabled = config['onesignal_enabled'] === true || config['onesignal_enabled'] === 'true';

    if (!oneSignalEnabled) {
      console.log('OneSignal is disabled, skipping notification');
      return new Response(
        JSON.stringify({ success: false, reason: 'OneSignal disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ success: false, reason: 'OneSignal not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle bulk marketing notifications
    if (action === 'bulk') {
      return await handleBulkNotification(supabase, data as BulkNotificationRequest, oneSignalAppId, oneSignalRestApiKey);
    }

    // Handle single notification
    return await handleSingleNotification(supabase, data as NotificationRequest, oneSignalAppId, oneSignalRestApiKey);

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSingleNotification(
  supabase: any,
  data: NotificationRequest,
  appId: string,
  apiKey: string
) {
  const { customer_id, user_id, type, title, body, payload = {} } = data;

  // Create notification event record
  const { data: eventData, error: eventError } = await supabase
    .from('notification_events')
    .insert({
      customer_id,
      user_id,
      type,
      title,
      body,
      payload,
      status: 'pending'
    })
    .select('id')
    .single();

  if (eventError) {
    console.error('Error creating notification event:', eventError);
  }

  const eventId = eventData?.id;

  // Check if notification is allowed based on preferences
  if (customer_id && type !== 'marketing') {
    const { data: allowedData, error: allowedError } = await supabase
      .rpc('check_notification_allowed', { p_customer_id: customer_id, p_type: type });

    if (allowedError) {
      console.error('Error checking notification preferences:', allowedError);
    }

    if (allowedData === false) {
      console.log(`Notification type ${type} not allowed for customer ${customer_id}`);
      if (eventId) {
        await supabase
          .from('notification_events')
          .update({ status: 'skipped', error_message: 'User preferences disabled' })
          .eq('id', eventId);
      }
      return new Response(
        JSON.stringify({ success: false, reason: 'Notification disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Determine external_user_id for OneSignal
  const externalUserId = customer_id || user_id;

  if (!externalUserId) {
    if (eventId) {
      await supabase
        .from('notification_events')
        .update({ status: 'error', error_message: 'No user ID provided' })
        .eq('id', eventId);
    }
    return new Response(
      JSON.stringify({ success: false, reason: 'No user ID provided' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Send notification via OneSignal
  try {
    const oneSignalPayload = {
      app_id: appId,
      include_aliases: {
        external_id: [externalUserId]
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: { ...payload, type }
    };

    console.log('Sending OneSignal notification:', JSON.stringify(oneSignalPayload));

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const result = await response.json();
    console.log('OneSignal response:', JSON.stringify(result));

    if (!response.ok || result.errors) {
      const errorMessage = result.errors ? JSON.stringify(result.errors) : 'OneSignal API error';
      if (eventId) {
        await supabase
          .from('notification_events')
          .update({ status: 'error', error_message: errorMessage })
          .eq('id', eventId);
      }
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update event as sent
    if (eventId) {
      await supabase
        .from('notification_events')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', eventId);
    }

    return new Response(
      JSON.stringify({ success: true, notification_id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    if (eventId) {
      await supabase
        .from('notification_events')
        .update({ status: 'error', error_message: error.message })
        .eq('id', eventId);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleBulkNotification(
  supabase: any,
  data: BulkNotificationRequest,
  appId: string,
  apiKey: string
) {
  const { title, body, payload = {}, campaign_id } = data;

  // Get all customers with marketing enabled
  const { data: customers, error: customersError } = await supabase
    .from('notification_preferences')
    .select('customer_id')
    .eq('marketing_push_enabled', true);

  if (customersError) {
    console.error('Error fetching customers:', customersError);
    throw new Error('Failed to fetch customers for marketing campaign');
  }

  const customerIds = customers?.map((c: any) => c.customer_id) || [];
  
  // Update campaign with recipient count
  await supabase
    .from('marketing_push_campaigns')
    .update({ 
      status: 'sending', 
      recipients_count: customerIds.length 
    })
    .eq('id', campaign_id);

  if (customerIds.length === 0) {
    await supabase
      .from('marketing_push_campaigns')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString(),
        sent_count: 0 
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent_count: 0, message: 'No eligible recipients' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Send to all eligible customers using OneSignal segment
  try {
    const oneSignalPayload = {
      app_id: appId,
      include_aliases: {
        external_id: customerIds
      },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: { ...payload, type: 'marketing', campaign_id }
    };

    console.log('Sending bulk OneSignal notification to', customerIds.length, 'customers');

    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const result = await response.json();
    console.log('OneSignal bulk response:', JSON.stringify(result));

    // Create notification events for tracking
    const events = customerIds.map((customerId: string) => ({
      customer_id: customerId,
      type: 'marketing',
      title,
      body,
      payload: { ...payload, campaign_id },
      status: response.ok ? 'sent' : 'error',
      sent_at: response.ok ? new Date().toISOString() : null,
      error_message: !response.ok ? JSON.stringify(result.errors) : null
    }));

    // Insert in batches
    const batchSize = 100;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await supabase.from('notification_events').insert(batch);
    }

    // Update campaign status
    await supabase
      .from('marketing_push_campaigns')
      .update({ 
        status: response.ok ? 'sent' : 'error',
        sent_at: new Date().toISOString(),
        sent_count: response.ok ? customerIds.length : 0,
        error_count: response.ok ? 0 : customerIds.length
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        sent_count: response.ok ? customerIds.length : 0,
        notification_id: result.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending bulk notification:', error);
    
    await supabase
      .from('marketing_push_campaigns')
      .update({ 
        status: 'error',
        error_count: customerIds.length
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
