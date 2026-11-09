-- ==============================================================================
-- V5__personalized_speech_drills.sql
-- Cadence Personalized Speech Runner Drills: Phrase Pool, User Plans & Items
-- DECISIONS.md D19 / D28 isolation boundary compliant
-- ==============================================================================

-- 1. DRILL PHRASES (Validated pre-built phrase pool for drills)
CREATE TABLE IF NOT EXISTS public.drill_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    onset TEXT NULL,
    bucket TEXT NULL,
    level SMALLINT NOT NULL CHECK (level IN (1, 2, 3)),
    phrase_text TEXT NOT NULL,
    word_count INT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('curated', 'llm_pool')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_drill_phrases_onset_or_bucket CHECK (onset IS NOT NULL OR bucket IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_drill_phrases_lower_phrase_text
    ON public.drill_phrases (lower(phrase_text));

CREATE INDEX IF NOT EXISTS idx_drill_phrases_onset
    ON public.drill_phrases (onset) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_drill_phrases_bucket
    ON public.drill_phrases (bucket) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_drill_phrases_level
    ON public.drill_phrases (level);

-- Seed drill_phrases with the 10 curated phrases from src/data/drillContent.ts VERBATIM
INSERT INTO public.drill_phrases (onset, bucket, level, phrase_text, word_count, source, active)
VALUES
    -- th_sound (Level 2 curated)
    (NULL, 'th_sound', 2, 'Three thin thieves thought through thirty things', 7, 'curated', true),
    (NULL, 'th_sound', 2, 'I think that the third author wrote with great depth', 10, 'curated', true),
    (NULL, 'th_sound', 2, 'They thought they could thrive through the thermal weather', 9, 'curated', true),
    (NULL, 'th_sound', 2, 'The author thanked his mother and brother with warmth', 9, 'curated', true),
    (NULL, 'th_sound', 2, 'Thirty thousand thoughtful thinkers walked the path together', 8, 'curated', true),
    -- v_w_mix (Level 2 curated)
    (NULL, 'v_w_mix', 2, 'Victor viewed very warm winter waves with wonder', 8, 'curated', true),
    (NULL, 'v_w_mix', 2, 'We visited the vast valley with vital water', 8, 'curated', true),
    (NULL, 'v_w_mix', 2, 'The wise wizard washed the vintage velvet vest', 8, 'curated', true),
    (NULL, 'v_w_mix', 2, 'Vivid voices whispered welcome across the western valley', 8, 'curated', true),
    (NULL, 'v_w_mix', 2, 'Every traveler will value fresh white wine and warm water', 10, 'curated', true)
ON CONFLICT (lower(phrase_text)) DO NOTHING;


-- 2. USER DRILL PLANS (One plan per user, locked at first generation)
CREATE TABLE IF NOT EXISTS public.user_drill_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    source_report_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    generation_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Architectural Comment on source_report_id:
COMMENT ON COLUMN public.user_drill_plans.source_report_id IS
'UUID reference to assessment_reports.id. No foreign key constraint is declared per DECISIONS.md D19 / D28 isolation boundary to guarantee zero cross-service schema coupling between the assessment reporting pipeline and content/practice services.';

-- idx_user_drill_plans_user_id REMOVED: the UNIQUE constraint on user_id already creates an implicit index;
-- a separate CREATE UNIQUE INDEX would be redundant and waste storage.


-- 3. USER DRILL PLAN ITEMS (Ordered drill items for a personalized plan)
CREATE TABLE IF NOT EXISTS public.user_drill_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.user_drill_plans(id) ON DELETE CASCADE,
    position INT NOT NULL,
    level SMALLINT NOT NULL CHECK (level IN (1, 2, 3)),
    target_kind TEXT NOT NULL CHECK (target_kind IN ('onset', 'bucket')),
    target_value TEXT NOT NULL,
    trigger_word TEXT NULL,
    phrase_text TEXT NOT NULL,
    phrase_source TEXT NOT NULL CHECK (phrase_source IN ('carrier', 'pool', 'curated')),
    completed_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_user_drill_plan_items_plan_pos UNIQUE (plan_id, position)
);

CREATE INDEX IF NOT EXISTS idx_user_drill_plan_items_plan_id
    ON public.user_drill_plan_items (plan_id, position);


-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.drill_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drill_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_drill_plan_items ENABLE ROW LEVEL SECURITY;

-- drill_phrases: readable by anon/authenticated (public phrase pool); writes service_role only (D28)
GRANT SELECT ON TABLE public.drill_phrases TO anon, authenticated;
GRANT ALL ON TABLE public.drill_phrases TO service_role;
-- user_drill_plans, user_drill_plan_items: service_role writes only; anon has no access (D28)
GRANT SELECT ON TABLE public.user_drill_plans TO authenticated;
GRANT ALL ON TABLE public.user_drill_plans TO service_role;
GRANT SELECT ON TABLE public.user_drill_plan_items TO authenticated;
GRANT ALL ON TABLE public.user_drill_plan_items TO service_role;

-- Public/authenticated can view active drill phrases
CREATE POLICY "Public can view active drill phrases"
    ON public.drill_phrases FOR SELECT
    USING (active = true);

-- Users can view only their own drill plans
CREATE POLICY "Users can view own drill plans"
    ON public.user_drill_plans FOR SELECT
    USING (user_id = auth.uid());

-- Users can view items belonging to their own plans
CREATE POLICY "Users can view own drill plan items"
    ON public.user_drill_plan_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.user_drill_plans p
        WHERE p.id = user_drill_plan_items.plan_id
          AND p.user_id = auth.uid()
    ));

-- Users can update completion on their own drill plan items
-- REMOVED per D28: writes service-role only; completion is managed by content-service backend, not direct client RLS writes


-- 5. RETIRE V4 DUMMY/STATIC SEED COURSES (set published = false)
-- Soft-retire the 4 static seed courses from Flyway V4 so they are hidden from course catalog
UPDATE public.courses
SET published = false, updated_at = NOW()
WHERE slug IN (
    'mastering-conversational-fluency',
    'pronunciation-and-articulation-mastery',
    'workplace-communication-and-executive-presence',
    'executive-rhetoric-and-persuasion-draft'
);

