CREATE POLICY "chat_media_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "chat_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');