-- Storage policies for manuscript uploads
-- Allow authenticated users to upload to manuscripts bucket
DROP POLICY IF EXISTS "manuscripts_upload_auth" ON storage.objects;
CREATE POLICY "manuscripts_upload_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manuscripts');

-- Allow public read of manuscripts bucket
DROP POLICY IF EXISTS "manuscripts_read_public" ON storage.objects;
CREATE POLICY "manuscripts_read_public" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'manuscripts');

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "manuscripts_delete_own" ON storage.objects;
CREATE POLICY "manuscripts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manuscripts' AND owner = auth.uid());
