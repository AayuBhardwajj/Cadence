-- 030_add_audio_storage_path_to_assessment_sessions.sql
-- Adds audio_storage_path to public.assessment_sessions to persist the durable relative storage path
-- (e.g. '{user_id}/{session_id}.webm') in the 'assessment-recordings' Supabase Storage bucket.
-- Follows D6 expand-contract precedent: nullable column, zero impact on existing monolith operations.

ALTER TABLE public.assessment_sessions 
ADD COLUMN IF NOT EXISTS audio_storage_path TEXT;
