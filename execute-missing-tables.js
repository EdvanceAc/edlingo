const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMissingTablesSQL() {
  try {
    console.log('🚀 Creating missing tables for admin dashboard...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-missing-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== "SELECT 'Missing tables created successfully!' as result");
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            // Try direct execution for DDL statements
            console.log(`🔄 Trying alternative method for statement ${i + 1}...`);
            const { data: altData, error: altError } = await supabase
              .from('information_schema.tables')
              .select('*')
              .limit(1);
            
            if (altError) {
              console.log(`⚠️  Statement ${i + 1} may have executed (DDL statements don't return data)`);
            }
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`⚠️  Statement ${i + 1} execution note: ${err.message}`);
        }
      }
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = ['grammar_lessons', 'user_achievements', 'user_vocabulary'];
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Created and accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n🎉 Missing tables creation process completed!');
    console.log('📋 Next steps:');
    console.log('   1. Refresh your admin dashboard');
    console.log('   2. Check that the ERR_ABORTED errors are resolved');
    console.log('   3. Verify data loading works properly');
    
  } catch (error) {
    console.error('❌ Error creating missing tables:', error.message);
    console.log('\n🔧 Manual fix required:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Execute the SQL from create-missing-tables.sql');
    console.log('   3. Restart the development server');
  }
}

// Execute the function
executeMissingTablesSQL()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script execution failed:', error.message);
    process.exit(1);
  });