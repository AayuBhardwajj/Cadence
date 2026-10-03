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

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can view their own security logs"
    ON public.security_logs FOR SELECT
    USING (auth.uid() = user_id);

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

CREATE POLICY "Users can view their own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Insert default preferences on profile creation (Optional, if you have a trigger on profiles)
-- OR handle in frontend if missing.

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

-- Bind to assessments (Assuming assessments table exists)
-- DROP TRIGGER IF EXISTS on_assessment_completed ON public.assessments;
-- CREATE TRIGGER on_assessment_completed
-- AFTER INSERT ON public.assessments
-- FOR EACH ROW EXECUTE FUNCTION public.handle_assessment_completion();
