# Fix RLS Policies - Enable Dashboard Data Access

## Problem
Users can't see their own progress data because RLS (Row Level Security) policies are blocking access.

## Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your EdLingo project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run This SQL

Copy and paste this entire SQL block and click **Run**:

```sql
-- Fix RLS policies for user_progress table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;

-- Create new policies that properly match auth.uid() with user_id
CREATE POLICY "Users can view own progress" ON public.user_progress
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress" ON public.user_progress
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress" ON public.user_progress
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own progress" ON public.user_progress
    FOR DELETE
    USING (user_id = auth.uid());

-- Verify RLS is enabled
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
```

### Step 3: Verify
After running the SQL, you should see: **"Success. No rows returned"**

### Step 4: Test in Your App
1. **Hard refresh** your browser: `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
2. **Log in** to your app
3. **Go to Dashboard** page

You should now see:
- ✅ **Current Level:** 1
- ✅ **Total XP:** 85
- ✅ **Streak:** 7 days  
- ✅ **Daily Goal:** 15/30 minutes

## What This Does

The RLS policies ensure that:
- ✅ Users can **view** their own progress (`user_id = auth.uid()`)
- ✅ Users can **create** their own progress records
- ✅ Users can **update** their own progress
- ✅ Users can **delete** their own progress
- ❌ Users **cannot** see other users' data (security)

## Troubleshooting

### If you still don't see data:

1. **Check you're logged in** as `arkasoftware1@gmail.com`
2. **Open browser console** (F12) and look for errors
3. **Check the Network tab** for failed requests to Supabase
4. **Verify in Supabase Dashboard** → **Table Editor** → **user_progress** that your data exists

### To check your current user ID in the browser console:

```javascript
// Run this in browser console while logged in
const supabase = window.supabase || /* get supabase client */;
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user ID:', user?.id);
console.log('Email:', user?.email);
```

## After Applying This Fix

Your gamification dashboard will be **100% dynamic** and pull from database in real-time! 🎮✨
