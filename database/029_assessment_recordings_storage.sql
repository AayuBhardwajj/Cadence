-- 029_assessment_recordings_storage.sql
-- Creates the private 'assessment-recordings' storage bucket for speech recordings.
-- Note on RLS: Backend ingestion (session-service / ml-audio) uses the Supabase service-role key,
-- which bypasses RLS by design. The user-scoped policies below are forward-looking defense-in-depth
-- (e.g. for direct authenticated frontend playback/downloads if introduced in future features).

-- 1. Create the 'assessment-recordings' bucket (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assessment-recordings', 'assessment-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to view/read only their own recordings
CREATE POLICY "Users can read their own assessment recordings" 
ON storage.objects FOR SELECT 
TO authenticated
USING (
    bucket_id = 'assessment-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow authenticated users to insert/upload only to their own folder
CREATE POLICY "Users can upload their own assessment recordings" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
    bucket_id = 'assessment-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to delete only their own recordings
CREATE POLICY "Users can delete their own assessment recordings" 
ON storage.objects FOR DELETE 
TO authenticated
USING (
    bucket_id = 'assessment-recordings' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
