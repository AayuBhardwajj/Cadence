-- Migration 033: Add reference_passage_text column to public.assessment_reports

ALTER TABLE public.assessment_reports
  ADD COLUMN IF NOT EXISTS reference_passage_text TEXT NULL;
