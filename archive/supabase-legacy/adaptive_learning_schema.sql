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
CREATE POLICY "Users can view their own speech profile" ON public.speech_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view templates" ON public.exercise_templates FOR SELECT USING (TRUE);
CREATE POLICY "Users can view their own recommendations" ON public.exercise_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own history" ON public.user_exercise_history FOR SELECT USING (auth.uid() = user_id);

-- Initial Templates Seed (Optional/Logic handled by backend)
INSERT INTO public.exercise_templates (title, description, skill_category, difficulty_level) VALUES
('Filler Word Awareness', 'Reduce use of um, uh, and like.', 'fluency', 'intermediate'),
('Master "th" Sounds', 'Practice phonemes you struggle with.', 'pronunciation', 'beginner'),
('Timed Speaking Challenge', 'Speak on a topic for 60 seconds without pausing.', 'fluency', 'advanced'),
('Sentence Reconstruction', 'Fix complex grammatical structures.', 'grammar', 'intermediate');
