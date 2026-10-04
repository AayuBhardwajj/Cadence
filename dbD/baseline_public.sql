--
-- PostgreSQL database dump
--

\restrict wFIOldSjRnCxguxh2Y1kr8aPR9eSJ9VoD8o3kdEV3QO0r2qf7IjaheT5olFp2sT

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: check_assessment_eligibility(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_assessment_eligibility(user_uuid uuid) RETURNS TABLE(can_assess boolean, next_available_at timestamp with time zone, assessments_remaining integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: passage_pool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.passage_pool (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    passage_id uuid NOT NULL,
    topic character varying(100) NOT NULL,
    difficulty character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    served_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT passage_pool_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[]))),
    CONSTRAINT passage_pool_status_check CHECK (((status)::text = ANY ((ARRAY['available'::character varying, 'served'::character varying])::text[])))
);


--
-- Name: claim_pooled_passage(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_pooled_passage(p_topic character varying, p_difficulty character varying) RETURNS SETOF public.passage_pool
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: enforce_follow_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_follow_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.following_id
        AND visibility = 'private'
    ) THEN
        NEW.status := 'pending';
    ELSE
        NEW.status := 'accepted';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: word_bank; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.word_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    word_code text NOT NULL,
    word text NOT NULL,
    issue_type text DEFAULT 'mti'::text NOT NULL,
    bucket text NOT NULL,
    bucket_2 text,
    why text NOT NULL,
    difficulty text NOT NULL,
    syllables integer,
    topic_fit text,
    verified_by_slp text DEFAULT 'not_yet'::text NOT NULL,
    notes text,
    frequency_band text,
    source_citation text,
    l1_relevance text[] DEFAULT '{}'::text[],
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source text DEFAULT 'manual_slp'::text NOT NULL,
    CONSTRAINT word_bank_bucket_2_check CHECK (((bucket_2 IS NULL) OR (bucket_2 = ANY (ARRAY['extra_sound'::text, 'v_w_mix'::text, 'looks_different'::text, 'wrong_stress'::text, 'th_sound'::text, 'vowel_shift'::text, 'retroflex_td'::text, 'syllabic_schwa'::text, 'dropped_sounds'::text, 'ending_markers'::text, 'initial_consonant'::text, 'long_word'::text, 'content_word_stressed'::text, 'sentence_initial_position'::text, 'low_frequency_word'::text])))),
    CONSTRAINT word_bank_bucket_check CHECK ((bucket = ANY (ARRAY['extra_sound'::text, 'v_w_mix'::text, 'looks_different'::text, 'wrong_stress'::text, 'th_sound'::text, 'vowel_shift'::text, 'retroflex_td'::text, 'syllabic_schwa'::text, 'dropped_sounds'::text, 'ending_markers'::text, 'initial_consonant'::text, 'long_word'::text, 'content_word_stressed'::text, 'sentence_initial_position'::text, 'low_frequency_word'::text]))),
    CONSTRAINT word_bank_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT word_bank_issue_type_check CHECK ((issue_type = ANY (ARRAY['mti'::text, 'stutter_trigger'::text]))),
    CONSTRAINT word_bank_source_check CHECK ((source = ANY (ARRAY['manual_slp'::text, 'llm_research'::text]))),
    CONSTRAINT word_bank_verified_by_slp_check CHECK ((verified_by_slp = ANY (ARRAY['not_yet'::text, 'yes'::text, 'no'::text])))
);


