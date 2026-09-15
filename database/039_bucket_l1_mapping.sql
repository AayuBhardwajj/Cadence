-- Migration 039: bucket_l1_mapping
-- Phase 1 of MTI region-attribution feature (D23).
-- Additive migration — no changes to existing tables or data.
--
-- Purpose: stores the mapping from word_bank.bucket values to region-weight
-- vectors used by the ml-analysis MTI attribution layer (Phase 2+).
-- Ten of the fifteen word_bank buckets have regional-specificity signal;
-- the five buckets that are purely structural/lexical and carry no L1 signal
-- (initial_consonant, long_word, content_word_stressed, sentence_initial_position,
-- low_frequency_word) are intentionally excluded from this table's CHECK constraint
-- and from the seed data.
--
-- Region keys (JSONB keys in region_weights):
--   hindi_belt             — Hindi/Urdu/Bhojpuri/Bihari belt (North/Central India)
--   bengali_odia_belt      — Bengali, Odia, Assamese (East India)
--   dravidian_belt         — Tamil, Telugu, Kannada, Malayalam (South India)
--   punjabi                — Punjabi/Haryanvi (North-West India)
--   generic_indian_english — pan-Indian feature; low regional discrimination
--
-- All seed rows are first-pass drafts: reviewed_by_slp = FALSE.
-- SLP review gate before production use is a tracked requirement in D23.

CREATE TABLE IF NOT EXISTS public.bucket_l1_mapping (
  bucket TEXT PRIMARY KEY
    CHECK (bucket IN (
      'dropped_sounds','ending_markers','extra_sound','looks_different',
      'retroflex_td','syllabic_schwa','th_sound','v_w_mix','vowel_shift','wrong_stress'
    )),
  region_weights  JSONB        NOT NULL,
  source_notes    TEXT         NOT NULL,   -- rationale / literature reference
  reviewed_by_slp BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bucket_l1_mapping IS
  'Maps word_bank phonological bucket values to region-weight vectors for MTI '
  'region-attribution (D23). Only the ten buckets with plausible L1 signal are '
  'included; five structural/lexical buckets are excluded by design.';

COMMENT ON COLUMN public.bucket_l1_mapping.region_weights IS
  'JSONB object: {region_key: weight_0_to_1}. Weights are advisory probabilities '
  'that a word from this bucket is discriminative for the named region; not '
  'normalised to sum to 1 (a bucket may load onto multiple regions independently).';

COMMENT ON COLUMN public.bucket_l1_mapping.source_notes IS
  'SLP/literature rationale for the weight values. Required (NOT NULL). '
  'Must document basis and any known confounds. Rows with reviewed_by_slp=FALSE '
  'are first-pass drafts and must not be used in production scoring without review.';

COMMENT ON COLUMN public.bucket_l1_mapping.reviewed_by_slp IS
  'FALSE on all seed rows. Must be set to TRUE by an SLP before a bucket''s '
  'weights are used in live region-attribution scoring (D23 gate).';

-- RLS: public read, service-role-only write (matches word_bank_research_lock pattern).
ALTER TABLE public.bucket_l1_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bucket_l1_mapping_select_all"
  ON public.bucket_l1_mapping
  FOR SELECT
  USING (true);

-- No public INSERT / UPDATE / DELETE policy.
-- Writes require the Supabase service role key (bypasses RLS).

-- ───────────────────────────────────────────────────────────────────────────
-- SEED DATA — FIRST-PASS DRAFT. reviewed_by_slp = FALSE on every row.
-- Region keys: hindi_belt, bengali_odia_belt, dravidian_belt, punjabi,
--              generic_indian_english
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO public.bucket_l1_mapping
  (bucket, region_weights, source_notes)
VALUES
  (
    'v_w_mix',
    '{"bengali_odia_belt":0.7,"hindi_belt":0.4}',
    'v/w merger most consistently attributed to Bengali/Odia/Assamese L1 phonology; '
    'secondary association with Bhojpuri/Bihari speakers. Most discriminative bucket '
    'in the set. UNREVIEWED.'
  ),
  (
    'vowel_shift',
    '{"dravidian_belt":0.5,"hindi_belt":0.4,"generic_indian_english":0.3}',
    'Bucket conflates two distinct patterns: word-initial epenthesis before consonant '
    'clusters (school->iskool, more Dravidian/Hindi-belt) and general vowel quality '
    'shift (pan-Indian). Treated as moderate discriminator pending split. UNREVIEWED.'
  ),
  (
    'retroflex_td',
    '{"generic_indian_english":0.7,"hindi_belt":0.3,"dravidian_belt":0.3}',
    'Retroflex consonants are NATIVE phonemes across nearly all major Indian language '
    'families (Indo-Aryan and Dravidian) - substitution for English alveolar stops is '
    'closer to pan-Indian-English than regionally discriminative. Low specificity '
    'intentional. UNREVIEWED.'
  ),
  (
    'th_sound',
    '{"generic_indian_english":0.8}',
    'Dental-fricative-to-stop substitution is near-universal across Indian English '
    'regardless of L1. Not regionally discriminative - included for MTI-presence '
    'signal only, excluded from region attribution weighting. UNREVIEWED.'
  ),
  (
    'wrong_stress',
    '{"generic_indian_english":0.7}',
    'Syllable-timed vs stress-timed rhythm is a pan-Indian English feature, not '
    'regionally discriminative on its own. UNREVIEWED.'
  ),
  (
    'syllabic_schwa',
    '{"generic_indian_english":0.7}',
    'Schwa deletion/insertion pattern, pan-Indian rhythmic feature. UNREVIEWED.'
  ),
  (
    'dropped_sounds',
    '{"dravidian_belt":0.4,"bengali_odia_belt":0.3,"generic_indian_english":0.3}',
    'Consonant cluster simplification - variably associated with Dravidian and '
    'Bengali/Odia cluster-breaking patterns. Weak discriminator. UNREVIEWED.'
  ),
  (
    'extra_sound',
    '{"dravidian_belt":0.4,"bengali_odia_belt":0.3,"generic_indian_english":0.3}',
    'Consonant cluster epenthesis - mirrors dropped_sounds rationale. '
    'Weak discriminator. UNREVIEWED.'
  ),
  (
    'ending_markers',
    '{"generic_indian_english":0.6}',
    'Bucket semantics under-specified from current word_bank data - treated '
    'conservatively as low-specificity pan-Indian marker pending clarification. '
    'UNREVIEWED.'
  ),
  (
    'looks_different',
    '{"generic_indian_english":0.6}',
    'Bucket semantics under-specified (grapheme-phoneme mismatch class) - treated '
    'conservatively as low-specificity pan-Indian marker. UNREVIEWED.'
  );
