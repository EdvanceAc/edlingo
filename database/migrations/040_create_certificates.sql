-- Certificates for course completion

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verification_code TEXT UNIQUE,
  share_url TEXT,
  UNIQUE(user_id, certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON public.user_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_certificates_course_id ON public.user_certificates(course_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_certificates()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_certificates_updated_at ON public.certificates;
CREATE TRIGGER update_certificates_updated_at
BEFORE UPDATE ON public.certificates
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_certificates();

-- RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view active certificates" ON public.certificates;
CREATE POLICY "Anyone can view active certificates" ON public.certificates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage certificates" ON public.certificates;
CREATE POLICY "Admins manage certificates" ON public.certificates
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users view own user_certificates" ON public.user_certificates;
CREATE POLICY "Users view own user_certificates" ON public.user_certificates
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System award certificate" ON public.user_certificates;
CREATE POLICY "System award certificate" ON public.user_certificates
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update own user_certificates" ON public.user_certificates;
CREATE POLICY "Users update own user_certificates" ON public.user_certificates
  FOR UPDATE USING (user_id = auth.uid());

COMMENT ON TABLE public.certificates IS 'Certificate templates per course';
COMMENT ON TABLE public.user_certificates IS 'Awarded certificates for users';

