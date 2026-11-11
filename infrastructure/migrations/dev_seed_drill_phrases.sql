-- ============================================================
-- DEV SEED — drill_phrases  (local dev only, never run on staging/prod)
-- Run with: psql $LOCAL_DEV_DATABASE_URL -f dev_seed_drill_phrases.sql
-- or via: scripts/with-env.sh dev psql -f infrastructure/migrations/dev_seed_drill_phrases.sql
-- ============================================================
-- Covers onsets: k, s, p  and bucket: th_sound   across levels 1–3
-- source is 'curated' for all seed rows.

INSERT INTO public.drill_phrases
  (id, onset, bucket, level, phrase_text, word_count, source, active)
VALUES

-- ── ONSET: k ────────────────────────────────────────────────
-- Level 1 (word-level)
(gen_random_uuid(), 'k', NULL, 1, 'kite',           1, 'curated', true),
(gen_random_uuid(), 'k', NULL, 1, 'cat',            1, 'curated', true),

-- Level 2 (short phrase)
(gen_random_uuid(), 'k', NULL, 2, 'a cute kite',    3, 'curated', true),
(gen_random_uuid(), 'k', NULL, 2, 'cool calm cat',  3, 'curated', true),

-- Level 3 (full sentence)
(gen_random_uuid(), 'k', NULL, 3, 'The kite climbed quickly across a clear cool sky.',    9, 'curated', true),

-- ── ONSET: s ────────────────────────────────────────────────
-- Level 1
(gen_random_uuid(), 's', NULL, 1, 'sun',            1, 'curated', true),
(gen_random_uuid(), 's', NULL, 1, 'sit',            1, 'curated', true),

-- Level 2
(gen_random_uuid(), 's', NULL, 2, 'some sunny days',          3, 'curated', true),
(gen_random_uuid(), 's', NULL, 2, 'seven silver stars',       3, 'curated', true),

-- Level 3
(gen_random_uuid(), 's', NULL, 3, 'She sells sea shells by the sea shore every summer.',  10, 'curated', true),

-- ── ONSET: p ────────────────────────────────────────────────
-- Level 1
(gen_random_uuid(), 'p', NULL, 1, 'pen',            1, 'curated', true),
(gen_random_uuid(), 'p', NULL, 1, 'pot',            1, 'curated', true),

-- Level 2
(gen_random_uuid(), 'p', NULL, 2, 'pick a pepper',  3, 'curated', true),

-- Level 3
(gen_random_uuid(), 'p', NULL, 3, 'Peter Piper picked a peck of pickled peppers.',        9, 'curated', true),

-- ── BUCKET: th_sound ────────────────────────────────────────
-- Level 1
(gen_random_uuid(), NULL, 'th_sound', 1, 'the',                 1, 'curated', true),
(gen_random_uuid(), NULL, 'th_sound', 1, 'through',             1, 'curated', true),

-- Level 2
(gen_random_uuid(), NULL, 'th_sound', 2, 'through the weather', 3, 'curated', true),

-- Level 3
(gen_random_uuid(), NULL, 'th_sound', 3, 'Three thin thieves thought through thirty things.', 7, 'curated', true)

ON CONFLICT DO NOTHING;

