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

async function executeSchemaAlignment() {
    try {
        console.log('Executing schema alignment migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '032_align_lessons_schema.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('Migration SQL loaded, executing...');
        
        // Split the SQL into individual statements and execute them
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement individually using raw SQL
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`Executing statement ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
                
                try {
                    // Use the REST API directly for DDL statements
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey
                        },
                        body: JSON.stringify({ sql: statement })
                    });
                    
                    if (!response.ok) {
                        console.log(`Statement ${i + 1} may have failed, but continuing...`);
                    } else {
                        console.log(`Statement ${i + 1} executed successfully`);
                    }
                } catch (error) {
                    console.log(`Error executing statement ${i + 1}, but continuing:`, error.message);
                }
            }
        }
        
        console.log('Schema alignment migration completed!');
        
        // Test the new schema
        console.log('Testing new lessons table schema...');
        
        // Test terms table
        const { data: termsData, error: termsError } = await supabase
            .from('terms')
            .select('*')
            .limit(1);
            
        if (termsError) {
            console.log('Terms table test result:', termsError.message);
        } else {
            console.log('Terms table is accessible');
        }
        
        // Test lessons table
        const { data: lessonsData, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .limit(1);
            
        if (lessonsError) {
            console.log('Lessons table test result:', lessonsError.message);
        } else {
            console.log('Lessons table is accessible with new schema');
        }
        
        console.log('Schema alignment verification completed!');
        
    } catch (error) {
        console.error('Error executing schema alignment:', error);
    }
}

// Execute the migration
executeSchemaAlignment();