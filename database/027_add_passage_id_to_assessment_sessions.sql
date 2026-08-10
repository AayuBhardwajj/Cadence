-- Migration: 027_add_passage_id_to_assessment_sessions.sql
-- Description: Add nullable passage_id foreign key referencing generated_passages to assessment_sessions.

ALTER TABLE public.assessment_sessions
ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES public.generated_passages(id) ON DELETE SET NULL;
