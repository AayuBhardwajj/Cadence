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