--
-- Name: get_random_words(text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_random_words(p_difficulty text, p_issue_type text, p_topic text, p_limit integer) RETURNS SETOF public.word_bank
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
IF p_difficulty IS NOT NULL AND p_difficulty <> '' AND p_difficulty <> 'all' THEN
RETURN QUERY
SELECT *
FROM public.word_bank wb
WHERE wb.active = TRUE
AND (wb.verified_by_slp = 'yes' OR wb.source = 'llm_research')
AND wb.difficulty = p_difficulty
AND (p_issue_type IS NULL OR p_issue_type = '' OR wb.issue_type = p_issue_type)
AND (p_topic IS NULL OR p_topic = '' OR wb.topic_fit = p_topic)
ORDER BY random()
LIMIT p_limit;
ELSE
RETURN QUERY
WITH ranked_words AS (
SELECT wb.*,
row_number() OVER (PARTITION BY wb.difficulty ORDER BY random()) as rn
FROM public.word_bank wb
WHERE wb.active = TRUE
AND (wb.verified_by_slp = 'yes' OR wb.source = 'llm_research')
AND (p_issue_type IS NULL OR p_issue_type = '' OR wb.issue_type = p_issue_type)
AND (p_topic IS NULL OR p_topic = '' OR wb.topic_fit = p_topic)
        )
SELECT rw.id, rw.word_code, rw.word, rw.issue_type, rw.bucket, rw.bucket_2, rw.why, rw.difficulty, rw.syllables, rw.topic_fit, rw.verified_by_slp, rw.notes, rw.frequency_band, rw.source_citation, rw.l1_relevance, rw.active, rw.created_at, rw.updated_at, rw.source
FROM ranked_words rw
ORDER BY rw.rn, random()
LIMIT p_limit;
END IF;
END;
$$;


--
-- Name: handle_assessment_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_assessment_completion() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name, username)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$;


--
-- Name: handle_security_log_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_security_log_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: set_word_bank_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_word_bank_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: try_refill_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.try_refill_lock() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: try_word_bank_research_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.try_word_bank_research_lock() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: unlock_refill(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_refill() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.refill_lock
    SET is_locked = FALSE,
        locked_at = NULL
    WHERE lock_key = 192837465;
    
    RETURN TRUE;
END;
$$;


--
-- Name: unlock_word_bank_research(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.unlock_word_bank_research() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
UPDATE public.word_bank_research_lock
SET is_locked = FALSE,
        locked_at = NULL
WHERE lock_key = 192837466;
RETURN TRUE;
END;
$$;


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    assessment_id uuid,
    provider text NOT NULL,
    model text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    estimated_cost_usd numeric(10,6),
    purpose text,
    created_at timestamp with time zone DEFAULT now(),
    chain character varying(50),
    CONSTRAINT ai_usage_logs_provider_check CHECK ((provider = ANY (ARRAY['groq'::text, 'gemini'::text, 'whisper'::text])))
);


--
-- Name: analysis_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid,
    overall_score numeric(5,2) NOT NULL,
    cefr_level character varying(10) NOT NULL,
    transcription text,
    breakdown jsonb NOT NULL,
    amcat_metrics jsonb NOT NULL,
    amcat_insights jsonb NOT NULL,
    amcat_mti_deep_dive jsonb NOT NULL,
    amcat_transcript jsonb NOT NULL,
    amcat_error_log jsonb NOT NULL,
    amcat_sentences jsonb NOT NULL,
    stutter_analysis jsonb,
    mti_deep jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: assessment_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid,
    topic text NOT NULL,
    difficulty text NOT NULL,
    generated_prompt text NOT NULL,
    reading_passage text NOT NULL,
    articulation_exercises jsonb DEFAULT '[]'::jsonb NOT NULL,
    vocabulary_challenge jsonb DEFAULT '[]'::jsonb NOT NULL,
    follow_up_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    gemini_model_used text,
    generation_tokens_used integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assessment_materials_difficulty_check CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])))
);


--
-- Name: assessment_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_session_id uuid NOT NULL,
    transcription text,
    overall_score integer,
    pronunciation_score integer,
    fluency_score integer,
    clarity_score integer,
    grammar_score integer,
    vocabulary_score integer,
    confidence_score integer,
    cefr_level text,
    wpm integer,
    filler_word_count integer,
    eye_contact_score integer,
    strengths text[],
    focus_areas text[],
    feedback text,
    weak_areas jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    amcat_metrics jsonb,
    amcat_insights jsonb,
    amcat_error_log jsonb,
    amcat_sentences jsonb,
    amcat_mti_deep_dive jsonb,
    amcat_summary jsonb,
    improvement_plan jsonb,
    practice_exercises jsonb,
    grammar_errors jsonb,
    next_topic_suggestion text,
    reference_passage_text text
);


--
-- Name: TABLE assessment_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assessment_reports IS 'Analysis output table owned by report-service. See DECISIONS.md D6. Additive split from legacy public.assessments — assessments remains authoritative until a future cutover. A session may have zero report rows (still processing / failed).';


