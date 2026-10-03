-- Migration: Create passage_pool and refill_lock tables, and setup concurrency control functions.

CREATE TABLE IF NOT EXISTS public.passage_pool (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passage_id     UUID REFERENCES public.generated_passages(id) ON DELETE CASCADE NOT NULL,
    topic          VARCHAR(100) NOT NULL,
    difficulty     VARCHAR(50) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status         VARCHAR(20) NOT NULL DEFAULT 'available' 
                     CHECK (status IN ('available', 'served')),
    served_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passage_pool_combo_status 
  ON public.passage_pool (topic, difficulty, status);

-- Enable RLS (Service role access only, no public policies)
ALTER TABLE public.passage_pool ENABLE ROW LEVEL SECURITY;


-- Refill Lock Table for session-independent distributed locks over HTTP REST
CREATE TABLE IF NOT EXISTS public.refill_lock (
    lock_key   BIGINT PRIMARY KEY,
    is_locked  BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at  TIMESTAMPTZ
);

-- Initialize the lock row
INSERT INTO public.refill_lock (lock_key, is_locked)
VALUES (192837465, FALSE)
ON CONFLICT (lock_key) DO NOTHING;

-- Enable RLS for refill_lock (Service role access only)
ALTER TABLE public.refill_lock ENABLE ROW LEVEL SECURITY;


-- 1. Atomic claim function for get_or_generate_passage using SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_pooled_passage(
    p_topic VARCHAR, 
    p_difficulty VARCHAR
)
RETURNS SETOF public.passage_pool AS $$
BEGIN
    RETURN QUERY
    UPDATE public.passage_pool
    SET status = 'served', 
        served_at = NOW()
    WHERE id = (
        SELECT id 
        FROM public.passage_pool 
        WHERE topic = p_topic 
          AND difficulty = p_difficulty 
          AND status = 'available'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Atomic try_refill_lock function
CREATE OR REPLACE FUNCTION public.try_refill_lock()
RETURNS BOOLEAN AS $$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    INSERT INTO public.refill_lock (lock_key, is_locked, locked_at)
    VALUES (192837465, TRUE, NOW())
    ON CONFLICT (lock_key) DO UPDATE
    SET is_locked = TRUE,
        locked_at = NOW()
    WHERE public.refill_lock.is_locked = FALSE 
       OR public.refill_lock.locked_at < NOW() - INTERVAL '15 minutes'
    RETURNING TRUE INTO v_success;

    RETURN COALESCE(v_success, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atomic unlock_refill function
CREATE OR REPLACE FUNCTION public.unlock_refill()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.refill_lock
    SET is_locked = FALSE,
        locked_at = NULL
    WHERE lock_key = 192837465;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
