import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const appType = url.searchParams.get('type') || 'customer';

    if (!['customer', 'pos'].includes(appType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid app type. Must be "customer" or "pos"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch PWA config from database
    const { data: config, error } = await supabase
      .from('pwa_config')
      .select('*')
      .eq('app_type', appType)
      .single();

    if (error || !config) {
      console.error('Error fetching PWA config:', error);
      return new Response(
        JSON.stringify({ error: 'PWA configuration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build manifest based on app type
    const manifest: any = {
      name: config.app_name,
      short_name: config.app_short_name,
      description: config.app_description,
      theme_color: config.theme_color,
      background_color: config.background_color,
      lang: 'es',
    };

    if (appType === 'customer') {
      // Customer PWA: standalone, full featured
      manifest.start_url = '/';
      manifest.scope = '/';
      manifest.display = 'standalone';
      manifest.orientation = 'portrait';
      manifest.categories = ['food', 'lifestyle'];
      
      // Icons
      manifest.icons = [];
      if (config.icon_192_url) {
        manifest.icons.push({
          src: config.icon_192_url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        });
      }
      if (config.icon_512_url) {
        manifest.icons.push({
          src: config.icon_512_url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        });
      }
      if (config.icon_maskable_url) {
        manifest.icons.push({
          src: config.icon_maskable_url,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        });
      }

      // Shortcuts
      manifest.shortcuts = [
        {
          name: 'Hacer Pedido',
          short_name: 'Pedido',
          description: 'Hacer un nuevo pedido',
          url: '/',
          icons: config.icon_192_url ? [
            {
              src: config.icon_192_url,
              sizes: '192x192',
            },
          ] : [],
        },
      ];
    } else {
      // POS PWA: browser mode, minimal
      manifest.start_url = '/pos';
      manifest.scope = '/pos/';
      manifest.display = 'browser';
      manifest.orientation = 'any';
      manifest.categories = ['business', 'productivity'];
      
      // Only 192 icon for POS
      manifest.icons = [];
      if (config.icon_192_url) {
        manifest.icons.push({
          src: config.icon_192_url,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        });
      }
    }

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating manifest:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