--
-- Name: assessment_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessment_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    duration_seconds integer,
    video_url text,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    passage_id uuid,
    audio_storage_path text,
    CONSTRAINT assessment_sessions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'uploading'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE assessment_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assessment_sessions IS 'Session lifecycle/status table owned by session-service. See DECISIONS.md D6. Additive split from legacy public.assessments — assessments remains authoritative until a future cutover.';


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    overall_score integer,
    wpm integer,
    eye_contact_score integer,
    filler_word_count integer,
    feedback text,
    transcription text,
    video_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: bucket_l1_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bucket_l1_mapping (
    bucket text NOT NULL,
    region_weights jsonb NOT NULL,
    source_notes text NOT NULL,
    reviewed_by_slp boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bucket_l1_mapping_bucket_check CHECK ((bucket = ANY (ARRAY['dropped_sounds'::text, 'ending_markers'::text, 'extra_sound'::text, 'looks_different'::text, 'retroflex_td'::text, 'syllabic_schwa'::text, 'th_sound'::text, 'v_w_mix'::text, 'vowel_shift'::text, 'wrong_stress'::text])))
);


--
-- Name: TABLE bucket_l1_mapping; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bucket_l1_mapping IS 'Maps word_bank phonological bucket values to region-weight vectors for MTI region-attribution (D22). Only the ten buckets with plausible L1 signal are included; five structural/lexical buckets are excluded by design.';


--
-- Name: COLUMN bucket_l1_mapping.region_weights; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bucket_l1_mapping.region_weights IS 'JSONB object: {region_key: weight_0_to_1}. Weights are advisory probabilities that a word from this bucket is discriminative for the named region; not normalised to sum to 1 (a bucket may load onto multiple regions independently).';


--
-- Name: COLUMN bucket_l1_mapping.source_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bucket_l1_mapping.source_notes IS 'SLP/literature rationale for the weight values. Required (NOT NULL). Must document basis and any known confounds. Rows with reviewed_by_slp=FALSE are first-pass drafts and must not be used in production scoring without review.';


--
-- Name: COLUMN bucket_l1_mapping.reviewed_by_slp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bucket_l1_mapping.reviewed_by_slp IS 'FALSE on all seed rows. Must be set to TRUE by an SLP before a bucket''s weights are used in live region-attribution scoring (D22 gate).';


--
-- Name: chat_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid,
    mentioned_user_id uuid,
    mentioner_id uuid,
    room_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_avatar text,
    content text,
    message_type character varying(20) DEFAULT 'text'::character varying,
    media_url text,
    reply_to_id uuid,
    reply_preview text,
    is_whisper boolean DEFAULT false,
    whisper_to_id uuid,
    whisper_to_name text,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'gif'::character varying, 'voice'::character varying])::text[]))),
    CONSTRAINT whisper_needs_target CHECK (((NOT is_whisper) OR (whisper_to_id IS NOT NULL)))
);


--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(60) NOT NULL,
    description text,
    created_by uuid,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: content_quality_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_quality_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assessment_id uuid,
    topic_relevance_score numeric(5,2),
    idea_organization_score numeric(5,2),
    argument_strength_score numeric(5,2),
    communication_effectiveness_score numeric(5,2),
    content_completeness_score numeric(5,2),
    overall_content_score numeric(5,2),
    groq_raw_output jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: daily_tips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_tips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tip_date date NOT NULL,
    tip_text text NOT NULL,
    is_personalized boolean DEFAULT false NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dm_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    participant_a uuid NOT NULL,
    participant_b uuid NOT NULL,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT no_self_dm CHECK ((participant_a <> participant_b))
);


--
-- Name: dm_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dm_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_avatar text,
    content text,
    message_type character varying(20) DEFAULT 'text'::character varying,
    media_url text,
    reply_to_id uuid,
    reply_preview text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dm_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'gif'::character varying, 'voice'::character varying])::text[])))
);


