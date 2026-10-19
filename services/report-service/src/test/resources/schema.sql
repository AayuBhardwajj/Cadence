CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    failure_reason VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.assessment_reports (
    id UUID PRIMARY KEY,
    assessment_session_id UUID NOT NULL,
    transcription VARCHAR(2000),
    reference_passage_text VARCHAR(2000),
    overall_score INT,
    pronunciation_score INT,
    fluency_score INT,
    clarity_score INT,
    grammar_score INT,
    vocabulary_score INT,
    confidence_score INT,
    cefr_level VARCHAR(50),
    wpm INT,
    filler_word_count INT,
    eye_contact_score INT,
    strengths VARCHAR(1000),
    weak_areas VARCHAR(1000),
    focus_areas VARCHAR(1000),
    feedback VARCHAR(2000),
    amcat_metrics VARCHAR(2000),
    amcat_insights VARCHAR(2000),
    amcat_error_log VARCHAR(2000),
    amcat_sentences VARCHAR(2000),
    amcat_mti_deep_dive VARCHAR(2000),
    amcat_summary VARCHAR(2000),
    improvement_plan VARCHAR(2000),
    practice_exercises VARCHAR(2000),
    grammar_errors VARCHAR(2000),
    next_topic_suggestion VARCHAR(2000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
