import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';

const SUPABASE_URL = "https://lxxfhayifyiioglfbsyj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss";

// Helper function to get current staff token
export const getStaffToken = () => {
  return localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
};

// Create a function that returns a fresh client with current headers
export const getConfiguredSupabase = () => {
  const token = getStaffToken();
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }
  });
};

// Export a default client (for backward compatibility)
export const configuredSupabase = getConfiguredSupabase();

// Function to update the JWT in the client (kept for compatibility)
export const updateSupabaseJWT = (jwt: string | null) => {
  console.log('JWT updated:', jwt ? 'set' : 'cleared');
};