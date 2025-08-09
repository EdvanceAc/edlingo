import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY is not set. Some features may not work properly.');
}

// Create Supabase client with realtime disabled to avoid Cloudflare websocket issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '', {
  realtime: {
    params: {
      eventsPerSecond: 0 // Disable realtime events
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'edlingo-web'
    }
  }
});

// Database configuration
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  client: supabase
};

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