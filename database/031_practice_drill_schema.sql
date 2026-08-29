-- Migration 031: Practice Drill Schema (DECISIONS.md D17)
-- Self-contained schema for Quick Practice drill mode.

CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    bucket TEXT NOT NULL,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.drill_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE NOT NULL,
    target_text TEXT NOT NULL,
    transcribed_text TEXT,
    is_match BOOLEAN NOT NULL,
    attempt_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_attempts_session_id ON public.drill_attempts(practice_session_id);

-- Enable Row Level Security
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view own practice sessions"
    ON public.practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practice sessions"
    ON public.practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice sessions"
    ON public.practice_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policies for drill_attempts
CREATE POLICY "Users can view own drill attempts"
    ON public.drill_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = drill_attempts.practice_session_id
              AND ps.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own drill attempts"
    ON public.drill_attempts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.practice_sessions ps
            WHERE ps.id = drill_attempts.practice_session_id
              AND ps.user_id = auth.uid()
        )
    );
