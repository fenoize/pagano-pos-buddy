import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const SUPABASE_URL = "https://lxxfhayifyiioglfbsyj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss";

// Helper function to get current staff token
export const getStaffToken = () => {
  return localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
};

// Create a function that returns a fresh client (without custom auth headers)
// The staff context is set via set_staff_context RPC, not via Authorization headers
export const getConfiguredSupabase = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
};

/**
 * Creates a Supabase client that sends the staff session token via a custom header.
 * IMPORTANT: We must NOT use the Authorization header because PostgREST expects a JWT there.
 */
export const getStaffSupabaseClient = (): SupabaseClient<Database> => {
  const token = getStaffToken();

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token ? { 'x-staff-token': token } : {}
    }
  });
};

// Export a default client (for backward compatibility)
export const configuredSupabase = getConfiguredSupabase();

// Function to update the JWT in the client (kept for compatibility)
export const updateSupabaseJWT = (jwt: string | null) => {
  console.log('JWT updated:', jwt ? 'set' : 'cleared');
};