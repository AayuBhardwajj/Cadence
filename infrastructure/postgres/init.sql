-- =============================================================================
-- infrastructure/postgres/init.sql
--
-- Assembled on 2026-07-02 as part of Phase 0.1 hotfix.
--
-- Structure (in dependency order):
--   Part 1  — auth schema stub        (from auth_stub.sql)
--   Part 2  — public.profiles         (from live schema dump, or best-effort
--                                       local approximation until dump runs)
--   Part 3  — public schema objects   (from public_schema_dump.sql once Task 2
--                                       of the Phase 0.1 prompt has been run,
--                                       or the consolidated migration content
--                                       below in the interim)
--
-- How to regenerate this file:
--   1. export SUPABASE_DB_URL="<direct URI from Supabase Dashboard>"
--   2. Install pg_dump if needed:
--        brew install libpq
--        echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
--        source ~/.zshrc
--   3. Run:
--        pg_dump "$SUPABASE_DB_URL" \
--          --schema-only --schema=public \
--          --no-owner --no-privileges --no-comments \
--          -f infrastructure/postgres/public_schema_dump.sql
--   4. Reassemble this file:  cat auth_stub.sql public_schema_dump.sql > init.sql
--      (prepend this header comment manually)
--
-- Do not hand-edit the generated sections below — edits will be lost on
-- regeneration. Only the header comment and Part 1 (auth stub) are stable.
-- =============================================================================


-- =============================================================================
-- PART 1 — Auth schema stub
-- (Contents of auth_stub.sql — kept inline so docker-entrypoint-initdb.d/
--  only needs a single file.)
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users stub.
-- public.profiles.id and public.daily_tips.user_id reference auth.users(id).
CREATE TABLE IF NOT EXISTS auth.users (
    id    UUID PRIMARY KEY,
    email TEXT
);

COMMENT ON TABLE auth.users IS
    'Minimal local stub for Supabase-managed auth.users. NOT a replica of '
    'production auth internals — exists only to satisfy foreign key constraints '
    'from public.profiles and public.daily_tips during local development. '
    'Generated as part of Phase 0.1 hotfix.';

-- Stub for auth.uid() — always returns NULL locally.
-- RLS policies that call auth.uid() compile cleanly but are effectively no-ops
-- in the local container (which does not run PostgREST).
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULL::UUID;
$$;

COMMENT ON FUNCTION auth.uid() IS
    'Stub implementation of Supabase auth.uid(). Always returns NULL in local '
    'development. In production this is provided by Supabase/GoTrue.';


