# Database Setup Instructions

## Issue Identified
The "Failed to fetch" errors are occurring because the database tables don't exist in your Supabase project yet. The schema needs to be applied.

## Quick Fix Steps

### Step 1: Apply Database Schema
1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your EdLingo project
3. Go to **SQL Editor** (in the left sidebar)
4. Copy the entire contents of `database/migrations/001_initial_schema.sql`
5. Paste it into the SQL Editor
6. Click **"Run"** to execute the migration

### Step 2: Verify Tables Created
After running the migration, check that these tables were created:
- `user_profiles`
- `user_progress` 
- `learning_sessions`
- `user_vocabulary`
- `conversation_history`
- `user_achievements`
- `courses`
- `assignments`

### Step 3: Test the Application
1. Refresh your EdLingo application at http://localhost:3003
2. The "Failed to fetch" errors should be resolved
3. Vocabulary, Grammar Lessons, and User Management should now load properly

## Alternative: Using Supabase CLI
If you prefer using the command line:

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ID)
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

## Verification
Once the schema is applied, you should see:
- ✅ Vocabulary Management loads without errors
- ✅ Grammar Lessons loads without errors  
- ✅ User Management loads without errors
- ✅ No more "Failed to fetch" errors in console

## Need Help?
If you encounter issues:
1. Check your `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Verify your Supabase project is active
3. Check the browser console for specific error messages