CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- references profiles/users auth
    topic TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    duration NUMERIC(6,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Create Analysis Results Table to Persist AMCAT Metrics
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    overall_score NUMERIC(5, 2) NOT NULL,
    cefr_level VARCHAR(10) NOT NULL,
    transcription TEXT,
    breakdown JSONB NOT NULL,
    amcat_metrics JSONB NOT NULL,
    amcat_insights JSONB NOT NULL,
    amcat_mti_deep_dive JSONB NOT NULL,
    amcat_transcript JSONB NOT NULL,
    amcat_error_log JSONB NOT NULL,
    amcat_sentences JSONB NOT NULL,
    stutter_analysis JSONB,
    mti_deep JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. Create Assessment Materials Table for Dynamic content
CREATE TABLE IF NOT EXISTS assessment_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    generated_prompt TEXT NOT NULL,
    reading_passage TEXT NOT NULL,
    articulation_exercises JSONB NOT NULL DEFAULT '[]',
    vocabulary_challenge JSONB NOT NULL DEFAULT '[]',
    follow_up_questions JSONB NOT NULL DEFAULT '[]',
    gemini_model_used TEXT,
    generation_tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 4. Create AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('groq', 'gemini', 'whisper')),
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_usd NUMERIC(10, 6),
    purpose TEXT, -- 'transcription' | 'analysis' | 'content_generation' | 'feedback'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 5. Create Content Quality Scores Table
CREATE TABLE IF NOT EXISTS content_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    topic_relevance_score NUMERIC(5,2),
    idea_organization_score NUMERIC(5,2),
    argument_strength_score NUMERIC(5,2),
    communication_effectiveness_score NUMERIC(5,2),
    content_completeness_score NUMERIC(5,2),
    overall_content_score NUMERIC(5,2),
    groq_raw_output JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index optimization for foreign keys
CREATE INDEX IF NOT EXISTS idx_analysis_results_assessment ON analysis_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_materials_assessment ON assessment_materials(assessment_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_assessment ON content_quality_scores(assessment_id);
