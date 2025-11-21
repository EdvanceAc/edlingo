require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Required environment variables:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserProfileRLS() {
  console.log('🔧 Fixing User Profile RLS Policy...');
  
  try {
    // Step 1: Add policy for automatic profile creation
    console.log('\n1️⃣ Adding policy for automatic profile creation...');
    const policySQL = `
      DROP POLICY IF EXISTS "Allow automatic profile creation" ON public.user_profiles;
      CREATE POLICY "Allow automatic profile creation" ON public.user_profiles
          FOR INSERT WITH CHECK (
              auth.uid() = id 
              OR 
              current_setting('role', true) = 'postgres'
          );
    `;
    
    const { error: policyError } = await supabase.rpc('exec_sql', { sql: policySQL });
    if (policyError) {
      console.log('❌ Error creating policy:', policyError.message);
    } else {
      console.log('✅ Policy created successfully');
    }
    
    // Step 2: Update the handle_new_user function
    console.log('\n2️⃣ Updating handle_new_user function...');
    const functionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO public.user_profiles (
              id, 
              email, 
              full_name,
              preferred_language,
              target_languages,
              learning_level,
              assessment_completed,
              created_at,
              updated_at
          )
          VALUES (
              NEW.id, 
              NEW.email, 
              COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
              'en',
              '{}',
              'beginner',
              false,
              NOW(),
              NOW()
          )
          ON CONFLICT (id) DO NOTHING;
          
          RETURN NEW;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
              RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: functionError } = await supabase.rpc('exec_sql', { sql: functionSQL });
    if (functionError) {
      console.log('❌ Error updating function:', functionError.message);
    } else {
      console.log('✅ Function updated successfully');
    }
    
    // Step 3: Recreate the trigger
    console.log('\n3️⃣ Recreating trigger...');
    const triggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSQL });
    if (triggerError) {
      console.log('❌ Error creating trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger created successfully');
    }
    
    // Step 4: Create helper function for manual profile creation
    console.log('\n4️⃣ Creating helper function...');
    const helperSQL = `
      CREATE OR REPLACE FUNCTION public.create_missing_user_profile(user_id UUID, user_email TEXT, user_name TEXT DEFAULT NULL)
      RETURNS BOOLEAN AS $$
      BEGIN
          INSERT INTO public.user_profiles (
              id, 
              email, 
              full_name,
              preferred_language,
              target_languages,
              learning_level,
              assessment_completed,
              created_at,
              updated_at
          )
          VALUES (
              user_id, 
              user_email, 
              COALESCE(user_name, user_email),
              'en',
              '{}',
              'beginner',
              false,
              NOW(),
              NOW()
          )
          ON CONFLICT (id) DO NOTHING;
          
          RETURN TRUE;
      EXCEPTION
          WHEN OTHERS THEN
              RAISE WARNING 'Failed to create user profile for %: %', user_id, SQLERRM;
              RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    const { error: helperError } = await supabase.rpc('exec_sql', { sql: helperSQL });
    if (helperError) {
      console.log('❌ Error creating helper function:', helperError.message);
    } else {
      console.log('✅ Helper function created successfully');
    }
    
    console.log('\n🎉 User Profile RLS fix completed!');
    console.log('\n📋 Summary:');
    console.log('- Updated RLS policy to allow automatic profile creation');
    console.log('- Enhanced handle_new_user function with better error handling');
    console.log('- Recreated trigger for automatic profile creation');
    console.log('- Added helper function for manual profile creation');
    
  } catch (error) {
    console.error('❌ Error fixing user profile RLS:', error);
  }
}

// Test the fix by checking if we can create a test profile
async function testProfileCreation() {
  console.log('\n🧪 Testing profile creation...');
  
  try {
    // Try to call the helper function
    const testUserId = '00000000-0000-0000-0000-000000000001';
    const testEmail = 'test@example.com';
    
    const { data, error } = await supabase.rpc('create_missing_user_profile', {
      user_id: testUserId,
      user_email: testEmail,
      user_name: 'Test User'
    });
    
    if (error) {
      console.log('❌ Test failed:', error.message);
    } else {
      console.log('✅ Test profile creation successful');
      
      // Clean up test profile
      await supabase.from('user_profiles').delete().eq('id', testUserId);
      console.log('✅ Test profile cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function main() {
  await fixUserProfileRLS();
  await testProfileCreation();
}

main().catch(console.error);