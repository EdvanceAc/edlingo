const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ2xmd3F5bHFjaGR5dWhtdHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTEyOTAsImV4cCI6MjA2NzM4NzI5MH0.RU5QRPClm4WuxVu2Q2nTe8kpKEX0YN_e-y4gH8PM5J0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestUsers() {
    try {
        console.log('Adding test users to Supabase...');
        
        const testUsers = [
            {
                email: 'john.doe@example.com',
                full_name: 'John Doe'
            },
            {
                email: 'jane.smith@example.com',
                full_name: 'Jane Smith'
            },
            {
                email: 'mike.johnson@example.com', 
                full_name: 'Mike Johnson'
            }
        ];
        
        // First, clear any existing test users
        await supabase
            .from('user_profiles')
            .delete()
            .in('email', testUsers.map(u => u.email));
        
        const { data, error } = await supabase
            .from('user_profiles')
            .insert(testUsers)
            .select();
            
        if (error) {
            console.error('Error inserting users:', error);
            return;
        }
        
        console.log('Successfully added test users:', data);
        
        // Verify the users were added
        const { data: allUsers, error: fetchError } = await supabase
            .from('user_profiles')
            .select('*');
            
        if (fetchError) {
            console.error('Error fetching users:', fetchError);
            return;
        }
        
        console.log('All users in database:', allUsers);
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

addTestUsers();