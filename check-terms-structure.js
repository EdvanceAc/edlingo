const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTermsStructure() {
    try {
        console.log('Checking terms table structure...');
        
        // Try to get table info using information_schema
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'terms')
            .eq('table_schema', 'public');
            
        if (columnsError) {
            console.log('Error getting columns:', columnsError);
        } else {
            console.log('Terms table columns:', columns);
        }
        
        // Try a simple select to see what happens
        const { data, error } = await supabase
            .from('terms')
            .select('*')
            .limit(1);
            
        if (error) {
            console.log('Error selecting from terms:', error);
        } else {
            console.log('Terms table exists and is accessible');
            console.log('Sample data:', data);
        }
        
        // Try to insert a test record to see the exact error
        console.log('\nTesting insert with name column...');
        const { data: insertData, error: insertError } = await supabase
            .from('terms')
            .insert({
                course_id: '00000000-0000-0000-0000-000000000000',
                name: 'Test Term',
                description: 'Test Description',
                order_number: 1
            })
            .select();
            
        if (insertError) {
            console.log('Insert error:', insertError);
        } else {
            console.log('Insert successful:', insertData);
            
            // Clean up test record
            await supabase
                .from('terms')
                .delete()
                .eq('name', 'Test Term');
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

checkTermsStructure();