-- Consolidated from supabase/ SQL files on 2026-07-02.
-- This is a snapshot for future direct-Postgres migration — Supabase remains the source
-- of truth until that phase.
--
-- Source files (applied in dependency order):
--   1. supabase/full_assessment_schema.sql   (profiles, assessments tables)
--   2. supabase/adaptive_learning_schema.sql (speech_profiles, exercise_templates, recommendations, history)
--   3. supabase/notifications_schema.sql     (notifications, security_logs, preferences, user_stats, triggers)
--   4. supabase/daily_tips.sql               (daily_tips)
--
-- NOTE: Supabase-specific auth.users references are kept as-is for documentation.
-- When migrating to direct Postgres, replace auth.users with your own users table.

-- ============================================================
-- 1. PROFILES & ASSESSMENTS  (from full_assessment_schema.sql)
-- ============================================================

-- Full Assessment Schema Updates

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_full_assessment_at TIMESTAMP WITH TIME ZONE;

-- 2. Expand/Create Assessments Table
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Analysis Information
    topic_id TEXT,
    duration_seconds INTEGER,
    transcription TEXT,
    
    -- 6 Core Metrics (0-100)
    overall_score INTEGER DEFAULT 0,
    pronunciation_score INTEGER DEFAULT 0,
    fluency_score INTEGER DEFAULT 0,
    clarity_score INTEGER DEFAULT 0,
    grammar_score INTEGER DEFAULT 0,
    vocabulary_score INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 0,
    
    -- Additional Metadata
    cefr_level TEXT, -- A1, A2, B1, B2, C1, C2
    wpm INTEGER,
    filler_word_count INTEGER,
    eye_contact_score INTEGER,
    
    -- Insights
    strengths TEXT[], -- Array of strings
    focus_areas TEXT[], -- Array of strings
    feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS on Assessments
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;
CREATE POLICY "Users can view their own assessments"
    ON public.assessments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.assessments;
CREATE POLICY "Users can insert their own assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 4. Eligibility Helper Function
CREATE OR REPLACE FUNCTION public.check_assessment_eligibility(user_uuid UUID)
RETURNS TABLE (
    can_assess BOOLEAN,
    next_available_at TIMESTAMP WITH TIME ZONE,
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


-- ============================================================
-- 2. ADAPTIVE LEARNING  (from adaptive_learning_schema.sql)
-- ============================================================

-- Adaptive Learning System Schema

-- 1. Speech Profiles Table
-- Stores the high-level summary of a user's speech capabilities and weaknesses.
CREATE TABLE IF NOT EXISTS public.speech_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_version INTEGER DEFAULT 1,
    created_from_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
    
    -- Weakness Rankings (1 is highest priority)
    weakness_priority_1 TEXT, -- e.g., 'pronunciation'
    weakness_priority_2 TEXT, -- e.g., 'fluency'
    weakness_priority_3 TEXT, -- e.g., 'grammar'
    
    -- Snapshot of current scores
    current_scores JSONB DEFAULT '{}'::jsonb,
    
    -- Detailed identified issues per category
    -- format: { "pronunciation": ["struggles with th", "r vowel distortion"], "fluency": ["23 fillers"] }
    identified_issues JSONB DEFAULT '{}'::jsonb,
    
    -- Learning Attributes
    learning_pace TEXT DEFAULT 'moderate', -- fast, moderate, slow
    recommended_frequency_per_week INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, profile_version)
);

-- 2. Exercise Templates Table
-- Defines the types of exercises available.
CREATE TABLE IF NOT EXISTS public.exercise_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    skill_category TEXT NOT NULL, -- pronunciation, fluency, grammar, vocabulary, clarity, confidence
    difficulty_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
    estimated_duration_minutes INTEGER DEFAULT 5,
    
    -- How to generate dynamic content (can be a system prompt or structure)
    template_structure JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Exercise Recommendations Table
-- Stores the personalized exercises generated for a user.
CREATE TABLE IF NOT EXISTS public.exercise_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    profile_version INTEGER DEFAULT 1,
    template_id UUID REFERENCES public.exercise_templates(id),
    
    -- Personalization Context
    -- why: "You used 23 'um' sounds", task: "Read this paragraph without fillers"
    personalization_context JSONB DEFAULT '{}'::jsonb,
    
    priority_rank INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. User Exercise History Table
