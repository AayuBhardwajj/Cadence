-- Migration 035: Dedicated advisory lock and research audit log for autonomous word bank research
-- per DECISIONS.md D21

-- 1. Word Bank Research Lock Table for distributed locking
CREATE TABLE IF NOT EXISTS public.word_bank_research_lock (
    lock_key   BIGINT PRIMARY KEY,
    is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at  TIMESTAMPTZ
);

-- Initialize the lock row (key: 192837466, distinct from content-service's 192837465)
INSERT INTO public.word_bank_research_lock (lock_key, is_locked)
VALUES (192837466, FALSE)
ON CONFLICT (lock_key) DO NOTHING;

-- Enable RLS (Service role access only, no public policies)
ALTER TABLE public.word_bank_research_lock ENABLE ROW LEVEL SECURITY;


-- 2. Atomic try_word_bank_research_lock function (15-minute lease expiry CAS)
CREATE OR REPLACE FUNCTION public.try_word_bank_research_lock()
RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.word_bank_research_lock (lock_key, is_locked, locked_at)
    VALUES (192837466, TRUE, NOW())
    ON CONFLICT (lock_key) DO UPDATE
    SET is_locked = TRUE,
        locked_at = NOW()
    WHERE public.word_bank_research_lock.is_locked = FALSE 
       OR public.word_bank_research_lock.locked_at < NOW() - INTERVAL '15 minutes'
    RETURNING TRUE INTO v_success;

    RETURN COALESCE(v_success, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atomic unlock_word_bank_research function
CREATE OR REPLACE FUNCTION public.unlock_word_bank_research()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.word_bank_research_lock
    SET is_locked = FALSE,
        locked_at = NULL
    WHERE lock_key = 192837466;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Word Bank Research Audit Log Table
CREATE TABLE IF NOT EXISTS public.word_bank_research_log (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id           UUID NOT NULL,
    proposed_word      TEXT NOT NULL,
    word_code          TEXT,
    issue_type         TEXT,
    bucket             TEXT,
    bucket_2           TEXT,
    topic_fit          TEXT,
    difficulty         TEXT,
    why                TEXT,
    source_urls        TEXT[],
    llm_raw_rationale  TEXT,
    status             TEXT NOT NULL CHECK (status IN ('inserted', 'rejected_duplicate', 'rejected_validation', 'rejected_bad_bucket')),
    rejection_reason   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_word_bank_research_log_batch ON public.word_bank_research_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_word_bank_research_log_status ON public.word_bank_research_log(status);

-- Enable RLS (Service role access only, no public policies)
ALTER TABLE public.word_bank_research_log ENABLE ROW LEVEL SECURITY;
