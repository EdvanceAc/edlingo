# Supabase Gemini Integration Setup

## ⚠️ IMPORTANT: Environment Variables Required

The Edge Function is currently returning 500 errors because environment variables are not set.
Please follow the setup steps below to complete the integration.

This guide will help you set up and configure Supabase database integration for EdLingo.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed
- EdLingo application cloned and dependencies installed

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `EdLingo` (or your preferred name)
   - Database Password: Choose a strong password
   - Region: Select the closest region to your users
5. Click "Create new project"

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon (public) key**: `eyJ...` (long string starting with eyJ)

## Step 3: Configure Environment Variables

1. In your EdLingo project root, create or update the `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

2. Replace `your-project-id` and `your-anon-key-here` with your actual values

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `database/migrations/001_initial_schema.sql`
3. Click "Run" to execute the migration

Alternatively, you can use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

## Step 5: Configure Row Level Security (RLS)

The migration script automatically sets up RLS policies, but you can verify them in your Supabase dashboard:

1. Go to **Authentication** → **Policies**
2. Ensure policies are enabled for all tables:
   - `user_profiles`
   - `user_progress`
   - `learning_sessions`
   - `user_vocabulary`
   - `conversation_history`
   - `user_achievements`

## Step 6: Test the Connection

1. Start your EdLingo application:
   ```bash
   npm run dev
   ```

2. Look for the database status indicator in the header (green dot = connected)

3. Check the browser console for any connection errors

4. Try creating a user account to test the integration

## Database Schema Overview

The EdLingo database includes the following tables:

- **user_profiles**: User account information and preferences
- **user_progress**: Learning progress tracking (XP, level, streak)
- **learning_sessions**: Individual learning session records
- **user_vocabulary**: User's vocabulary progress and mastery
- **conversation_history**: Chat and conversation records
- **user_achievements**: User achievements and badges

## Features

### Real-time Synchronization
- Automatic sync when online
- Offline support with local storage fallback
- Conflict resolution for concurrent updates

### Authentication
- User registration and login
- Automatic profile creation
- Session management

### Data Management
- Progress tracking
- Vocabulary management
- Learning session history
- Achievement system

## Troubleshooting

### Connection Issues

1. **Invalid Project Reference**: Ensure your `VITE_SUPABASE_URL` is correct
2. **Authentication Errors**: Check your `VITE_SUPABASE_ANON_KEY`
3. **RLS Errors**: Verify Row Level Security policies are properly configured

### Common Error Messages

- `fetch failed`: Network connectivity or incorrect URL
- `Invalid API key`: Wrong or expired anon key
- `relation does not exist`: Database schema not applied

### Debug Mode

Enable debug logging by setting:
```env
VITE_DEBUG_DATABASE=true
```

## Security Best Practices

1. **Never commit your `.env` file** to version control
2. **Use environment-specific keys** for development/production
3. **Regularly rotate your API keys**
4. **Monitor your Supabase dashboard** for unusual activity
5. **Keep RLS policies restrictive** - users should only access their own data

## Support

If you encounter issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the browser console for error messages
3. Verify your environment variables are correctly set
4. Ensure your database schema is up to date

For EdLingo-specific issues, check the application logs and database status panel in the UI.