-- Tracks every attempt a user makes at an exercise.
CREATE TABLE IF NOT EXISTS public.user_exercise_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recommendation_id UUID REFERENCES public.exercise_recommendations(id),
    
    -- Performance Data
    score INTEGER,
    time_spent_seconds INTEGER,
    errors_made JSONB DEFAULT '[]'::jsonb,
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.speech_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exercise_history ENABLE ROW LEVEL SECURITY;

-- Select Policies
DROP POLICY IF EXISTS "Users can view their own speech profile" ON public.speech_profiles;
CREATE POLICY "Users can view their own speech profile" ON public.speech_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view templates" ON public.exercise_templates;
CREATE POLICY "Users can view templates" ON public.exercise_templates FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.exercise_recommendations;
CREATE POLICY "Users can view their own recommendations" ON public.exercise_recommendations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own history" ON public.user_exercise_history;
CREATE POLICY "Users can view their own history" ON public.user_exercise_history FOR SELECT USING (auth.uid() = user_id);

-- Initial Templates Seed (Optional/Logic handled by backend)
INSERT INTO public.exercise_templates (title, description, skill_category, difficulty_level) VALUES
('Filler Word Awareness', 'Reduce use of um, uh, and like.', 'fluency', 'intermediate'),
('Master "th" Sounds', 'Practice phonemes you struggle with.', 'pronunciation', 'beginner'),
('Timed Speaking Challenge', 'Speak on a topic for 60 seconds without pausing.', 'fluency', 'advanced'),
('Sentence Reconstruction', 'Fix complex grammatical structures.', 'grammar', 'intermediate')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. NOTIFICATIONS & STATS  (from notifications_schema.sql)
-- ============================================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('security', 'learning', 'social')),
    category TEXT NOT NULL, -- e.g., 'login_alert', 'streak_milestone'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_link TEXT, -- Optional link to redirect user
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- SECURITY LOGS TABLE (Ensure existence)
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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


-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{"daily_reminder": true, "goal_milestones": true, "security_alerts": true}'::JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- User Stats Table (for gamification triggers)
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    level TEXT DEFAULT 'Beginner',
    xp INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats"
    ON public.user_stats FOR SELECT
    USING (auth.uid() = user_id);

-- Trigger Function: Security Notification
CREATE OR REPLACE FUNCTION public.handle_security_log_insert()
RETURNS TRIGGER AS $$
DECLARE
    prefs JSONB;
BEGIN
    -- Check user preferences (simplified check)
    -- SELECT preferences INTO prefs FROM public.notification_preferences WHERE user_id = NEW.user_id;
    -- IF prefs->>'security_alerts' = 'false' THEN RETURN NEW; END IF;

    -- Only notify on critical events
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

-- Bind to security_logs
DROP TRIGGER IF EXISTS on_security_log_inserted ON public.security_logs;
CREATE TRIGGER on_security_log_inserted
AFTER INSERT ON public.security_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_security_log_insert();

-- Trigger Function: Learning Activity (Streak & Progress)
CREATE OR REPLACE FUNCTION public.handle_assessment_completion()
RETURNS TRIGGER AS $$
DECLARE
    is_streak_continued BOOLEAN;
BEGIN
    -- Update User Stats
    INSERT INTO public.user_stats (user_id, total_sessions, last_activity_at)
    VALUES (NEW.user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET
        total_sessions = user_stats.total_sessions + 1,
        last_activity_at = NOW();
    
    -- (Simplified Streak Logic - assumes daily check)
    -- This is complex in SQL, usually better in application logic or scheduled job, but here's a rough implementation
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 4. DAILY TIPS  (from daily_tips.sql)
-- ============================================================

create table if not exists public.daily_tips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  tip_date      date not null,
  tip_text      text not null,
  is_personalized boolean not null default false,
  generated_at  timestamptz not null default now(),
 
  -- One tip per user per day
  unique (user_id, tip_date)
);
 
-- Index for fast daily lookup
create index if not exists idx_daily_tips_user_date
  on public.daily_tips (user_id, tip_date desc);
 
-- RLS: users can only read their own tips
alter table public.daily_tips enable row level security;
 
DROP POLICY IF EXISTS "Users read own tips" ON public.daily_tips;
create policy "Users read own tips"
  on public.daily_tips for select
  using (auth.uid() = user_id);
 
-- Backend service role can write (your FastAPI uses service key)
DROP POLICY IF EXISTS "Service role can upsert tips" ON public.daily_tips;
create policy "Service role can upsert tips"
  on public.daily_tips for all
  using (true)
  with check (true);
