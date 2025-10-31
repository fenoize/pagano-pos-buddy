import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://lxxfhayifyiioglfbsyj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eGZoYXlpZnlpaW9nbGZic3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzMzNTgsImV4cCI6MjA3MTA0OTM1OH0.vpIwYxp9AXBXvp3OPY-GGXl0J1yeAwTeH3OZW2Bs0Ss";

// Create the Supabase client with global JWT configuration
export const configuredSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: (() => {
      const jwt = localStorage.getItem('paganos_jwt');
      return jwt ? { Authorization: `Bearer ${jwt}` } : {};
    })()
  }
});

// Function to update the JWT in the client
export const updateSupabaseJWT = (jwt: string | null) => {
  // Update the global config doesn't work dynamically, so we'll handle this in useAuth
  console.log('JWT updated:', jwt ? 'set' : 'cleared');
};