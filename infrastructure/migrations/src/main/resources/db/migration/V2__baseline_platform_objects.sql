-- V2__baseline_platform_objects.sql
-- Supabase platform objects: storage buckets, auth trigger, RLS policies, realtime publication.
-- These are verbatim from live prod. On prod this migration is skipped (baselined at V3).
-- On staging, the bootstrap SQL (00_supabase_compat.sql) provides the auth/storage/realtime stubs
-- that these statements target.

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars',true),
  ('chat-media','chat-media',true),
  ('assessment-recordings','assessment-recordings',false)
ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can read their own assessment recordings" ON storage.objects FOR SELECT
  USING (bucket_id = 'assessment-recordings' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can upload their own assessment recordings" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assessment-recordings' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY "Users can delete their own assessment recordings" ON storage.objects FOR DELETE
  USING (bucket_id = 'assessment-recordings' AND (storage.foldername(name))[1] = (auth.uid())::text);
CREATE POLICY chat_media_read ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');
CREATE POLICY chat_media_upload ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.assessments, public.chat_messages, public.chat_rooms, public.dm_conversations,
  public.dm_messages, public.profiles, public.security_logs;
