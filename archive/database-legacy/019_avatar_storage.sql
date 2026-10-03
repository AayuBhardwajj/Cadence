-- 1. Create the 'avatars' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone to view photos (Public)
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 3. Allow only you to upload to your own folder
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow only you to update/delete your own photos
CREATE POLICY "Users can update their own avatars" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);