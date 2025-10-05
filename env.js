// Environment variables for browser environment
// This file makes environment variables available to the admin dashboard

window.ENV = {
  SUPABASE_URL: 'https://ecglfwqylqchdyuhmtuv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTEyOTAsImV4cCI6MjA2NzM4NzI5MH0.RU5QRPClm4WuxVu2Q2nTe8kpKEX0YN_e-y4gH8PM5J0',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTgxMTI5MCwiZXhwIjoyMDY3Mzg3MjkwfQ.kVkiHxUJG4EbTjxWZwXK6SrfG6wPBgkKJhHeCIQ0Cpg'
};

// Make variables available globally for compatibility
window.supabaseUrl = window.ENV.SUPABASE_URL;
window.supabaseAnonKey = window.ENV.SUPABASE_ANON_KEY;
window.supabaseServiceRoleKey = window.ENV.SUPABASE_SERVICE_ROLE_KEY;