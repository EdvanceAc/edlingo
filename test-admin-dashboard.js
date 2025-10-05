// Test script to verify admin dashboard functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserCount() {
    try {
        console.log('🔍 Testing user count functionality...');
        
        // Test 1: Count users from user_profiles table
        console.log('\n📊 Test 1: Counting users from user_profiles table');
        const { count: profilesCount, error: profilesError } = await supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true });
            
        if (profilesError) {
            console.log('❌ Error counting user_profiles:', profilesError.message);
            console.log('   Code:', profilesError.code);
        } else {
            console.log('✅ user_profiles count:', profilesCount);
        }
        
        // Test 2: List users from auth.users
        console.log('\n📊 Test 2: Listing users from auth.users');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.log('❌ Error listing auth users:', authError.message);
        } else {
            console.log('✅ auth.users count:', authUsers.users?.length || 0);
            if (authUsers.users?.length > 0) {
                console.log('   Sample user:', {
                    id: authUsers.users[0].id.substring(0, 8) + '...',
                    email: authUsers.users[0].email,
                    created_at: authUsers.users[0].created_at
                });
            }
        }
        
        // Test 3: Try to fetch user_profiles data
        console.log('\n📊 Test 3: Fetching user_profiles data');
        const { data: profiles, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*')
            .limit(5);
            
        if (fetchError) {
            console.log('❌ Error fetching user_profiles:', fetchError.message);
            console.log('   Code:', fetchError.code);
        } else {
            console.log('✅ user_profiles data count:', profiles?.length || 0);
            if (profiles?.length > 0) {
                console.log('   Sample profile:', {
                    id: profiles[0].id?.substring(0, 8) + '...',
                    email: profiles[0].email,
                    full_name: profiles[0].full_name
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testUserCount();