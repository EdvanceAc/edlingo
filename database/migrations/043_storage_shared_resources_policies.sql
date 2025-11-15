-- Ensure public bucket 'shared-resources' exists and allow authenticated uploads

-- 1) Create bucket if missing (id is primary key)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-resources', 'shared-resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Public read access for this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read shared-resources'
  ) THEN
    CREATE POLICY "Public read shared-resources"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'shared-resources');
  END IF;
END$$;

-- 3) Allow authenticated users to upload into this bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated upload to shared-resources'
  ) THEN
    CREATE POLICY "Authenticated upload to shared-resources"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'shared-resources');
  END IF;
END$$;

-- 4) Allow object owner to update/delete their files (optional but useful)
-- These rely on storage.objects.owner being set to auth.uid() automatically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner update shared-resources'
  ) THEN
    CREATE POLICY "Owner update shared-resources"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'shared-resources' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'shared-resources' AND owner = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owner delete shared-resources'
  ) THEN
    CREATE POLICY "Owner delete shared-resources"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'shared-resources' AND owner = auth.uid());
  END IF;
END$$;

COMMIT;

