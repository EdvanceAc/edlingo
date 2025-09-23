import { createClient } from '@supabase/supabase-js';

// Helper to read environment variables from Vite or a window-injected object
const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof window !== 'undefined' && window.__ENV__ && key in window.__ENV__) {
    return window.__ENV__[key];
  }
  // Add support for window.ENV fallback
  if (typeof window !== 'undefined' && window.ENV && key in window.ENV) {
    return window.ENV[key];
  }
  return undefined;
};

// Supabase configuration
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY is not set. Some features may not work properly.');
}

// Create Supabase client with realtime disabled to avoid Cloudflare websocket issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '', {
  realtime: {
    params: {
      eventsPerSecond: 0 // Disable realtime events
    }
  }
});

// Database configuration
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  client: supabase
};

// Whether Supabase is properly configured with both URL and anon key
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Helper function to check connection
export const checkSupabaseConnection = async () => {
  try {
    // Use a simple query to test connection - check if user_profiles table exists
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    if (error && error.code === '42P01') {
      // Table doesn't exist - database schema not set up
      console.warn('Database schema not found. Please run migrations.');
      return { connected: true, error: 'Database schema not set up' };
    }
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      throw error;
    }
    return { connected: true, error: null };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return { connected: false, error: error.message };
  }
};

export default supabaseConfig;