// Test script to add a sample user to the database
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTEyOTAsImV4cCI6MjA2NzM4NzI5MH0.RU5QRPClm4WuxVu2Q2nTe8kpKEX0YN_e-y4gH8PM5J0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestUser() {
    try {
        console.log('🔄 Adding test user...');
        
        // First check if user_profiles table exists
        const { data: existingUsers, error: checkError } = await supabase
            .from('user_profiles')
            .select('id')
            .limit(1);
            
        if (checkError && checkError.code === '42P01') {
            console.log('❌ user_profiles table does not exist. Please run database migrations first.');
            return;
        }
        
        // Add a test user
        const { data, error } = await supabase
            .from('user_profiles')
            .insert({
                email: 'test@example.com',
                full_name: 'Test User',
                created_at: new Date().toISOString()
            })
            .select();
            
        if (error) {
            console.error('❌ Error adding test user:', error);
        } else {
            console.log('✅ Test user added successfully:', data);
        }
        
        // Check total count
        const { count, error: countError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
            
        if (countError) {
            console.error('❌ Error getting user count:', countError);
        } else {
            console.log('📊 Total users in database:', count);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

addTestUser();