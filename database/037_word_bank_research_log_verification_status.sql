-- Migration 037: Add 'rejected_verification' to word_bank_research_log.status CHECK constraint
-- per D22 two-stage architecture (Gemini generation + Groq reasoning verification).
-- Distinguishes candidates rejected during deterministic backend validation from
-- candidates that passed schema validation but were rejected by Groq reasoning verification.

ALTER TABLE public.word_bank_research_log
DROP CONSTRAINT IF EXISTS word_bank_research_log_status_check;

ALTER TABLE public.word_bank_research_log
ADD CONSTRAINT word_bank_research_log_status_check
CHECK (status IN (
    'inserted',
    'rejected_duplicate',
    'rejected_validation',
    'rejected_bad_bucket',
    'rejected_verification'
));

COMMENT ON CONSTRAINT word_bank_research_log_status_check ON public.word_bank_research_log IS
'Enforces valid audit status values: inserted, rejected_duplicate, rejected_validation, rejected_bad_bucket, and rejected_verification.';