--
-- Name: drill_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drill_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    practice_session_id uuid NOT NULL,
    target_text text NOT NULL,
    transcribed_text text,
    is_match boolean NOT NULL,
    attempt_number integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exercise_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercise_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_version integer DEFAULT 1,
    template_id uuid,
    personalization_context jsonb DEFAULT '{}'::jsonb,
    priority_rank integer DEFAULT 1,
    is_active boolean DEFAULT true,
    status text DEFAULT 'not_started'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: exercise_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercise_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    skill_category text NOT NULL,
    difficulty_level text DEFAULT 'intermediate'::text,
    estimated_duration_minutes integer DEFAULT 5,
    template_structure jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text DEFAULT 'accepted'::text,
    CONSTRAINT follows_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text])))
);


--
-- Name: generated_passages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_passages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    passage_text text NOT NULL,
    difficulty character varying(50) NOT NULL,
    topic character varying(100),
    target_words jsonb DEFAULT '[]'::jsonb NOT NULL,
    word_count integer NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT generated_passages_difficulty_check CHECK (((difficulty)::text = ANY ((ARRAY['easy'::character varying, 'medium'::character varying, 'hard'::character varying])::text[])))
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT false,
    preferences jsonb DEFAULT '{"daily_reminder": true, "goal_milestones": true, "security_alerts": true}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    action_link text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['security'::text, 'learning'::text, 'social'::text])))
);


--
-- Name: practice_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.practice_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    bucket text NOT NULL,
    status text DEFAULT 'in_progress'::text,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT practice_sessions_status_check CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text,
    full_name text,
    avatar_url text,
    email text,
    age text,
    native_language text,
    primary_goal text,
    english_proficiency text,
    region text,
    phone_number text,
    referral_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    bio text,
    occupation text,
    current_goal text,
    banner_quote text,
    location_country text,
    timezone text DEFAULT 'GMT+5:30'::text,
    native_languages text[] DEFAULT '{}'::text[],
    learning_motivation text[] DEFAULT '{}'::text[],
    ai_summary text,
    visibility text DEFAULT 'public'::text,
    verified boolean DEFAULT false,
    linkedin_url text,
    twitter_url text,
    github_url text,
    instagram_url text,
    cover_url text,
    last_full_assessment_at timestamp with time zone,
    tier text DEFAULT 'FREE'::text NOT NULL,
    CONSTRAINT profiles_tier_check CHECK ((tier = ANY (ARRAY['FREE'::text, 'PRO'::text, 'PREMIUM'::text])))
);


--
-- Name: COLUMN profiles.tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.tier IS 'User subscription tier — FREE/PRO/PREMIUM. Added 2026-08-15 to replace a non-functional query in tip_router.py that referenced this column before it existed (see BUGS_AND_ISSUES.md). Read by content-service tip personalization going forward.';


--
-- Name: refill_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refill_lock (
    lock_key bigint NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    locked_at timestamp with time zone
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: speech_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speech_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_version integer DEFAULT 1,
    created_from_assessment_id uuid,
    weakness_priority_1 text,
    weakness_priority_2 text,
    weakness_priority_3 text,
    current_scores jsonb DEFAULT '{}'::jsonb,
    identified_issues jsonb DEFAULT '{}'::jsonb,
    learning_pace text DEFAULT 'moderate'::text,
    recommended_frequency_per_week integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now(),
    last_updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_exercise_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_exercise_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_id uuid,
    score integer,
    time_spent_seconds integer,
    errors_made jsonb DEFAULT '[]'::jsonb,
    completed_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id uuid NOT NULL,
    current_streak integer DEFAULT 0,
    longest_streak integer DEFAULT 0,
    total_sessions integer DEFAULT 0,
    last_activity_at timestamp with time zone,
    level text DEFAULT 'Beginner'::text,
    xp integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: word_bank_research_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.word_bank_research_lock (
    lock_key bigint NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    locked_at timestamp with time zone
);


--
-- Name: word_bank_research_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.word_bank_research_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    proposed_word text NOT NULL,
    word_code text,
    issue_type text,
    bucket text,
    bucket_2 text,
    topic_fit text,
    difficulty text,
    why text,
    source_urls text[],
    llm_raw_rationale text,
    status text NOT NULL,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    grounded_attempt boolean DEFAULT true NOT NULL,
    CONSTRAINT word_bank_research_log_status_check CHECK ((status = ANY (ARRAY['inserted'::text, 'rejected_duplicate'::text, 'rejected_validation'::text, 'rejected_bad_bucket'::text, 'rejected_verification'::text, 'not_selected'::text])))
);


