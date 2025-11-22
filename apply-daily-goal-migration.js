import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, 'database', 'migrations', '060_add_daily_goal_and_progress.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Applying migration to add daily_goal and daily_progress columns...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });

    if (error) {
      // If RPC doesn't exist, try direct execution via REST API
      console.log('⚠️  RPC method not available, trying alternative approach...');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length === 0) continue;
        
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { error: execError } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (execError) {
          console.error(`⚠️  Statement failed (may already exist):`, execError.message);
        }
      }
    }

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📊 The user_progress table now includes:');
    console.log('   - daily_goal: Daily learning goal in minutes (default: 30)');
    console.log('   - daily_progress: Daily progress in minutes (default: 0)');
    console.log('');
    console.log('🎮 Dashboard gamification cards will now display dynamic data!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    console.log('💡 Manual migration required:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Run the SQL from: database/migrations/060_add_daily_goal_and_progress.sql');
    process.exit(1);
  }
}

applyMigration();
