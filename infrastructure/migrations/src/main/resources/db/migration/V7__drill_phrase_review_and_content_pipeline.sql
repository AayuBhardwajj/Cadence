-- ==============================================================================
-- V7__drill_phrase_review_and_content_pipeline.sql
-- Cadence Personalized Speech Runner Drills: Phrase Review & Content Pipeline
-- DECISIONS.md D29: Offline generation, deterministic validation, manual review
-- ==============================================================================

-- 1. Fix user_drill_plan_items.phrase_source CHECK constraint
-- Allow 'llm_pool' alongside existing phrase sources to support offline-generated content
ALTER TABLE public.user_drill_plan_items
    DROP CONSTRAINT IF EXISTS user_drill_plan_items_phrase_source_check;

ALTER TABLE public.user_drill_plan_items
    ADD CONSTRAINT user_drill_plan_items_phrase_source_check
    CHECK (phrase_source IN ('carrier', 'pool', 'curated', 'word', 'word_bank', 'llm_pool'));


-- 2. Add review columns and safety constraints to drill_phrases
-- Existing curated seed rows default to 'approved' to remain servable
ALTER TABLE public.drill_phrases
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved'
        CHECK (review_status IN ('pending', 'approved', 'rejected')),
    ADD COLUMN IF NOT EXISTS batch_id UUID NULL,
    ADD COLUMN IF NOT EXISTS validation JSONB NULL,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ NULL;

-- Enforce that active phrases must be approved (prevents serving pending/rejected content)
ALTER TABLE public.drill_phrases
    DROP CONSTRAINT IF EXISTS chk_drill_phrases_active_requires_approved;

ALTER TABLE public.drill_phrases
    ADD CONSTRAINT chk_drill_phrases_active_requires_approved
    CHECK (NOT active OR review_status = 'approved');

CREATE INDEX IF NOT EXISTS idx_drill_phrases_review_status_pending
    ON public.drill_phrases (review_status)
    WHERE review_status = 'pending';


-- 3. DRILL PHRASE GENERATION LOG (Auditing offline generation batches)
CREATE TABLE IF NOT EXISTS public.drill_phrase_generation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('onset', 'bucket')),
    target_key TEXT NOT NULL,
    level SMALLINT NOT NULL CHECK (level IN (2, 3)),
    candidate_count INT NOT NULL,
    valid_count INT NOT NULL,
    rejection_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
    model TEXT NOT NULL,
    cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drill_phrase_gen_log_batch
    ON public.drill_phrase_generation_log (batch_id);

CREATE INDEX IF NOT EXISTS idx_drill_phrase_gen_log_target
    ON public.drill_phrase_generation_log (target_key, level);

ALTER TABLE public.drill_phrase_generation_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.drill_phrase_generation_log TO service_role;


-- 4. DRILL PHRASE GENERATION LOCK (Advisory lock for offline generation jobs)
CREATE TABLE IF NOT EXISTS public.drill_phrase_generation_lock (
    lock_key BIGINT NOT NULL PRIMARY KEY,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_at TIMESTAMPTZ NULL
);

ALTER TABLE public.drill_phrase_generation_lock ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.drill_phrase_generation_lock TO service_role;

INSERT INTO public.drill_phrase_generation_lock (lock_key, is_locked, locked_at)
VALUES (192837467, false, NULL)
ON CONFLICT (lock_key) DO NOTHING;

-- RPC try_drill_phrase_generation_lock (15-minute lease, lock_key 192837467)
CREATE OR REPLACE FUNCTION public.try_drill_phrase_generation_lock() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.drill_phrase_generation_lock (lock_key, is_locked, locked_at)
    VALUES (192837467, TRUE, NOW())
    ON CONFLICT (lock_key) DO UPDATE
    SET is_locked = TRUE,
        locked_at = NOW()
    WHERE public.drill_phrase_generation_lock.is_locked = FALSE 
       OR public.drill_phrase_generation_lock.locked_at < NOW() - INTERVAL '15 minutes'
    RETURNING TRUE INTO v_success;

    RETURN COALESCE(v_success, FALSE);
END;
$$;

-- RPC unlock_drill_phrase_generation
CREATE OR REPLACE FUNCTION public.unlock_drill_phrase_generation() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.drill_phrase_generation_lock
    SET is_locked = FALSE,
        locked_at = NULL
    WHERE lock_key = 192837467;
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_drill_phrase_generation_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_drill_phrase_generation() TO service_role;

