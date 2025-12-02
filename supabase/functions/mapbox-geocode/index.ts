import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { address, token } = await req.json();

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided token or fetch from database
    let mapboxToken = token;
    
    if (!mapboxToken) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: settings, error: settingsError } = await supabase
        .from('delivery_settings')
        .select('mapbox_token')
        .single();

      if (settingsError || !settings?.mapbox_token) {
        return new Response(
          JSON.stringify({ error: 'Mapbox token not configured' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      mapboxToken = settings.mapbox_token;
    }

    // Geocode the address using Mapbox API
    const encodedAddress = encodeURIComponent(`${address}, Santiago, Chile`);
    const geocodeResponse = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=cl&limit=5`
    );

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      console.error('Mapbox API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Geocoding failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeData = await geocodeResponse.json();
    
    const results = geocodeData.features?.map((feature: any) => {
      const [lng, lat] = feature.center;
      
      // Extract comuna from context
      const comunaContext = feature.context?.find((c: any) => 
        c.id.startsWith('locality') || c.id.startsWith('place')
      );

      return {
        address: feature.place_name,
        coordinates: { lat, lng },
        comuna: comunaContext?.text || null
      };
    }) || [];

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mapbox-geocode:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
