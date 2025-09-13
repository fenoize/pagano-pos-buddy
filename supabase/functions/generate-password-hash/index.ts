import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();
    
    console.log(`Generating hash for password: ${password}`);
    
    // Use built-in crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // For now, we'll use a simple bcrypt-like format with the hex hash
    // In production, you should use a proper bcrypt implementation
    const hash = `$2b$10$${hashHex.substring(0, 22)}${hashHex.substring(22)}`;
    
    console.log(`Generated hash: ${hash}`);
    
    return new Response(
      JSON.stringify({ 
        hash,
        verified: true,
        password: password
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
})