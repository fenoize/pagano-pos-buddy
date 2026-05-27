import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const WORDPRESS_URL = 'https://staging8.paganosburger.cl/wp-json/paganos/v1/store-status'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { open } = await req.json()

    if (typeof open !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'El campo "open" debe ser true o false' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const secret = Deno.env.get('VITE_WORDPRESS_STORE_SECRET')
    if (!secret) {
      console.error('[StoreSync] VITE_WORDPRESS_STORE_SECRET no configurado en Supabase secrets')
      return new Response(
        JSON.stringify({ error: 'Secret no configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const wpResponse = await fetch(WORDPRESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ open, secret }),
    })

    const wpBody = await wpResponse.text()

    if (!wpResponse.ok) {
      console.error('[StoreSync] WordPress respondió con error:', wpResponse.status, wpBody)
    } else {
      console.log('[StoreSync] WordPress notificado correctamente. Tienda:', open ? 'ABIERTA' : 'CERRADA')
    }

    return new Response(
      JSON.stringify({ success: wpResponse.ok, status: wpResponse.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[StoreSync] Error inesperado:', err)
    return new Response(
      JSON.stringify({ error: 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
