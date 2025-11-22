# Fix Gamification Dashboard - Missing Database Columns

## Problem
The Dashboard gamification cards are not showing dynamic data because the `user_progress` table is missing required columns:
- `daily_goal` - Daily learning goal in minutes
- `daily_progress` - Daily progress towards goal
- `pronunciation_accuracy` - Pronunciation accuracy percentage
- `lessons_completed` - Total lessons completed

## Solution

### Option 1: Quick Fix (Recommended) - Run SQL in Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration SQL**
   - Open the file: `database/migrations/060_add_daily_goal_and_progress.sql`
   - Copy all the SQL content
   - Paste it into the SQL Editor
   - Click "Run" button

4. **Verify Success**
   - You should see "Success. No rows returned" message
   - The migration will add all missing columns

### Option 2: Using the Migration Script

```bash
node apply-daily-goal-migration.js
```

**Note:** This requires `SUPABASE_SERVICE_ROLE_KEY` to be set in your `.env` file.

## What This Migration Does

✅ Adds `daily_goal` column (default: 30 minutes)  
✅ Adds `daily_progress` column (default: 0 minutes)  
✅ Adds `pronunciation_accuracy` column (default: 0.0%)  
✅ Adds `lessons_completed` column (synced from `total_lessons_completed`)  
✅ Creates indexes for better performance  
✅ Adds data integrity constraints  

## After Applying the Migration

1. **Restart your development server**
   ```bash
   npm run dev
   ```

2. **Hard refresh your browser**
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Check the Dashboard**
   - Go to the Dashboard page
   - The gamification cards should now display:
     - ✅ Current Level (from database)
     - ✅ Total XP (from database)
     - ✅ Current Streak (from database)
     - ✅ Daily Goal Progress (from database)

## Troubleshooting

### If you still see hardcoded values:

1. **Check browser console for errors**
   - Press F12 to open DevTools
   - Look for any red errors in the Console tab

2. **Verify migration was successful**
   ```sql
   -- Run this in Supabase SQL Editor to check columns
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'user_progress'
   ORDER BY ordinal_position;
   ```

3. **Check that ProgressProvider is fetching data**
   - Look for console logs in the browser: "Fetching progress from database..."

4. **Verify you're logged in**
   - The ProgressProvider only fetches data for authenticated users
   - Check that you're logged in to the app

## Data Flow After Fix

```
Database (user_progress table)
    ↓
ProgressProvider (fetches every 30s)
    ↓
Dashboard Component
    ↓
Gamification Cards (Level, XP, Streak, Daily Goal)
```

All gamification data will now be **100% dynamic** from your Supabase database! 🎮✨
