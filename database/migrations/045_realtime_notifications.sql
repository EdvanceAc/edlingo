-- 045_realtime_notifications.sql
-- Enhances notifications table for real-time delivery and admin controls

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extend notification schema with richer metadata
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

UPDATE public.notifications
SET title = COALESCE(title, 'Announcement')
WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_is_visible
  ON public.notifications(is_visible);

CREATE INDEX IF NOT EXISTS idx_notifications_priority
  ON public.notifications(priority);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type);

COMMENT ON COLUMN public.notifications.title IS 'Short heading displayed to the learner';
COMMENT ON COLUMN public.notifications.priority IS 'low | normal | high';
COMMENT ON COLUMN public.notifications.category IS 'High level grouping (course, achievement, promo, etc)';
COMMENT ON COLUMN public.notifications.metadata IS 'Arbitrary JSON payload (CTA labels, deeplinks, etc)';
COMMENT ON COLUMN public.notifications.sent_by IS 'Auth user that dispatched the notification';
COMMENT ON COLUMN public.notifications.is_visible IS 'Admins can toggle to hide/show notification instantly';
COMMENT ON COLUMN public.notifications.action_url IS 'Optional deeplink/button url';

-- Refresh RLS policies with cleaner auth.uid() checks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND polname = 'Users can view own notifications'
  ) THEN
    DROP POLICY "Users can view own notifications" ON public.notifications;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND polname = 'Users can insert own notifications'
  ) THEN
    DROP POLICY "Users can insert own notifications" ON public.notifications;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND polname = 'Users can update own notifications'
  ) THEN
    DROP POLICY "Users can update own notifications" ON public.notifications;
  END IF;
END $$;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;

CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
        AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
        AND user_roles.is_active = true
    )
  );

-- Admin broadcast helper (security definer to bypass user-only RLS)
CREATE OR REPLACE FUNCTION public.admin_dispatch_notification(
  p_title TEXT,
  p_content TEXT,
  p_type TEXT DEFAULT 'info',
  p_priority TEXT DEFAULT 'normal',
  p_audience TEXT DEFAULT 'all',
  p_target_identifiers TEXT[] DEFAULT NULL,
  p_course_ids UUID[] DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_is_visible BOOLEAN DEFAULT true
)
RETURNS TABLE(notification_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_users UUID[];
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Notification content is required';
  END IF;

  IF p_audience = 'course' AND (p_course_ids IS NULL OR array_length(p_course_ids, 1) = 0) THEN
    RAISE EXCEPTION 'course_ids required when audience = course';
  END IF;

  IF p_audience = 'user' AND (p_target_identifiers IS NULL OR array_length(p_target_identifiers, 1) = 0) THEN
    RAISE EXCEPTION 'target identifiers required when audience = user';
  END IF;

  -- Require admin role
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
      AND user_roles.is_active = true
  ) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_audience = 'all' THEN
    SELECT array_agg(id) INTO target_users
    FROM public.user_profiles;
  ELSIF p_audience = 'course' THEN
    SELECT array_agg(DISTINCT user_id) INTO target_users
    FROM public.user_course_enrollments
    WHERE course_id = ANY(p_course_ids);
  ELSE
    WITH tokens AS (
      SELECT DISTINCT trim(token) AS token
      FROM unnest(COALESCE(p_target_identifiers, ARRAY[]::TEXT[])) AS token
      WHERE trim(token) <> ''
    ),
    resolved AS (
      SELECT DISTINCT
        COALESCE(
          CASE
            WHEN t.token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              THEN t.token::uuid
            ELSE NULL
          END,
          up.id
        ) AS user_id
      FROM tokens t
      LEFT JOIN public.user_profiles up
        ON up.id::text = t.token
        OR lower(up.email) = lower(t.token)
        OR lower(COALESCE(up.username, '')) = lower(t.token)
    )
    SELECT array_agg(DISTINCT user_id)
    INTO target_users
    FROM resolved
    WHERE user_id IS NOT NULL;
  END IF;

  IF target_users IS NULL OR array_length(target_users, 1) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.notifications (
    user_id,
    title,
    content,
    type,
    priority,
    action_url,
    metadata,
    is_visible,
    sent_by
  )
  SELECT
    u_id,
    COALESCE(NULLIF(trim(p_title), ''), 'Announcement'),
    p_content,
    COALESCE(NULLIF(trim(p_type), ''), 'info'),
    COALESCE(p_priority, 'normal'),
    NULLIF(trim(p_action_url), ''),
    COALESCE(p_metadata, '{}'::jsonb),
    COALESCE(p_is_visible, true),
    auth.uid()
  FROM unnest(target_users) AS u_id
  RETURNING id, user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_dispatch_notification TO authenticated;

COMMIT;

