const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySchemaFix() {
  console.log('🔧 Applying final schema fixes...');
  
  try {
    // Add pronunciation_accuracy column
    console.log('📊 Adding pronunciation_accuracy column...');
    const { error: pronunciationError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.user_progress 
        ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;
        
        CREATE INDEX IF NOT EXISTS idx_user_progress_pronunciation_accuracy 
        ON public.user_progress(pronunciation_accuracy);
        
        COMMENT ON COLUMN public.user_progress.pronunciation_accuracy 
        IS 'User pronunciation accuracy percentage (0.00-100.00)';
      `
    });
    
    if (pronunciationError) {
      console.log('⚠️  Direct SQL execution not available, using alternative method...');
      
      // Try alternative approach using raw SQL
      const { error: altError } = await supabase
        .from('user_progress')
        .select('pronunciation_accuracy')
        .limit(1);
        
      if (altError && altError.message.includes('pronunciation_accuracy')) {
        console.log('❌ pronunciation_accuracy column is missing and cannot be added via client');
        console.log('📋 Manual action required:');
        console.log('   1. Open Supabase Dashboard > SQL Editor');
        console.log('   2. Run the complete-schema-fix.sql script');
        console.log('   3. Or execute this SQL manually:');
        console.log('      ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS pronunciation_accuracy DECIMAL(5,2) DEFAULT 0.0;');
        return false;
      } else {
        console.log('✅ pronunciation_accuracy column already exists or was added');
      }
    } else {
      console.log('✅ pronunciation_accuracy column added successfully');
    }
    
    // Test the critical queries that were failing
    console.log('🧪 Testing critical database queries...');
    
    // Test user_progress with pronunciation_accuracy
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('id, user_id, lessons_completed, pronunciation_accuracy, current_level, total_xp, daily_streak')
      .limit(1);
      
    if (progressError) {
      console.log('❌ user_progress query failed:', progressError.message);
      return false;
    } else {
      console.log('✅ user_progress query successful');
    }
    
    // Test courses with difficulty_level
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, difficulty_level, is_active')
      .limit(1);
      
    if (coursesError) {
      console.log('❌ courses query failed:', coursesError.message);
      return false;
    } else {
      console.log('✅ courses query successful');
    }
    
    // Test lessons with all columns
    const { data: lessonsData, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, course_id, title, content, order_index')
      .limit(1);
      
    if (lessonsError) {
      console.log('❌ lessons query failed:', lessonsError.message);
      return false;
    } else {
      console.log('✅ lessons query successful');
    }
    
    console.log('🎉 All critical database queries are working!');
    return true;
    
  } catch (error) {
    console.error('❌ Error applying schema fix:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting final schema fix application...');
  
  const success = await applySchemaFix();
  
  if (success) {
    console.log('\n✅ Schema fixes applied successfully!');
    console.log('📋 Next steps:');
    console.log('   1. Restart the development server');
    console.log('   2. Run TestSprite tests to verify fixes');
    console.log('   3. Check that resource loading issues are resolved');
  } else {
    console.log('\n❌ Schema fixes could not be fully applied');
    console.log('📋 Manual intervention required:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run the complete-schema-fix.sql script');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applySchemaFix };