# Progress Tracking Integration Guide

## Overview

Your EdLingo app now has a **comprehensive progress tracking system** that automatically awards XP and updates user progress based on real activities:

✅ **Lessons completed** in courses  
✅ **AI chat** conversations  
✅ **Live conversations** with AI  

## How It Works

### XP Rewards System

| Activity | XP Earned |
|----------|-----------|
| **Courses** |  |
| Complete a lesson | 50 XP |
| Complete lesson with 100% score | +50 bonus (100 XP total) |
| Complete entire course | 500 XP |
| Pass a quiz | 30 XP |
| Perfect quiz score | 75 XP |
| **AI Chat** |  |
| Send a message | 5 XP per message |
| 5-minute chat session | 20 XP |
| 10-minute chat session | 40 XP |
| 30+ minute chat session | 100 XP |
| **Live Conversations** |  |
| Start live conversation | 25 XP |
| 5-minute conversation | 50 XP |
| 10-minute conversation | 100 XP |
| 30+ minute conversation | 250 XP |
| Complete conversation | 150 XP |
| **Achievements** |  |
| Meet daily goal (30 min) | 50 XP |
| 7-day streak | 100 XP |
| 30-day streak | 500 XP |

### Auto-Tracking Features

- ✅ **Automatic XP calculation** based on activity
- ✅ **Streak management** (daily, weekly, monthly)
- ✅ **Daily progress** tracking (time spent learning)
- ✅ **Level progression** (auto-calculated from total XP)
- ✅ **Course completion** percentage
- ✅ **Achievement unlocking**
- ✅ **Toast notifications** for XP rewards

## Already Integrated ✅

### Live Conversation (LiveConversation.tsx)

Already integrated! When users start/end live conversations:
- **Start:** Awards 25 XP
- **End:** Awards 150 XP + bonus based on duration
- **Automatic tracking** of conversation time

## Integration Examples

### 1. Chat Component Integration

```javascript
import { useProgressTracking } from '../hooks/useProgressTracking';

function ChatComponent() {
  const { trackChatMessage, trackChatSession } = useProgressTracking();
  const sessionIdRef = useRef(`chat_${Date.now()}`);
  const sessionStartRef = useRef(Date.now());

  // Track each message sent
  const sendMessage = async (message) => {
    // ... your chat logic ...
    
    // Track the message
    await trackChatMessage({
      sessionId: sessionIdRef.current,
      messageCount: 1
    });
  };

  // Track session end
  useEffect(() => {
    return () => {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 60000);
      trackChatSession({
        sessionId: sessionIdRef.current,
        duration,
        messageCount: messages.length
      });
    };
  }, []);

  return (
    // ... your component ...
  );
}
```

### 2. Lesson Completion Integration

```javascript
import { useProgressTracking } from '../hooks/useProgressTracking';

function LessonComponent({ lessonId, courseId }) {
  const { trackLessonCompleted } = useProgressTracking();

  const handleLessonComplete = async (results) => {
    // Track lesson completion
    await trackLessonCompleted({
      lessonId,
      courseId,
      score: results.score, // 0-100
      duration: results.durationMinutes, // in minutes
      wordsLearned: results.newWords || 0
    });

    // Show success message, navigate, etc.
  };

  return (
    // ... your component ...
  );
}
```

### 3. Quiz Completion Integration

```javascript
import { useProgressTracking } from '../hooks/useProgressTracking';

function QuizComponent({ quizId }) {
  const { trackQuizCompleted } = useProgressTracking();

  const handleQuizSubmit = async (answers) => {
    const score = calculateScore(answers);
    const duration = getQuizDuration(); // in minutes

    // Track quiz completion
    await trackQuizCompleted({
      quizId,
      score,
      duration
    });

    // Show results
  };

  return (
    // ... your component ...
  );
}
```

## Database Setup

### Step 1: Apply Migration

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- From: database/migrations/061_create_user_activities_table.sql

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}'::jsonb,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON public.user_activities
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activities" ON public.user_activities
    FOR INSERT WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON public.user_activities TO authenticated;
```

### Step 2: Verify Tables

Make sure these tables exist:
- ✅ `user_progress` (with columns: daily_goal, daily_progress, lessons_completed, etc.)
- ✅ `user_activities` (newly created)
- ✅ `user_course_enrollments` (for course progress tracking)

## Testing Your Integration

### 1. Test Live Conversation (Already Works!)

```
1. Navigate to Live Conversation page
2. Start speaking or typing
3. Check browser console for: "✅ Progress updated"
4. Check Dashboard - you should see XP increase!
```

### 2. Test Chat Integration (After You Add It)

```javascript
// In browser console, after sending a message:
// You should see a toast notification: "🎉 +5 XP"
```

### 3. Test Lesson Completion (After You Add It)

```
1. Complete a lesson in a course
2. You should see: "🎓 Lesson completed! +50 XP"
3. Check Dashboard - lessons_completed should increase
4. Check course progress bar - should update
```

## Custom XP Rewards

Want to change XP values? Edit `src/renderer/services/ProgressTracker.js`:

```javascript
const XP_REWARDS = {
  LESSON_COMPLETED: 50,      // Change to 100
  CHAT_MESSAGE_SENT: 5,      // Change to 10
  LIVE_CONVERSATION_5MIN: 50, // Change to 75
  // ... etc
};
```

## Viewing User Activity Log

```javascript
// In your admin panel or analytics page:
const { data: activities } = await supabase
  .from('user_activities')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);

console.log('Recent activities:', activities);
```

## Troubleshooting

### XP Not Updating?

1. **Check browser console** for errors
2. **Verify user is logged in**: `await supabase.auth.getUser()`
3. **Check RLS policies** (see DASHBOARD_FINAL_FIX.md)
4. **Verify tables exist** in Supabase Dashboard

### Toast Notifications Not Showing?

Make sure `react-hot-toast` is imported:

```javascript
import { Toaster } from 'react-hot-toast';

// In your root component:
<Toaster position="bottom-right" />
```

### Progress Not Saving?

Check the `user_progress` table RLS policies allow INSERT/UPDATE.

## Next Steps

1. ✅ **Live Conversation** - Already integrated!
2. 🔲 **Add to Chat Components** - Use the examples above
3. 🔲 **Add to Course/Lesson Components** - Use `trackLessonCompleted`
4. 🔲 **Add to Quiz Components** - Use `trackQuizCompleted`
5. 🔲 **Apply database migration** - Run the SQL above

## Files Reference

- **ProgressTracker.js** - Core tracking service
- **useProgressTracking.js** - React hook for easy integration
- **LiveConversation.tsx** - Example integration (already done!)
- **061_create_user_activities_table.sql** - Database migration

---

**Your progress system is now activity-based and fully automated!** 🎮✨

Every action users take will automatically reward XP, update streaks, and track progress toward daily goals.