-- =============================================================================
-- PART 2 — public schema
--
-- ⚠️  PLACEHOLDER — Replace this entire section with the output of:
--       pg_dump "$SUPABASE_DB_URL" --schema-only --schema=public \
--         --no-owner --no-privileges --no-comments \
--         -f infrastructure/postgres/public_schema_dump.sql
--   then cat auth_stub.sql public_schema_dump.sql > init.sql
--
-- The content below is the best-effort local approximation derived from the
-- incremental migration files under supabase/*.sql.  It is sufficient for
-- local Spring Boot development (Hibernate validate mode) but may drift from
-- the real production schema over time.
-- =============================================================================

-- public.profiles
-- Supabase convention: profiles.id is a 1-to-1 FK to auth.users.id.
-- The real column set comes from the live dump; these are the minimum columns
-- referenced by other tables and application code in this repo.
CREATE TABLE IF NOT EXISTS public.profiles (
    id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                   TEXT,
    full_name               TEXT,
    avatar_url              TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Added by full_assessment_schema.sql migration:
    last_full_assessment_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- =============================================================================
-- Assessments (full_assessment_schema.sql)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.assessments (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

    -- Analysis Information
    topic_id             TEXT,
    duration_seconds     INTEGER,
    transcription        TEXT,

    -- 6 Core Metrics (0-100)
    overall_score        INTEGER DEFAULT 0,
    pronunciation_score  INTEGER DEFAULT 0,
    fluency_score        INTEGER DEFAULT 0,
    clarity_score        INTEGER DEFAULT 0,
    grammar_score        INTEGER DEFAULT 0,
    vocabulary_score     INTEGER DEFAULT 0,
    confidence_score     INTEGER DEFAULT 0,

    -- Additional Metadata
    cefr_level           TEXT,   -- A1, A2, B1, B2, C1, C2
    wpm                  INTEGER,
    filler_word_count    INTEGER,
    eye_contact_score    INTEGER,

    -- Insights
    strengths            TEXT[],
    focus_areas          TEXT[],
    feedback             TEXT,

    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;
CREATE POLICY "Users can view their own assessments"
    ON public.assessments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.assessments;
CREATE POLICY "Users can insert their own assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_assessment_eligibility(user_uuid UUID)
RETURNS TABLE (
    can_assess            BOOLEAN,
    next_available_at     TIMESTAMP WITH TIME ZONE,
    assessments_remaining INTEGER
) AS $$
DECLARE
    last_assessment TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT last_full_assessment_at INTO last_assessment
    FROM public.profiles
    WHERE id = user_uuid;

    IF last_assessment IS NULL OR (NOW() - last_assessment) > INTERVAL '24 hours' THEN
        RETURN QUERY SELECT TRUE, NULL::TIMESTAMP WITH TIME ZONE, 1;
    ELSE
        RETURN QUERY SELECT FALSE, last_assessment + INTERVAL '24 hours', 0;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Adaptive Learning (adaptive_learning_schema.sql)
-- =============================================================================

-- Speech Profiles
CREATE TABLE IF NOT EXISTS public.speech_profiles (
    id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id                     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_version             INTEGER DEFAULT 1,
    created_from_assessment_id  UUID REFERENCES public.assessments(id) ON DELETE SET NULL,

    weakness_priority_1         TEXT,
    weakness_priority_2         TEXT,
    weakness_priority_3         TEXT,

    current_scores              JSONB DEFAULT '{}'::jsonb,
    identified_issues           JSONB DEFAULT '{}'::jsonb,

    learning_pace               TEXT DEFAULT 'moderate',
    recommended_frequency_per_week INTEGER DEFAULT 3,

    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, profile_version)
);

-- Exercise Templates
CREATE TABLE IF NOT EXISTS public.exercise_templates (
    id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title                       TEXT NOT NULL,
    description                 TEXT,
    skill_category              TEXT NOT NULL,
    difficulty_level            TEXT DEFAULT 'intermediate',
    estimated_duration_minutes  INTEGER DEFAULT 5,
    template_structure          JSONB DEFAULT '{}'::jsonb,
    is_active                   BOOLEAN DEFAULT TRUE,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercise Recommendations
CREATE TABLE IF NOT EXISTS public.exercise_recommendations (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_version       INTEGER DEFAULT 1,
    template_id           UUID REFERENCES public.exercise_templates(id),
    personalization_context JSONB DEFAULT '{}'::jsonb,
    priority_rank         INTEGER DEFAULT 1,
    is_active             BOOLEAN DEFAULT TRUE,
    status                TEXT DEFAULT 'not_started',
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Exercise History
CREATE TABLE IF NOT EXISTS public.user_exercise_history (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recommendation_id UUID REFERENCES public.exercise_recommendations(id),
    score             INTEGER,
    time_spent_seconds INTEGER,
    errors_made       JSONB DEFAULT '[]'::jsonb,
    completed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.speech_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own speech profile" ON public.speech_profiles;
CREATE POLICY "Users can view their own speech profile"
    ON public.speech_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view templates" ON public.exercise_templates;
CREATE POLICY "Users can view templates"
    ON public.exercise_templates FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.exercise_recommendations;
CREATE POLICY "Users can view their own recommendations"
    ON public.exercise_recommendations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own history" ON public.user_exercise_history;
CREATE POLICY "Users can view their own history"
    ON public.user_exercise_history FOR SELECT USING (auth.uid() = user_id);

-- Seed data
INSERT INTO public.exercise_templates (title, description, skill_category, difficulty_level) VALUES
('Filler Word Awareness',    'Reduce use of um, uh, and like.',                   'fluency',        'intermediate'),
('Master "th" Sounds',       'Practice phonemes you struggle with.',              'pronunciation',  'beginner'),
('Timed Speaking Challenge', 'Speak on a topic for 60 seconds without pausing.', 'fluency',        'advanced'),
('Sentence Reconstruction',  'Fix complex grammatical structures.',               'grammar',        'intermediate')
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Notifications & Stats (notifications_schema.sql)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type        TEXT NOT NULL CHECK (type IN ('security', 'learning', 'social')),
    category    TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    action_link TEXT,
    metadata    JSONB DEFAULT '{}'::JSONB,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.security_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type  TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}'::JSONB,
    user_agent  TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own security logs" ON public.security_logs;
CREATE POLICY "Users can view their own security logs"
    ON public.security_logs FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own security logs" ON public.security_logs;
CREATE POLICY "Users can insert their own security logs"
    ON public.security_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled  BOOLEAN DEFAULT TRUE,
    sms_enabled   BOOLEAN DEFAULT FALSE,
    preferences   JSONB DEFAULT '{"daily_reminder": true, "goal_milestones": true, "security_alerts": true}'::JSONB,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    current_streak   INTEGER DEFAULT 0,
    longest_streak   INTEGER DEFAULT 0,
    total_sessions   INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    level            TEXT DEFAULT 'Beginner',
    xp               INTEGER DEFAULT 0,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats"
    ON public.user_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Trigger: security notification on security_log insert
CREATE OR REPLACE FUNCTION public.handle_security_log_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type IN ('Password Change', 'Password Set', 'MFA Enabled', 'New Login') THEN
        INSERT INTO public.notifications (user_id, type, category, title, message, metadata)
        VALUES (
            NEW.user_id,
            'security',
            'security_alert',
            'Security Alert: ' || NEW.event_type,
            'A ' || NEW.event_type || ' event was detected on your account.',
            NEW.metadata
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_security_log_inserted ON public.security_logs;
CREATE TRIGGER on_security_log_inserted
    AFTER INSERT ON public.security_logs
    FOR EACH ROW EXECUTE FUNCTION public.handle_security_log_insert();

-- Trigger: assessment completion → update user_stats
CREATE OR REPLACE FUNCTION public.handle_assessment_completion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_stats (user_id, total_sessions, last_activity_at)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
        total_sessions   = user_stats.total_sessions + 1,
        last_activity_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Daily Tips (daily_tips.sql)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_tips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tip_date        DATE NOT NULL,
    tip_text        TEXT NOT NULL,
    is_personalized BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, tip_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_tips_user_date
    ON public.daily_tips (user_id, tip_date DESC);

ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tips" ON public.daily_tips;
CREATE POLICY "Users read own tips"
    ON public.daily_tips FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can upsert tips" ON public.daily_tips;
CREATE POLICY "Service role can upsert tips"
    ON public.daily_tips FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);
