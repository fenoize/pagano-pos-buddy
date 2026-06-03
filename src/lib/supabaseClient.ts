import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://lxxfhayifyiioglfbsyj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss";

// Helper function to get current staff token
export const getStaffToken = () => {
  return localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
};

// Return the shared singleton client to avoid "Multiple GoTrueClient instances" warning.
export const getConfiguredSupabase = (): SupabaseClient<Database> => supabase;

// Singleton staff client. Uses a unique storageKey + disabled auth persistence
// so it does NOT conflict with the main client's GoTrueClient.
let _staffClient: SupabaseClient<Database> | null = null;
let _staffClientToken: string | null = null;

export const getStaffSupabaseClient = (): SupabaseClient<Database> => {
  const token = getStaffToken();

  // Re-create only when the token changes
  if (!_staffClient || _staffClientToken !== token) {
    _staffClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'paganos-staff-noauth',
      },
      global: {
        headers: token ? { 'x-staff-token': token } : {}
      }
    });
    _staffClientToken = token;
  }

  return _staffClient;
};

// Export a default client (for backward compatibility) — points to the shared singleton.
export const configuredSupabase: SupabaseClient<Database> = supabase;

// Function to update the JWT in the client (kept for compatibility)
export const updateSupabaseJWT = (jwt: string | null) => {
  console.log('JWT updated:', jwt ? 'set' : 'cleared');
};
