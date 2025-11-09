import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Validar token de staff
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Validar token y verificar que es administrador
    const { data: validation } = await supabase.rpc('validate_staff_token_v2', {
      _token: token
    });
    
    if (!validation || validation.length === 0 || !validation[0].is_admin) {
      console.error('❌ Unauthorized: not an admin');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Admin validated:', validation[0].user_id);
    
    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const iconType = formData.get('iconType') as string;
    
    if (!file) {
      throw new Error('No file provided');
    }
    
    console.log('📁 Uploading file:', file.name, 'type:', iconType);
    
    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `icon-${iconType}-${Date.now()}.${fileExt}`;
    
    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Subir archivo usando service role (bypassing RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pwa-icons')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }
    
    console.log('✅ File uploaded:', uploadData.path);
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('pwa-icons')
      .getPublicUrl(uploadData.path);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        url: urlData.publicUrl,
        path: uploadData.path
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error: any) {
    console.error('❌ Error in upload-pwa-icon:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error al subir el archivo',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});