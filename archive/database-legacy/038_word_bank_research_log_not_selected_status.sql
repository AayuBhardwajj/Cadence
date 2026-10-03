-- Migration 038: Add 'not_selected' to word_bank_research_log.status CHECK constraint
-- per D21 audit completeness guarantee ("every proposal gets an audit trail").
-- Records candidates that passed deterministic backend validation but were not
-- selected for Groq reasoning verification due to per-combo selection caps.

ALTER TABLE public.word_bank_research_log
DROP CONSTRAINT IF EXISTS word_bank_research_log_status_check;

ALTER TABLE public.word_bank_research_log
ADD CONSTRAINT word_bank_research_log_status_check
CHECK (status IN (
    'inserted',
    'rejected_duplicate',
    'rejected_validation',
    'rejected_bad_bucket',
    'rejected_verification',
    'not_selected'
));

COMMENT ON CONSTRAINT word_bank_research_log_status_check ON public.word_bank_research_log IS
'Enforces valid audit status values: inserted, rejected_duplicate, rejected_validation, rejected_bad_bucket, rejected_verification, and not_selected.';