--
-- Name: COLUMN word_bank_research_log.grounded_attempt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.word_bank_research_log.grounded_attempt IS 'TRUE if the LLM call used Google Search grounding (Gemini with tools=[GoogleSearch]). FALSE if grounding failed or was unavailable and the ungrounded fallback chain was used instead. When FALSE, source_urls will always be an empty array — never fabricated.';


--
-- Name: CONSTRAINT word_bank_research_log_status_check ON word_bank_research_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT word_bank_research_log_status_check ON public.word_bank_research_log IS 'Enforces valid audit status values: inserted, rejected_duplicate, rejected_validation, rejected_bad_bucket, rejected_verification, and not_selected.';


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: analysis_results analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (id);


--
-- Name: assessment_materials assessment_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_materials
    ADD CONSTRAINT assessment_materials_pkey PRIMARY KEY (id);


--
-- Name: assessment_reports assessment_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_reports
    ADD CONSTRAINT assessment_reports_pkey PRIMARY KEY (id);


--
-- Name: assessment_sessions assessment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sessions
    ADD CONSTRAINT assessment_sessions_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: bucket_l1_mapping bucket_l1_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bucket_l1_mapping
    ADD CONSTRAINT bucket_l1_mapping_pkey PRIMARY KEY (bucket);


--
-- Name: chat_mentions chat_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_slug_key UNIQUE (slug);


--
-- Name: content_quality_scores content_quality_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_quality_scores
    ADD CONSTRAINT content_quality_scores_pkey PRIMARY KEY (id);


--
-- Name: daily_tips daily_tips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tips
    ADD CONSTRAINT daily_tips_pkey PRIMARY KEY (id);


--
-- Name: daily_tips daily_tips_user_id_tip_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tips
    ADD CONSTRAINT daily_tips_user_id_tip_date_key UNIQUE (user_id, tip_date);


--
-- Name: dm_conversations dm_conversations_participant_a_participant_b_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_conversations
    ADD CONSTRAINT dm_conversations_participant_a_participant_b_key UNIQUE (participant_a, participant_b);


--
-- Name: dm_conversations dm_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_conversations
    ADD CONSTRAINT dm_conversations_pkey PRIMARY KEY (id);


--
-- Name: dm_messages dm_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_pkey PRIMARY KEY (id);


--
-- Name: drill_attempts drill_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drill_attempts
    ADD CONSTRAINT drill_attempts_pkey PRIMARY KEY (id);


--
-- Name: exercise_recommendations exercise_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_recommendations
    ADD CONSTRAINT exercise_recommendations_pkey PRIMARY KEY (id);


--
-- Name: exercise_templates exercise_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_templates
    ADD CONSTRAINT exercise_templates_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (follower_id, following_id);


--
-- Name: generated_passages generated_passages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_passages
    ADD CONSTRAINT generated_passages_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: passage_pool passage_pool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passage_pool
    ADD CONSTRAINT passage_pool_pkey PRIMARY KEY (id);


--
-- Name: practice_sessions practice_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: refill_lock refill_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refill_lock
    ADD CONSTRAINT refill_lock_pkey PRIMARY KEY (lock_key);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: speech_profiles speech_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speech_profiles
    ADD CONSTRAINT speech_profiles_pkey PRIMARY KEY (id);


--
-- Name: speech_profiles speech_profiles_user_id_profile_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speech_profiles
    ADD CONSTRAINT speech_profiles_user_id_profile_version_key UNIQUE (user_id, profile_version);


--
-- Name: user_exercise_history user_exercise_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_exercise_history
    ADD CONSTRAINT user_exercise_history_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: word_bank word_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_bank
    ADD CONSTRAINT word_bank_pkey PRIMARY KEY (id);


--
-- Name: word_bank_research_lock word_bank_research_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_bank_research_lock
    ADD CONSTRAINT word_bank_research_lock_pkey PRIMARY KEY (lock_key);


