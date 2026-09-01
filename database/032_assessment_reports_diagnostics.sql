-- Migration 032: Add full diagnostic JSONB and TEXT columns to public.assessment_reports

ALTER TABLE public.assessment_reports
  ADD COLUMN IF NOT EXISTS amcat_metrics JSONB,
  ADD COLUMN IF NOT EXISTS amcat_insights JSONB,
  ADD COLUMN IF NOT EXISTS amcat_error_log JSONB,
  ADD COLUMN IF NOT EXISTS amcat_sentences JSONB,
  ADD COLUMN IF NOT EXISTS amcat_mti_deep_dive JSONB,
  ADD COLUMN IF NOT EXISTS amcat_summary JSONB,
  ADD COLUMN IF NOT EXISTS improvement_plan JSONB,
  ADD COLUMN IF NOT EXISTS practice_exercises JSONB,
  ADD COLUMN IF NOT EXISTS grammar_errors JSONB,
  ADD COLUMN IF NOT EXISTS next_topic_suggestion TEXT;
