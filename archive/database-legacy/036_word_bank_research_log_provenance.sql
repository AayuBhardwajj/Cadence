-- Migration 036: Add grounded_attempt column to word_bank_research_log
-- Provides unambiguous provenance for word bank research audit entries.
-- source_urls TEXT[] being empty is not sufficient alone: a grounded Gemini call
-- can return no source URLs even on success, making empty source_urls ambiguous
-- between "was ungrounded" and "was grounded but Gemini returned no citations".
-- grounded_attempt BOOLEAN is the definitive signal.
--
-- Default TRUE: any pre-existing rows (0 actual rows, since this migration runs
-- before the first successful live cycle) are marked as grounded-attempt.
-- run_research_cycle.py sets FALSE explicitly for fallback/ungrounded candidates.

ALTER TABLE public.word_bank_research_log
ADD COLUMN grounded_attempt BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.word_bank_research_log.grounded_attempt IS
    'TRUE if the LLM call used Google Search grounding (Gemini with tools=[GoogleSearch]). '
    'FALSE if grounding failed or was unavailable and the ungrounded fallback chain was used instead. '
    'When FALSE, source_urls will always be an empty array — never fabricated.';
