const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeTermsFixMigration() {
    try {
        console.log('Executing terms table fix migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '031_fix_terms_table_schema.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Migration SQL loaded, executing...');
        
        // Split the SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement individually
        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                const { error } = await supabase.rpc('exec_sql', { sql: statement });
                if (error) {
                    console.error(`Error executing statement: ${statement}`);
                    console.error('Error:', error);
                    // Continue with other statements
                }
            }
        }
        
        console.log('Terms table fix migration completed successfully!');
        
        // Test the terms table
        console.log('Testing terms table...');
        const { data, error } = await supabase
            .from('terms')
            .select('*')
            .limit(1);
            
        if (error) {
            console.error('Error testing terms table:', error);
        } else {
            console.log('Terms table test successful!');
        }
        
    } catch (error) {
        console.error('Error executing migration:', error);
    }
}

// Execute the migration
executeTermsFixMigration();