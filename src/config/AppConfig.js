export class AppConfig {
  static validate() {
    const requiredEnvVars = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
    };

    const missing = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
      console.warn('Some features may not work properly. Please check your .env file.');
    }

    return missing.length === 0;
  }

  static get() {
    return {
      app: {
        environment: import.meta.env.NODE_ENV || 'development',
        debug: import.meta.env.NODE_ENV === 'development'
      },
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || 'https://ecglfwqylqchdyuhmtuv.supabase.co',
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        enabled: !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
      },
      database: {
        syncInterval: 30000, // 30 seconds
        retryAttempts: 3,
        offlineMode: true
      }
    };
  }

  static getSupabaseConfig() {
    return this.get().supabase;
  }

  static isDatabaseEnabled() {
    return this.get().supabase.enabled;
  }
}