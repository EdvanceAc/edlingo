-- Fix RLS policies to reference auth.uid() directly (user_profiles.id == auth.users.id)

-- Enrollments
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can view own enrollments" ON public.user_course_enrollments
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can upsert own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can upsert own enrollments" ON public.user_course_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own enrollments" ON public.user_course_enrollments;
CREATE POLICY "Users can update own enrollments" ON public.user_course_enrollments
  FOR UPDATE USING (user_id = auth.uid());

-- Course reviews (keep public approved reviews policy)
DROP POLICY IF EXISTS "Users can view own unapproved reviews" ON public.course_reviews;
CREATE POLICY "Users can view own unapproved reviews" ON public.course_reviews
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own reviews" ON public.course_reviews;
CREATE POLICY "Users can insert own reviews" ON public.course_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reviews" ON public.course_reviews;
CREATE POLICY "Users can update own reviews" ON public.course_reviews
  FOR UPDATE USING (user_id = auth.uid());

-- Study reminders
DROP POLICY IF EXISTS "Users manage own reminders" ON public.study_reminders;
CREATE POLICY "Users manage own reminders" ON public.study_reminders
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Wishlist
DROP POLICY IF EXISTS "Users manage own wishlist" ON public.user_course_wishlist;
CREATE POLICY "Users manage own wishlist" ON public.user_course_wishlist
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- User lesson progress
DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can view own lesson progress" ON public.user_lesson_progress
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can insert own lesson progress" ON public.user_lesson_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own lesson progress" ON public.user_lesson_progress
  FOR UPDATE USING (user_id = auth.uid());


