-- Migration 034: Add source column to word_bank and update get_random_words() filter
-- per DECISIONS.md D20

-- 1. Add source column with default 'manual_slp'
ALTER TABLE public.word_bank 
ADD COLUMN source TEXT NOT NULL DEFAULT 'manual_slp' CHECK (source IN ('manual_slp', 'llm_research'));

-- 2. Update get_random_words function filter condition to serve both SLP-verified and LLM-researched words
CREATE OR REPLACE FUNCTION get_random_words(
    p_difficulty TEXT,
    p_issue_type TEXT,
    p_topic TEXT,
    p_limit INTEGER
)
RETURNS SETOF public.word_bank AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