--
-- Name: word_bank_research_log word_bank_research_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_bank_research_log
    ADD CONSTRAINT word_bank_research_log_pkey PRIMARY KEY (id);


--
-- Name: word_bank word_bank_word_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.word_bank
    ADD CONSTRAINT word_bank_word_code_key UNIQUE (word_code);


--
-- Name: idx_analysis_results_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_results_assessment ON public.analysis_results USING btree (assessment_id);


--
-- Name: idx_assessment_materials_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_materials_assessment ON public.assessment_materials USING btree (assessment_id);


--
-- Name: idx_assessment_reports_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessment_reports_session_id ON public.assessment_reports USING btree (assessment_session_id);


--
-- Name: idx_chat_msg_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_room ON public.chat_messages USING btree (room_id, created_at DESC);


--
-- Name: idx_chat_msg_whisper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_msg_whisper ON public.chat_messages USING btree (sender_id, whisper_to_id) WHERE (is_whisper = true);


--
-- Name: idx_content_quality_assessment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_quality_assessment ON public.content_quality_scores USING btree (assessment_id);


--
-- Name: idx_daily_tips_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_tips_user_date ON public.daily_tips USING btree (user_id, tip_date DESC);


--
-- Name: idx_dm_messages_conv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dm_messages_conv ON public.dm_messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_drill_attempts_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drill_attempts_session_id ON public.drill_attempts USING btree (practice_session_id);


--
-- Name: idx_generated_passages_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generated_passages_difficulty ON public.generated_passages USING btree (difficulty);


--
-- Name: idx_passage_pool_combo_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_passage_pool_combo_status ON public.passage_pool USING btree (topic, difficulty, status);


--
-- Name: idx_practice_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_practice_sessions_user_id ON public.practice_sessions USING btree (user_id);


--
-- Name: idx_word_bank_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_active ON public.word_bank USING btree (active) WHERE (active = true);


--
-- Name: idx_word_bank_bucket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_bucket ON public.word_bank USING btree (bucket);


--
-- Name: idx_word_bank_difficulty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_difficulty ON public.word_bank USING btree (difficulty);


--
-- Name: idx_word_bank_issue_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_issue_type ON public.word_bank USING btree (issue_type);


--
-- Name: idx_word_bank_research_log_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_research_log_batch ON public.word_bank_research_log USING btree (batch_id);


--
-- Name: idx_word_bank_research_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_word_bank_research_log_status ON public.word_bank_research_log USING btree (status);


--
-- Name: follows enforce_follow_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_follow_status_trigger BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.enforce_follow_status();


--
-- Name: security_logs on_security_log_inserted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_security_log_inserted AFTER INSERT ON public.security_logs FOR EACH ROW EXECUTE FUNCTION public.handle_security_log_insert();


--
-- Name: word_bank word_bank_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER word_bank_updated_at BEFORE UPDATE ON public.word_bank FOR EACH ROW EXECUTE FUNCTION public.set_word_bank_updated_at();


--
-- Name: ai_usage_logs ai_usage_logs_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;


--
-- Name: analysis_results analysis_results_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_materials assessment_materials_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_materials
    ADD CONSTRAINT assessment_materials_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: assessment_reports assessment_reports_assessment_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_reports
    ADD CONSTRAINT assessment_reports_assessment_session_id_fkey FOREIGN KEY (assessment_session_id) REFERENCES public.assessment_sessions(id) ON DELETE CASCADE;


--
-- Name: assessment_sessions assessment_sessions_passage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sessions
    ADD CONSTRAINT assessment_sessions_passage_id_fkey FOREIGN KEY (passage_id) REFERENCES public.generated_passages(id) ON DELETE SET NULL;


