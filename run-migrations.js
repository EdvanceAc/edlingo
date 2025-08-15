const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  
  const migrationsDir = path.join(__dirname, 'database', 'migrations');
  
  // Dynamically discover all .sql migration files and sort them by numeric prefix
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => {
      const aNum = parseInt(a.split('_')[0], 10);
      const bNum = parseInt(b.split('_')[0], 10);
      return (isNaN(aNum) ? 0 : aNum) - (isNaN(bNum) ? 0 : bNum);
    });

  console.log(`📚 Found ${migrationFiles.length} migration files`);
  
  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(migrationsDir, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Migration file not found: ${migrationFile}`);
      continue;
    }
    
    console.log(`\n📄 Processing migration: ${migrationFile}`);
    
    try {
      const sqlContent = fs.readFileSync(migrationPath, 'utf8');
      
      // Split SQL content into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      console.log(`   Found ${statements.length} SQL statements`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            console.log(`   Executing statement ${i + 1}/${statements.length}...`);
            
            // Use raw SQL query instead of RPC
            const { data, error } = await supabase.rpc('exec_sql', {
              sql: statement
            });
            
            if (error) {
              // If exec_sql doesn't exist, provide manual instructions
              if (error.message.includes('function public.exec_sql') || error.code === 'PGRST202') {
                console.log(`\n❌ Cannot execute migrations automatically.`);
                console.log(`\n📋 Please run the following SQL manually in your Supabase SQL Editor:\n`);
                console.log('-- ' + '='.repeat(60));
                console.log('-- ' + migrationFile.toUpperCase());
                console.log('-- ' + '='.repeat(60));
                console.log(sqlContent);
                console.log('\n-- ' + '='.repeat(60));
                return;
              }
              throw error;
            }
            
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          } catch (stmtError) {
            console.error(`   ❌ Error executing statement ${i + 1}:`, stmtError.message);
            // Continue with next statement instead of failing completely
          }
        }
      }
      
      console.log(`✅ Migration ${migrationFile} completed`);
      
    } catch (error) {
      console.error(`❌ Error processing migration ${migrationFile}:`, error.message);
    }
  }
  
  console.log('\n🎉 Migration process completed!');
  console.log('\n📝 Next steps:');
  console.log('1. If migrations failed to run automatically, copy the SQL from above');
  console.log('2. Go to your Supabase dashboard > SQL Editor');
  console.log('3. Paste and run the SQL statements');
  console.log('4. Refresh your admin dashboard to verify the fixes');
}

// Test database connection first
async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.log('⚠️  Connection test failed:', error.message);
      console.log('\n📋 Manual migration required. Here are some SQL files to run:\n');
      
      // Show manual instructions for a subset to get started
      const migrationsDir = path.join(__dirname, 'database', 'migrations');
      const sampleFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .slice(0, 3);
      
      for (const migrationFile of sampleFiles) {
        const migrationPath = path.join(migrationsDir, migrationFile);
        if (fs.existsSync(migrationPath)) {
          const sqlContent = fs.readFileSync(migrationPath, 'utf8');
          console.log('-- ' + '='.repeat(60));
          console.log('-- ' + migrationFile.toUpperCase());
          console.log('-- ' + '='.repeat(60));
          console.log(sqlContent);
          console.log('\n');
        }
      }
      
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 EdLingo Database Migration Tool');
  console.log('==================================\n');
  
  const connected = await testConnection();
  
  if (connected) {
    await runMigrations();
  }
}

main().catch(console.error);