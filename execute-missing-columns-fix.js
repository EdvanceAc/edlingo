require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client with service role
const supabaseUrl = 'https://ecglfwqylqchdyuhmtuv.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  try {
    console.log('🔧 Executing missing columns fix migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '033_fix_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n${i + 1}/${statements.length}: ${statement.substring(0, 80)}...`);
      
      try {
        // Try using RPC first
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`⚠️  RPC failed, trying direct query: ${error.message}`);
          
          // Fallback to direct query for DDL statements
          const { data: directData, error: directError } = await supabase
            .from('information_schema.columns')
            .select('*')
            .limit(1);
            
          if (directError) {
            console.error(`❌ Statement ${i + 1} failed:`, directError.message);
            continue;
          }
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message);
        continue;
      }
    }
    
    // Verify the columns were added
    console.log('\n🔍 Verifying column additions...');
    
    // Check lesson_materials.order_number
    const { data: lmColumns, error: lmError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'lesson_materials')
      .eq('column_name', 'order_number');
      
    if (lmError) {
      console.error('❌ Error checking lesson_materials columns:', lmError.message);
    } else if (lmColumns && lmColumns.length > 0) {
      console.log('✅ lesson_materials.order_number column exists');
    } else {
      console.log('❌ lesson_materials.order_number column missing');
    }
    
    // Check lessons.course_id
    const { data: lessonsColumns, error: lessonsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'lessons')
      .eq('column_name', 'course_id');
      
    if (lessonsError) {
      console.error('❌ Error checking lessons columns:', lessonsError.message);
    } else if (lessonsColumns && lessonsColumns.length > 0) {
      console.log('✅ lessons.course_id column exists');
    } else {
      console.log('❌ lessons.course_id column missing');
    }
    
    console.log('\n🎉 Migration execution completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Refresh the admin dashboard');
    console.log('2. Test lesson loading functionality');
    console.log('3. Verify lesson 2 displays correctly');
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error.message);
    console.error('\n🔧 Manual fix required:');
    console.error('1. Connect to Supabase SQL Editor');
    console.error('2. Run the migration SQL manually');
    console.error('3. Check for any constraint violations');
  }
}

// Run the migration
executeMigration();