--
-- Name: assessment_sessions assessment_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessment_sessions
    ADD CONSTRAINT assessment_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: chat_mentions chat_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_mentions chat_mentions_mentioner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_mentioner_id_fkey FOREIGN KEY (mentioner_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_mentions chat_mentions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: chat_mentions chat_mentions_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_mentions
    ADD CONSTRAINT chat_mentions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_whisper_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_whisper_to_id_fkey FOREIGN KEY (whisper_to_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_rooms chat_rooms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: content_quality_scores content_quality_scores_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_quality_scores
    ADD CONSTRAINT content_quality_scores_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: daily_tips daily_tips_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_tips
    ADD CONSTRAINT daily_tips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dm_conversations dm_conversations_participant_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_conversations
    ADD CONSTRAINT dm_conversations_participant_a_fkey FOREIGN KEY (participant_a) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dm_conversations dm_conversations_participant_b_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_conversations
    ADD CONSTRAINT dm_conversations_participant_b_fkey FOREIGN KEY (participant_b) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: dm_messages dm_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.dm_conversations(id) ON DELETE CASCADE;


--
-- Name: dm_messages dm_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.dm_messages(id) ON DELETE SET NULL;


--
-- Name: dm_messages dm_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dm_messages
    ADD CONSTRAINT dm_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: drill_attempts drill_attempts_practice_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drill_attempts
    ADD CONSTRAINT drill_attempts_practice_session_id_fkey FOREIGN KEY (practice_session_id) REFERENCES public.practice_sessions(id) ON DELETE CASCADE;


--
-- Name: exercise_recommendations exercise_recommendations_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_recommendations
    ADD CONSTRAINT exercise_recommendations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.exercise_templates(id);


--
-- Name: exercise_recommendations exercise_recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercise_recommendations
    ADD CONSTRAINT exercise_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: passage_pool passage_pool_passage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.passage_pool
    ADD CONSTRAINT passage_pool_passage_id_fkey FOREIGN KEY (passage_id) REFERENCES public.generated_passages(id) ON DELETE CASCADE;


--
-- Name: practice_sessions practice_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.practice_sessions
    ADD CONSTRAINT practice_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: security_logs security_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: speech_profiles speech_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speech_profiles
    ADD CONSTRAINT speech_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_exercise_history user_exercise_history_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_exercise_history
    ADD CONSTRAINT user_exercise_history_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.exercise_recommendations(id);


--
-- Name: user_exercise_history user_exercise_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_exercise_history
    ADD CONSTRAINT user_exercise_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: word_bank Anyone can view active word bank entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active word bank entries" ON public.word_bank FOR SELECT USING ((active = true));


--
-- Name: follows Follows are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);


--
-- Name: profiles Public profiles are viewable by everyone.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);


--
-- Name: daily_tips Service role can upsert tips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can upsert tips" ON public.daily_tips USING (true) WITH CHECK (true);


--
-- Name: practice_sessions Users can create own practice sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own practice sessions" ON public.practice_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: follows Users can follow others; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK ((auth.uid() = follower_id));


--
-- Name: assessment_reports Users can insert own assessment reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own assessment reports" ON public.assessment_reports FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.assessment_sessions s
  WHERE ((s.id = assessment_reports.assessment_session_id) AND (s.user_id = auth.uid())))));


--
-- Name: assessment_sessions Users can insert own assessment sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own assessment sessions" ON public.assessment_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: assessments Users can insert own assessments.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own assessments." ON public.assessments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: drill_attempts Users can insert own drill attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own drill attempts" ON public.drill_attempts FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.practice_sessions ps
  WHERE ((ps.id = drill_attempts.practice_session_id) AND (ps.user_id = auth.uid())))));


--
-- Name: security_logs Users can insert own security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own security logs" ON public.security_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: assessments Users can insert their own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own assessments" ON public.assessments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: security_logs Users can insert their own security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own security logs" ON public.security_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: follows Users can unfollow; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING ((auth.uid() = follower_id));


--
-- Name: follows Users can update follow status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update follow status" ON public.follows FOR UPDATE USING (((auth.uid() = follower_id) OR (auth.uid() = following_id))) WITH CHECK (((auth.uid() = follower_id) OR (auth.uid() = following_id)));


--
-- Name: practice_sessions Users can update own practice sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own practice sessions" ON public.practice_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.notification_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: generated_passages Users can view generated passages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view generated passages" ON public.generated_passages FOR SELECT USING (true);


--
-- Name: assessment_reports Users can view own assessment reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assessment reports" ON public.assessment_reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.assessment_sessions s
  WHERE ((s.id = assessment_reports.assessment_session_id) AND (s.user_id = auth.uid())))));


