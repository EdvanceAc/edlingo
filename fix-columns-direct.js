require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

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

async function fixColumns() {
  try {
    console.log('🔧 Adding missing columns to fix lesson loading errors...');
    
    // Add order_number column to lesson_materials
    console.log('\n1. Adding order_number column to lesson_materials...');
    const { data: lmResult, error: lmError } = await supabase
      .from('lesson_materials')
      .select('id')
      .limit(1);
      
    if (lmError) {
      console.error('❌ Error accessing lesson_materials:', lmError.message);
    } else {
      console.log('✅ lesson_materials table accessible');
    }
    
    // Add course_id column to lessons
    console.log('\n2. Adding course_id column to lessons...');
    const { data: lessonsResult, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .limit(1);
      
    if (lessonsError) {
      console.error('❌ Error accessing lessons:', lessonsError.message);
    } else {
      console.log('✅ lessons table accessible');
    }
    
    // Test a simple query to see current lesson structure
    console.log('\n3. Testing lesson query...');
    const { data: testLessons, error: testError } = await supabase
      .from('lessons')
      .select('id, name, title, course_id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error querying lessons:', testError.message);
      console.log('This confirms the course_id column is missing');
    } else {
      console.log('✅ Lessons query successful:', testLessons);
    }
    
    // Test lesson_materials query
    console.log('\n4. Testing lesson_materials query...');
    const { data: testMaterials, error: testMaterialsError } = await supabase
      .from('lesson_materials')
      .select('id, lesson_id, type, order_number')
      .limit(1);
      
    if (testMaterialsError) {
      console.error('❌ Error querying lesson_materials:', testMaterialsError.message);
      console.log('This confirms the order_number column is missing');
    } else {
      console.log('✅ Lesson materials query successful:', testMaterials);
    }
    
    console.log('\n🎯 Summary:');
    console.log('- The columns need to be added via SQL Editor in Supabase Dashboard');
    console.log('- Or use a migration script with proper DDL execution');
    console.log('\n📋 Manual SQL to run in Supabase SQL Editor:');
    console.log('ALTER TABLE public.lesson_materials ADD COLUMN IF NOT EXISTS order_number INTEGER DEFAULT 0;');
    console.log('ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;');
    
  } catch (error) {
    console.error('❌ Script execution failed:', error.message);
  }
}

// Run the fix
fixColumns();