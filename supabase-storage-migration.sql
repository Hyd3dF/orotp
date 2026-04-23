-- =========================================================
-- SUPABASE STORAGE MIGRATION
-- Apply only the storage changes needed for uploads
-- Safe to run on an existing self-hosted Supabase instance
-- =========================================================

BEGIN;

-- Ensure the app buckets exist and are public.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('chat-images', 'chat-images', true),
  ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;

-- Make sure the storage objects table is protected by RLS.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated users uploading through the client SDK.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.buckets TO authenticated;

-- Remove any previous policies with the same names before recreating them.
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "chat_images_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "post_images_delete_own" ON storage.objects;

-- Object policies keep authenticated uploads scoped to each user's namespace.
CREATE POLICY "avatars_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "chat_images_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-images');

CREATE POLICY "chat_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "chat_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "post_images_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-images');

CREATE POLICY "post_images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

CREATE POLICY "post_images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND split_part(name, '/', 2) = auth.uid()::text
  );

COMMIT;
