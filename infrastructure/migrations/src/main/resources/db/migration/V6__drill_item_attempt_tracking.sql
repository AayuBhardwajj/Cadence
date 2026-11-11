-- ==============================================================================
-- V6__drill_item_attempt_tracking.sql
-- Cadence Personalized Speech Runner Drills: Attempt Tracking & Report Words
-- DECISIONS.md D28
-- ==============================================================================

-- 1. Add attempt tracking and report-origin columns to user_drill_plan_items
-- Existing historical rows default from_report to false (historical items were carrier/pool phrases)
ALTER TABLE public.user_drill_plan_items
    ADD COLUMN IF NOT EXISTS from_report BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS passed_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NULL;

-- 2. Update phrase_source check constraint to allow 'word' and 'word_bank'
ALTER TABLE public.user_drill_plan_items
    DROP CONSTRAINT IF EXISTS user_drill_plan_items_phrase_source_check;

ALTER TABLE public.user_drill_plan_items
    ADD CONSTRAINT user_drill_plan_items_phrase_source_check
    CHECK (phrase_source IN ('carrier', 'pool', 'curated', 'word', 'word_bank'));