--
-- Name: assessment_sessions Users can view own assessment sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assessment sessions" ON public.assessment_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assessments Users can view own assessments.; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assessments." ON public.assessments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: drill_attempts Users can view own drill attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own drill attempts" ON public.drill_attempts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.practice_sessions ps
  WHERE ((ps.id = drill_attempts.practice_session_id) AND (ps.user_id = auth.uid())))));


--
-- Name: practice_sessions Users can view own practice sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own practice sessions" ON public.practice_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: security_logs Users can view own security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own security logs" ON public.security_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exercise_templates Users can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view templates" ON public.exercise_templates FOR SELECT USING (true);


--
-- Name: assessments Users can view their own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own assessments" ON public.assessments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_exercise_history Users can view their own history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own history" ON public.user_exercise_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: exercise_recommendations Users can view their own recommendations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recommendations" ON public.exercise_recommendations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: security_logs Users can view their own security logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own security logs" ON public.security_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: speech_profiles Users can view their own speech profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own speech profile" ON public.speech_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_stats Users can view their own stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: daily_tips Users read own tips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own tips" ON public.daily_tips FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: assessment_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: bucket_l1_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bucket_l1_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: bucket_l1_mapping bucket_l1_mapping_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bucket_l1_mapping_select_all ON public.bucket_l1_mapping FOR SELECT USING (true);


--
-- Name: chat_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: content_quality_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_quality_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_tips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_conversations dm_conv_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_conv_insert ON public.dm_conversations FOR INSERT WITH CHECK (((auth.uid() = participant_a) OR (auth.uid() = participant_b)));


--
-- Name: dm_conversations dm_conv_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_conv_select ON public.dm_conversations FOR SELECT USING (((auth.uid() = participant_a) OR (auth.uid() = participant_b)));


--
-- Name: dm_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: dm_messages dm_msg_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_msg_insert ON public.dm_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.dm_conversations c
  WHERE ((c.id = dm_messages.conversation_id) AND ((c.participant_a = auth.uid()) OR (c.participant_b = auth.uid())))))));


--
-- Name: dm_messages dm_msg_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dm_msg_select ON public.dm_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.dm_conversations c
  WHERE ((c.id = dm_messages.conversation_id) AND ((c.participant_a = auth.uid()) OR (c.participant_b = auth.uid()))))));


--
-- Name: drill_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drill_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exercise_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: exercise_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exercise_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- Name: generated_passages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generated_passages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_mentions mentions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mentions_insert ON public.chat_mentions FOR INSERT WITH CHECK ((auth.uid() = mentioner_id));


--
-- Name: chat_mentions mentions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mentions_select ON public.chat_mentions FOR SELECT USING (((auth.uid() = mentioned_user_id) OR (auth.uid() = mentioner_id)));


--
-- Name: chat_mentions mentions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mentions_update ON public.chat_mentions FOR UPDATE USING ((auth.uid() = mentioned_user_id));


--
-- Name: chat_messages messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_insert ON public.chat_messages FOR INSERT WITH CHECK ((auth.uid() = sender_id));


--
-- Name: chat_messages messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select ON public.chat_messages FOR SELECT USING (((auth.uid() IS NOT NULL) AND ((is_whisper = false) OR (sender_id = auth.uid()) OR (whisper_to_id = auth.uid()))));


--
-- Name: chat_messages messages_soft_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_soft_delete ON public.chat_messages FOR UPDATE USING ((auth.uid() = sender_id));


--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: passage_pool; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.passage_pool ENABLE ROW LEVEL SECURITY;

--
-- Name: practice_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: refill_lock; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refill_lock ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms rooms_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_insert ON public.chat_rooms FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: chat_rooms rooms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rooms_select ON public.chat_rooms FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: security_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: speech_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speech_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_exercise_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_exercise_history ENABLE ROW LEVEL SECURITY;

--
-- Name: user_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: word_bank; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.word_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: word_bank_research_lock; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.word_bank_research_lock ENABLE ROW LEVEL SECURITY;

--
-- Name: word_bank_research_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.word_bank_research_log ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict wFIOldSjRnCxguxh2Y1kr8aPR9eSJ9VoD8o3kdEV3QO0r2qf7IjaheT5olFp2sT

