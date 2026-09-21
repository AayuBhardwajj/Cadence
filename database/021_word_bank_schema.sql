-- Migration: word_bank table for Cadence content-service
-- NOTE: Check your migrations folder for the actual next available number
-- (known migrations run at least through 020_premium_profile.sql) and
-- rename this file accordingly before running, per your alphanumeric
-- migration-ordering convention.
--
-- Contains 142 MTI words + 25 stutter-trigger words = 167 total.

CREATE TABLE IF NOT EXISTS public.word_bank (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_code        TEXT UNIQUE NOT NULL,
    word             TEXT NOT NULL,
    issue_type       TEXT NOT NULL DEFAULT 'mti'
                       CHECK (issue_type IN ('mti', 'stutter_trigger')),
    bucket           TEXT NOT NULL
                       CHECK (bucket IN (
                           'extra_sound', 'v_w_mix', 'looks_different', 'wrong_stress', 'th_sound',
                           'vowel_shift', 'retroflex_td', 'syllabic_schwa', 'dropped_sounds', 'ending_markers',
                           'initial_consonant', 'long_word', 'content_word_stressed',
                           'sentence_initial_position', 'low_frequency_word'
                       )),
    bucket_2         TEXT
                       CHECK (bucket_2 IS NULL OR bucket_2 IN (
                           'extra_sound', 'v_w_mix', 'looks_different', 'wrong_stress', 'th_sound',
                           'vowel_shift', 'retroflex_td', 'syllabic_schwa', 'dropped_sounds', 'ending_markers',
                           'initial_consonant', 'long_word', 'content_word_stressed',
                           'sentence_initial_position', 'low_frequency_word'
                       )),
    why              TEXT NOT NULL,
    difficulty       TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    syllables        INTEGER,
    topic_fit        TEXT,
    verified_by_slp  TEXT NOT NULL DEFAULT 'not_yet'
                       CHECK (verified_by_slp IN ('not_yet', 'yes', 'no')),
    notes            TEXT,
    frequency_band   TEXT,
    source_citation  TEXT,
    l1_relevance     TEXT[] DEFAULT '{}',
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_bank_bucket ON public.word_bank(bucket);
CREATE INDEX IF NOT EXISTS idx_word_bank_issue_type ON public.word_bank(issue_type);
CREATE INDEX IF NOT EXISTS idx_word_bank_difficulty ON public.word_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_word_bank_active ON public.word_bank(active) WHERE active = TRUE;

-- Keep updated_at current on every edit made via the Supabase Table Editor
CREATE OR REPLACE FUNCTION public.set_word_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER word_bank_updated_at
    BEFORE UPDATE ON public.word_bank
    FOR EACH ROW EXECUTE FUNCTION public.set_word_bank_updated_at();

-- RLS: shared reference content, not user data.
-- Everyone (incl. anon) can read active entries; only the service role
-- (which bypasses RLS) can insert/update/delete -- same pattern as your
-- existing exercise_templates table.
ALTER TABLE public.word_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active word bank entries"
  ON public.word_bank FOR SELECT
  USING (active = TRUE);

-- Seed data: 142 MTI words + 25 stutter-trigger words = 167 total
INSERT INTO public.word_bank
    (word_code, word, issue_type, bucket, bucket_2, why, difficulty, syllables, topic_fit, verified_by_slp, notes)
VALUES
    ('WB001', 'school', 'mti', 'extra_sound', NULL, 'Starts with s+c, mouth wants to add a vowel before it', 'easy', 1, 'general', 'not_yet', '[Habib 2019] documents Punjabi speakers inserting a vowel before word-initial English clusters; ''school'' is the classic textbook example.'),
    ('WB002', 'sports', 'mti', 'extra_sound', NULL, 'Starts with s+p, same pattern', 'easy', 1, 'general', 'not_yet', '[Habib 2019] same cluster-epenthesis mechanism.'),
    ('WB003', 'speak', 'mti', 'extra_sound', NULL, 'Starts with s+p, same pattern', 'easy', 1, 'general', 'not_yet', '[Habib 2019] same mechanism.'),
    ('WB004', 'student', 'mti', 'extra_sound', NULL, 'Starts with s+t, same pattern', 'easy', 2, 'education', 'not_yet', '[Habib 2019] same mechanism.'),
    ('WB005', 'stop', 'mti', 'extra_sound', NULL, 'Starts with s+t, same pattern', 'easy', 1, 'general', 'not_yet', '[Habib 2019] same mechanism.'),
    ('WB006', 'spring', 'mti', 'extra_sound', NULL, 'Three sounds stacked at the start (s+p+r)', 'medium', 1, 'general', 'not_yet', '[Habib 2019] 3-consonant onset.'),
    ('WB007', 'strong', 'mti', 'extra_sound', NULL, 'Three sounds stacked (s+t+r)', 'medium', 1, 'general', 'not_yet', '[Habib 2019] 3-consonant onset.'),
    ('WB008', 'street', 'mti', 'extra_sound', NULL, 'Three sounds stacked (s+t+r)', 'medium', 1, 'general', 'not_yet', '[Habib 2019] 3-consonant onset.'),
    ('WB009', 'scream', 'mti', 'extra_sound', NULL, 'Three sounds stacked (s+c+r)', 'medium', 1, 'general', 'not_yet', '[Habib 2019] 3-consonant onset.'),
    ('WB010', 'script', 'mti', 'extra_sound', NULL, 's+c+r start plus a tricky ending too', 'hard', 1, 'tech', 'not_yet', '[Habib 2019] onset cluster; ending cluster is a separate documented reduction pattern.'),
    ('WB011', 'skill', 'mti', 'extra_sound', NULL, 'Starts with s+k cluster', 'easy', 1, 'business', 'not_yet', '[Habib 2019] same onset-cluster mechanism, common interview vocabulary.'),
    ('WB012', 'stress', 'mti', 'extra_sound', NULL, 's+t+r onset, also a common interview-context word', 'medium', 1, 'general', 'not_yet', '[Habib 2019] 3-consonant onset.'),
    ('WB013', 'spare', 'mti', 'extra_sound', NULL, 'Starts with s+p', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB014', 'small', 'mti', 'extra_sound', NULL, 'Starts with s+m', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB015', 'snake', 'mti', 'extra_sound', NULL, 'Starts with s+n', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB016', 'slide', 'mti', 'extra_sound', NULL, 'Starts with s+l', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB017', 'strategy', 'mti', 'extra_sound', 'wrong_stress', 's+t+r onset plus a multisyllabic stress pattern', 'medium', 3, 'business', 'not_yet', '[Habib 2019] onset cluster; stress pattern is a separate consideration.'),
    ('WB018', 'state', 'mti', 'extra_sound', NULL, 'Starts with s+t', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB019', 'store', 'mti', 'extra_sound', NULL, 'Starts with s+t', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB020', 'stamp', 'mti', 'extra_sound', NULL, 'Starts with s+t, ends in a cluster too (mp)', 'medium', 1, 'general', 'not_yet', '[Habib 2019] onset cluster plus final-cluster reduction risk.'),
    ('WB021', 'spirit', 'mti', 'extra_sound', NULL, 'Starts with s+p', 'easy', 2, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB022', 'swim', 'mti', 'extra_sound', NULL, 'Starts with s+w', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB023', 'smart', 'mti', 'extra_sound', NULL, 'Starts with s+m', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB024', 'sky', 'mti', 'extra_sound', NULL, 'Starts with s+k', 'easy', 1, 'general', 'not_yet', '[Habib 2019] 2-consonant onset.'),
    ('WB025', 'very', 'mti', 'v_w_mix', NULL, 'V sound often becomes w-ish', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah]: some Indian regions don''t distinguish /v/ and /w/ at all.'),
    ('WB026', 'vine', 'mti', 'v_w_mix', NULL, 'Classic v/w confusion pair', 'easy', 1, 'general', 'not_yet', '[Trudgill & Hannah] contrast pair; pair with ''wine''.'),
    ('WB027', 'wine', 'mti', 'v_w_mix', NULL, 'Paired with ''vine'' to test the contrast', 'easy', 1, 'general', 'not_yet', '[Trudgill & Hannah] contrast pair; pair with ''vine''.'),
    ('WB028', 'village', 'mti', 'v_w_mix', NULL, 'V sound at the start', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB029', 'vowel', 'mti', 'v_w_mix', NULL, 'V sound at the start, ironically', 'medium', 2, 'education', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB030', 'wonderful', 'mti', 'v_w_mix', NULL, 'W sound at the start, easy to mix with v', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB031', 'vehicle', 'mti', 'v_w_mix', 'looks_different', 'V sound, plus tricky spelling later in the word', 'medium', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w plus spelling irregularity.'),
    ('WB032', 'worldwide', 'mti', 'v_w_mix', NULL, 'Two w sounds in one word', 'medium', 2, 'business', 'not_yet', '[Trudgill & Hannah] v/w non-distinction, double exposure in one word.'),
    ('WB033', 'virtual', 'mti', 'v_w_mix', 'wrong_stress', 'V sound, plus stress can shift too', 'hard', 2, 'tech', 'not_yet', '[Trudgill & Hannah] v/w plus stress-timing overlap.'),
    ('WB034', 'volleyball', 'mti', 'v_w_mix', NULL, 'The exact textbook example of v/w merger', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah] gives this exact word: ''volleyball'' and ''wallyball'' become indistinguishable for some speakers.'),
    ('WB035', 'victory', 'mti', 'v_w_mix', NULL, 'V sound at the start', 'easy', 3, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB036', 'weather', 'mti', 'v_w_mix', 'th_sound', 'W sound at the start; also relevant to th-sound bucket via ''-ther'' ending pattern', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB037', 'wonder', 'mti', 'v_w_mix', NULL, 'W sound at the start', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB038', 'value', 'mti', 'v_w_mix', NULL, 'V sound at the start, common in business/interview contexts', 'easy', 2, 'business', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB039', 'wizard', 'mti', 'v_w_mix', NULL, 'W sound at the start', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB040', 'vacation', 'mti', 'v_w_mix', 'wrong_stress', 'V sound at the start, plus a suffix-driven stress shift', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah] v/w; [stress-shift/suffix research, general] -ation suffix pulls stress to itself.'),
    ('WB041', 'welcome', 'mti', 'v_w_mix', NULL, 'W sound at the start', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB042', 'vase', 'mti', 'v_w_mix', NULL, 'V sound at the start', 'easy', 1, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB043', 'wallet', 'mti', 'v_w_mix', NULL, 'W sound at the start', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction.'),
    ('WB044', 'travel', 'mti', 'v_w_mix', NULL, 'V sound in the middle of the word, not just word-initial', 'medium', 2, 'general', 'not_yet', '[Trudgill & Hannah] v/w non-distinction extends to medial position, per Wells blog anecdote of ''wery good'' for ''very good''.'),
    ('WB045', 'avoid', 'mti', 'v_w_mix', NULL, 'V sound in the middle of the word', 'medium', 2, 'general', 'not_yet', '[Trudgill & Hannah] medial v/w non-distinction.'),
    ('WB046', 'wednesday', 'mti', 'looks_different', 'th_sound', 'Silent ''d'' — most people say it wrong at first glance', 'easy', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling mismatch. Casually rendered as ''budday'' in speech, matching the th-substitution pattern too.'),
    ('WB047', 'colonel', 'mti', 'looks_different', NULL, 'Looks nothing like it sounds (''kernel'')', 'hard', 2, 'general', 'not_yet', '[general English orthography, common knowledge] irregular loanword spelling (from French/Italian).'),
    ('WB048', 'entrepreneur', 'mti', 'looks_different', 'wrong_stress', 'Spelling and stress both surprising', 'hard', 4, 'business', 'not_yet', '[general English orthography, common knowledge] French loanword spelling; [stress-shift/suffix research, general] stress falls on final syllable, atypical for English native-origin words.'),
    ('WB049', 'receipt', 'mti', 'looks_different', NULL, 'Silent ''p''', 'medium', 2, 'business', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB050', 'indict', 'mti', 'looks_different', NULL, 'Silent ''c'', rarely seen spelled this way', 'hard', 2, 'legal', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling, low-frequency legal vocabulary compounds the difficulty.'),
    ('WB051', 'debt', 'mti', 'looks_different', NULL, 'Silent ''b''', 'easy', 1, 'business', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB052', 'island', 'mti', 'looks_different', NULL, 'Silent ''s''', 'easy', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB053', 'answer', 'mti', 'looks_different', NULL, 'Silent ''w''', 'easy', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB054', 'queue', 'mti', 'looks_different', NULL, 'Five letters, one sound', 'medium', 1, 'general', 'not_yet', '[general English orthography, common knowledge] French loanword spelling.'),
    ('WB055', 'yacht', 'mti', 'looks_different', NULL, 'Totally unexpected pronunciation', 'hard', 1, 'general', 'not_yet', '[general English orthography, common knowledge] Dutch loanword spelling.'),
    ('WB056', 'knife', 'mti', 'looks_different', NULL, 'Silent ''k''', 'easy', 1, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling, common beginner-tier word.'),
    ('WB057', 'honest', 'mti', 'looks_different', NULL, 'Silent ''h''', 'easy', 2, 'business', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB058', 'listen', 'mti', 'looks_different', NULL, 'Silent ''t''', 'easy', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB059', 'climb', 'mti', 'looks_different', NULL, 'Silent ''b''', 'easy', 1, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB060', 'subtle', 'mti', 'looks_different', NULL, 'Silent ''b'', also an uncommon word overall', 'hard', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling plus low frequency.'),
    ('WB061', 'knowledge', 'mti', 'looks_different', 'extra_sound', 'Silent ''k'', plus a consonant cluster (''-wl-'')', 'medium', 2, 'academics', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB062', 'comb', 'mti', 'looks_different', NULL, 'Silent ''b''', 'easy', 1, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB063', 'psychology', 'mti', 'looks_different', 'wrong_stress', 'Silent ''p'', plus stress on the second syllable', 'hard', 4, 'academics', 'not_yet', '[general English orthography, common knowledge] Greek-origin silent letter; [stress-shift/suffix research, general] stress pattern from -ology suffix family.'),
    ('WB064', 'salmon', 'mti', 'looks_different', NULL, 'Silent ''l''', 'medium', 2, 'general', 'not_yet', '[general English orthography, common knowledge] silent-letter spelling.'),
    ('WB065', 'foreign', 'mti', 'looks_different', NULL, 'Spelling gives no clue to the actual vowel sound', 'medium', 2, 'general', 'not_yet', '[general English orthography, common knowledge] irregular vowel spelling.'),
    ('WB066', 'through', 'mti', 'looks_different', NULL, 'The ''ough'' letters sound like ''oo'' here', 'medium', 1, 'general', 'not_yet', '[general English orthography, common knowledge] ''ough'' has at least 6 different pronunciations across English words.'),
    ('WB067', 'though', 'mti', 'looks_different', NULL, 'Same ''ough'' letters, different sound than ''through''', 'medium', 1, 'general', 'not_yet', '[general English orthography, common knowledge] ''ough'' inconsistency; pair with ''through'' and ''enough''.'),
    ('WB068', 'enough', 'mti', 'looks_different', NULL, 'Same ''ough'' letters, yet another different sound', 'medium', 2, 'general', 'not_yet', '[general English orthography, common knowledge] ''ough'' inconsistency; third variant.'),
    ('WB069', 'cough', 'mti', 'looks_different', NULL, 'Same ''ough'' letters, a fourth different sound', 'medium', 1, 'general', 'not_yet', '[general English orthography, common knowledge] ''ough'' inconsistency.'),
    ('WB070', 'croissant', 'mti', 'looks_different', 'extra_sound', 'French loanword spelling doesn''t match sound, plus starts with a consonant cluster (cr)', 'hard', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: Indian English speakers tend to nativize borrowed words (cf. ''Xerox'' used as a verb) — a related vocabulary phenomenon worth noting alongside pronunciation.'),
    ('WB071', 'comfortable', 'mti', 'wrong_stress', NULL, 'Most people stress the wrong syllable', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah]: unstressed syllables in other varieties get full stress in Indian English due to syllable-timing.'),
    ('WB072', 'temporary', 'mti', 'wrong_stress', NULL, 'Easy to over-pronounce every syllable evenly', 'medium', 4, 'business', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB073', 'photographer', 'mti', 'wrong_stress', NULL, 'Stress moves compared to ''photograph'' — good pair to test', 'hard', 4, 'general', 'not_yet', '[stress-shift/suffix research, general] suffix-driven stress shift; pair with ''photograph''.'),
    ('WB074', 'february', 'mti', 'wrong_stress', NULL, 'Often simplified or misstressed', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB075', 'vegetable', 'mti', 'wrong_stress', NULL, 'Tends to get an extra syllable added', 'medium', 3, 'general', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB076', 'interesting', 'mti', 'wrong_stress', NULL, 'Often over-enunciated; native speakers compress it', 'medium', 4, 'general', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency, function/weak syllables not reduced.'),
    ('WB077', 'statistics', 'mti', 'wrong_stress', 'extra_sound', 'Stress placement plus a tricky cluster', 'hard', 4, 'academics', 'not_yet', '[stress-shift/suffix research, general] -ics suffix pulls stress to the preceding syllable; also a consonant-cluster word.'),
    ('WB078', 'necessary', 'mti', 'wrong_stress', NULL, 'Easy to spread stress evenly instead of on one syllable', 'medium', 4, 'general', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB079', 'chocolate', 'mti', 'wrong_stress', NULL, 'Often pronounced with an extra syllable', 'easy', 2, 'general', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency, usually said as 3 syllables instead of 2.'),
    ('WB080', 'record', 'mti', 'wrong_stress', NULL, 'Stress changes between noun (''RE-cord'') and verb (''re-CORD'')', 'hard', 2, 'business', 'not_yet', '[practitioner: Talkdrill] documents this exact noun/verb stress-pair issue.'),
    ('WB081', 'present', 'mti', 'wrong_stress', NULL, 'Same noun/verb stress-shift pattern as ''record''', 'hard', 2, 'business', 'not_yet', '[practitioner: Talkdrill] same noun/verb stress-pair mechanism.'),
    ('WB082', 'atmosphere', 'mti', 'wrong_stress', NULL, 'Stressed on the middle syllable rather than the first, which can cause real listener confusion', 'hard', 3, 'academics', 'not_yet', 'Documented real case of a listener failing to recognize ''atmosphere'' when stressed on the middle syllable.'),
    ('WB083', 'economic', 'mti', 'wrong_stress', NULL, 'Stress shifts compared to ''economy'' due to the ''-ic'' suffix', 'hard', 4, 'business', 'not_yet', '[stress-shift/suffix research, general] -ic suffix pulls stress to the preceding syllable.'),
    ('WB084', 'education', 'mti', 'wrong_stress', NULL, 'Stress shifts compared to ''educate'' due to the ''-tion'' suffix', 'medium', 4, 'academics', 'not_yet', '[stress-shift/suffix research, general] -tion suffix pulls stress to the preceding syllable.'),
    ('WB085', 'musician', 'mti', 'wrong_stress', NULL, 'Stress shifts compared to ''music'' due to the ''-ian'' suffix', 'medium', 3, 'general', 'not_yet', '[stress-shift/suffix research, general] -ian suffix pulls stress to the preceding syllable.'),
    ('WB086', 'electrician', 'mti', 'wrong_stress', 'extra_sound', 'Stress shifts due to ''-ian'' suffix, plus a cluster', 'hard', 4, 'general', 'not_yet', '[stress-shift/suffix research, general] -ian suffix stress shift.'),
    ('WB087', 'computer', 'mti', 'wrong_stress', NULL, 'Often said with each syllable equally loud instead of one clear stress', 'medium', 3, 'tech', 'not_yet', '[practitioner: Talkdrill] names this exact word as a common equal-stress pattern.'),
    ('WB088', 'important', 'mti', 'wrong_stress', NULL, 'Common interview word, stress sometimes evened out across syllables', 'medium', 3, 'business', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB089', 'develop', 'mti', 'wrong_stress', NULL, 'Stress sometimes evened out across syllables', 'medium', 3, 'business', 'not_yet', '[Trudgill & Hannah] syllable-timing tendency.'),
    ('WB090', 'hamburger', 'mti', 'wrong_stress', NULL, 'Documented real example of stress falling on the second syllable instead of the first', 'medium', 3, 'general', 'not_yet', '[Wells blog] anecdote of an Anglo-Indian speaker''s stress falling on the second syllable.'),
    ('WB091', 'think', 'mti', 'th_sound', NULL, '''th'' often becomes a harder t/d sound', 'easy', 1, 'general', 'not_yet', '[Wells blog]: most Indian languages have no dental fricative; [Indian English phonology reference, IPA-transcribed, precise citation not confirmed] confirms the substitute is specifically an aspirated dental plosive [tʰ], not a plain ''t''.'),
    ('WB092', 'thirty', 'mti', 'th_sound', NULL, 'Same ''th'' issue, plus a number word (useful for interviews)', 'easy', 2, 'general', 'not_yet', '[Wells blog] th-substitution; numbers are high-value interview vocabulary.'),
    ('WB093', 'author', 'mti', 'th_sound', NULL, '''th'' in the middle of a word', 'medium', 2, 'general', 'not_yet', '[Wells blog] th-substitution, mid-word position.'),
    ('WB094', 'three', 'mti', 'th_sound', NULL, '''th'' at the start', 'easy', 1, 'general', 'not_yet', '[Wells blog] th-substitution.'),
    ('WB095', 'width', 'mti', 'th_sound', 'extra_sound', '''th'' plus a tricky ending cluster', 'hard', 1, 'general', 'not_yet', '[Wells blog] th-substitution plus final-cluster reduction.'),
    ('WB096', 'clothes', 'mti', 'th_sound', 'extra_sound', '''th'' plus a consonant cluster at the end', 'hard', 1, 'general', 'not_yet', '[Wells blog] th-substitution plus final-cluster reduction.'),
    ('WB097', 'throughout', 'mti', 'th_sound', NULL, '''th'' at the start, plus a long word overall', 'hard', 3, 'general', 'not_yet', '[Wells blog] th-substitution.'),
    ('WB098', 'truth', 'mti', 'th_sound', NULL, '''th'' at the end this time, not just the start', 'medium', 1, 'general', 'not_yet', '[Wells blog] th-substitution, word-final position.'),
    ('WB099', 'thing', 'mti', 'th_sound', NULL, '''th'' at the start; casually renders as ''ting'' in fast speech', 'easy', 1, 'general', 'not_yet', '[practitioner: FluentU] common th-substitution word; [Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives ''thing''→''ting'' as a direct documented example.'),
    ('WB100', 'thank', 'mti', 'th_sound', NULL, '''th'' at the start, common in interview/social contexts', 'easy', 1, 'general', 'not_yet', '[practitioner: FluentU] common th-substitution practice word.'),
    ('WB101', 'thought', 'mti', 'th_sound', NULL, '''th'' at the start, also spelled irregularly', 'medium', 1, 'academics', 'not_yet', '[practitioner: FluentU] th-substitution plus ''ough'' spelling irregularity.'),
    ('WB102', 'teeth', 'mti', 'th_sound', NULL, '''th'' at the end', 'easy', 1, 'general', 'not_yet', '[practitioner: Talkdrill] standard voiceless-th practice word.'),
    ('WB103', 'math', 'mti', 'th_sound', NULL, '''th'' at the end, short and common', 'easy', 1, 'academics', 'not_yet', '[practitioner: Talkdrill] standard voiceless-th practice word.'),
    ('WB104', 'birthday', 'mti', 'th_sound', NULL, '''th'' in the middle, very high-frequency word; casually rendered ''budday''', 'easy', 2, 'general', 'not_yet', '[practitioner: Talkdrill] standard practice word; [Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives ''birthday''→''budday'' as a direct documented example.'),
    ('WB105', 'something', 'mti', 'th_sound', NULL, '''th'' in the middle, extremely high-frequency word', 'easy', 2, 'general', 'not_yet', '[practitioner: Talkdrill] standard voiceless-th practice word.'),
    ('WB106', 'this', 'mti', 'th_sound', NULL, 'Voiced ''th'' — often substituted with ''d'' instead of ''t''', 'easy', 1, 'general', 'not_yet', '[Wells blog] voiced /ð/ often becomes plain ''d''; [Indian English phonology reference, IPA-transcribed, precise citation not confirmed] confirms voiced th is ''almost absent'' in Indian English, replaced by an unaspirated voiced dental plosive.'),
    ('WB107', 'that', 'mti', 'th_sound', NULL, 'Voiced ''th'', same substitution pattern as ''this''', 'easy', 1, 'general', 'not_yet', '[Wells blog] voiced-th substitution.'),
    ('WB108', 'mother', 'mti', 'th_sound', NULL, 'Voiced ''th'' in the middle of a word', 'easy', 2, 'general', 'not_yet', '[Wells blog] voiced-th substitution, mid-word position.'),
    ('WB109', 'brother', 'mti', 'th_sound', NULL, 'Voiced ''th'' in the middle of a word', 'easy', 2, 'general', 'not_yet', '[Wells blog] voiced-th substitution, mid-word position.'),
    ('WB110', 'bathe', 'mti', 'th_sound', NULL, 'Voiced ''th'' at the end, less common word shape', 'medium', 1, 'general', 'not_yet', '[Wells blog] voiced-th substitution, word-final position.'),
    ('WB111', 'theory', 'mti', 'th_sound', 'wrong_stress', '''th'' at the start, plus a 3-syllable stress pattern', 'medium', 3, 'academics', 'not_yet', '[Wells blog] th-substitution plus multisyllabic stress difficulty.'),
    ('WB112', 'theatre', 'mti', 'th_sound', NULL, '''th'' at the start, common in social/cultural contexts', 'medium', 2, 'general', 'not_yet', '[Wells blog] th-substitution.'),
    ('WB113', 'ship', 'mti', 'vowel_shift', NULL, 'Short vowel often stretches toward ''sheep'', blurring a real word contrast', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: many speakers pronounced ''ship'' with a long vowel, making it closer to ''sheep'' — a documented minimal-pair confusion.'),
    ('WB114', 'sheep', 'mti', 'vowel_shift', NULL, 'Paired with ''ship'' to test the short/long vowel contrast directly', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same minimal-pair confusion, pair with ''ship''.'),
    ('WB115', 'pull', 'mti', 'vowel_shift', NULL, 'Short vowel often stretches toward ''pool''', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: ''pull'' was extended toward the long vowel in ''pool'' in documented classroom observation.'),
    ('WB116', 'pool', 'mti', 'vowel_shift', NULL, 'Paired with ''pull'' to test the contrast directly', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same minimal-pair confusion, pair with ''pull''.'),
    ('WB117', 'nail', 'mti', 'vowel_shift', NULL, 'The two-part vowel sound flattens into one long vowel instead of gliding', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: diphthongs like the one in ''nail'' are commonly replaced with an extended single vowel in Indian English.'),
    ('WB118', 'sole', 'mti', 'vowel_shift', NULL, 'Same flattening pattern as ''nail'', different vowel', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same diphthong-flattening mechanism.'),
    ('WB119', 'home', 'mti', 'vowel_shift', NULL, 'Two-part vowel sound flattens into a long single vowel', 'easy', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] diphthong-flattening mechanism, very high-frequency word.'),
    ('WB120', 'day', 'mti', 'vowel_shift', NULL, 'Two-part vowel sound flattens into a long single vowel', 'easy', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] diphthong-flattening mechanism.'),
    ('WB121', 'beer', 'mti', 'vowel_shift', NULL, 'Vowel merges directly into the following ''r'' sound instead of staying a separate glide', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of vowel-plus-r merging.'),
    ('WB122', 'tour', 'mti', 'vowel_shift', NULL, 'Vowel merges into the following ''r'' sound', 'medium', 1, 'business', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example.'),
    ('WB123', 'pear', 'mti', 'vowel_shift', NULL, 'Vowel merges into the following ''r'' sound', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example.'),
    ('WB124', 'water', 'mti', 'retroflex_td', NULL, 'Plain ''t'' sound gets pulled backward in the mouth into a retroflex sound', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: Indian English commonly uses retroflex plosives in place of the plain alveolar ''t''/''d'' sounds English normally uses.'),
    ('WB125', 'better', 'mti', 'retroflex_td', NULL, 'Plain ''t'' sound pulled backward into a retroflex sound', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same retroflex substitution mechanism.'),
    ('WB126', 'little', 'mti', 'retroflex_td', 'syllabic_schwa', 'Plain ''t'' pulled to retroflex, plus a syllabic-consonant ending that often gets an extra vowel', 'hard', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] combines two documented mechanisms in one word.'),
    ('WB127', 'daddy', 'mti', 'retroflex_td', NULL, 'Plain ''d'' sound pulled backward into a retroflex sound', 'easy', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same retroflex substitution mechanism.'),
    ('WB128', 'today', 'mti', 'retroflex_td', NULL, 'Plain ''t'' and ''d'' sounds both pulled backward into retroflex sounds in the same word', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] same retroflex substitution mechanism, double exposure.'),
    ('WB129', 'bottle', 'mti', 'syllabic_schwa', NULL, 'The ''l'' at the end normally has no vowel before it in English, but Indian English commonly inserts one', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as the standard example of missing syllabic consonants leading to an inserted vowel.'),
    ('WB130', 'film', 'mti', 'syllabic_schwa', NULL, 'Often gets an extra vowel inserted, sounding closer to ''fil-em''', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example, noting it can be pronounced either the standard way or with the inserted vowel.'),
    ('WB131', 'table', 'mti', 'syllabic_schwa', 'retroflex_td', 'Same ''l''-ending vowel insertion as ''bottle'', plus a retroflex ''t''', 'hard', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] combines two documented mechanisms in one word.'),
    ('WB132', 'asked', 'mti', 'dropped_sounds', NULL, 'The ending sounds get dropped — often said closer to ''ahs'' than the full ''askt''', 'hard', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of final-cluster dropping.'),
    ('WB133', 'help', 'mti', 'dropped_sounds', NULL, 'The final ''p'' sound often gets dropped', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example.'),
    ('WB134', 'world', 'mti', 'dropped_sounds', NULL, 'The ''r'' sound is typically silent here, consistent with Indian English generally not pronouncing ''r'' except before a vowel', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of the non-rhotic pattern.'),
    ('WB135', 'spark', 'mti', 'dropped_sounds', NULL, 'The ''r'' sound is typically silent here, same non-rhotic pattern as ''world''', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example.'),
    ('WB136', 'actions', 'mti', 'dropped_sounds', 'extra_sound', 'The middle cluster gets simplified — often said closer to ''aks'' than the full word', 'hard', 2, 'business', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of cluster reduction.'),
    ('WB137', 'trapped', 'mti', 'ending_markers', NULL, 'The past-tense ending is often said with a voiced ''d'' sound instead of the expected voiceless ''t'' sound', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of past-tense-ending voicing.'),
    ('WB138', 'walked', 'mti', 'ending_markers', NULL, 'Same past-tense-ending pattern as ''trapped'' — extrapolated from the general rule, not a directly cited example', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: pattern extrapolated from the documented rule, not itself a named example — verify with an SLP before treating as confirmed.'),
    ('WB139', 'watched', 'mti', 'ending_markers', NULL, 'Same past-tense-ending pattern — extrapolated, not directly cited', 'medium', 1, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: pattern extrapolated from the documented rule — verify before treating as confirmed.'),
    ('WB140', 'kisses', 'mti', 'ending_markers', NULL, 'The plural ending is pronounced with the final sound devoiced compared to standard English', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example of plural-ending devoicing.'),
    ('WB141', 'bridges', 'mti', 'ending_markers', NULL, 'Same plural-ending devoicing pattern as ''kisses''', 'medium', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed] gives this exact word as a direct example.'),
    ('WB142', 'boxes', 'mti', 'ending_markers', NULL, 'Same plural-ending pattern — extrapolated, not directly cited', 'easy', 2, 'general', 'not_yet', '[Indian English phonology reference, IPA-transcribed, precise citation not confirmed]: pattern extrapolated from the documented rule — verify before treating as confirmed.'),
    ('WB143', 'particular', 'stutter_trigger', 'long_word', 'content_word_stressed', '10 letters, content word (adjective) carrying sentence stress -- two stacked risk factors', 'hard', 4, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication]: length and grammatical class are two of the four classic factors; [feature-analysis of stuttered phonemes, ScienceDirect] confirms length independently predicts stuttering.'),
    ('WB144', 'describe', 'stutter_trigger', 'initial_consonant', 'content_word_stressed', 'Starts with a consonant, is a content-word verb -- common interview instruction word', 'medium', 2, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1 (initial consonant) and 4 (grammatical class).'),
    ('WB145', 'decision', 'stutter_trigger', 'long_word', 'content_word_stressed', '8 letters, content-word noun, common in interview answers', 'medium', 3, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB146', 'department', 'stutter_trigger', 'long_word', 'content_word_stressed', '10 letters, content-word noun', 'hard', 3, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB147', 'government', 'stutter_trigger', 'long_word', 'content_word_stressed', '10 letters, content-word noun', 'hard', 3, 'general', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB148', 'community', 'stutter_trigger', 'long_word', 'content_word_stressed', '9 letters, content-word noun', 'hard', 4, 'general', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB149', 'difficult', 'stutter_trigger', 'long_word', 'content_word_stressed', '9 letters, content-word adjective, moderately low frequency', 'hard', 3, 'general', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4; [feature-analysis of stuttered phonemes, ScienceDirect] on low-frequency compounding the risk.'),
    ('WB150', 'project', 'stutter_trigger', 'initial_consonant', 'content_word_stressed', 'Starts with a plosive (p), content-word noun/verb, extremely common interview word', 'medium', 2, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1 and 4.'),
    ('WB151', 'previous', 'stutter_trigger', 'long_word', 'content_word_stressed', '8 letters, content-word adjective', 'medium', 3, 'academics', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB152', 'position', 'stutter_trigger', 'long_word', 'content_word_stressed', '8 letters, content-word noun, extremely common interview word', 'medium', 3, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB153', 'personal', 'stutter_trigger', 'initial_consonant', 'content_word_stressed', 'Starts with a plosive (p), content-word adjective', 'medium', 3, 'general', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1 and 4.'),
    ('WB154', 'professional', 'stutter_trigger', 'long_word', 'content_word_stressed', '12 letters, content-word adjective, extremely common interview word', 'hard', 4, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4, high letter count.'),
    ('WB155', 'presentation', 'stutter_trigger', 'long_word', 'content_word_stressed', '12 letters, content-word noun, starts with a plosive (p) -- 3 stacked factors', 'hard', 4, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1, 3, and 4 all stacked.'),
    ('WB156', 'performance', 'stutter_trigger', 'long_word', 'content_word_stressed', '11 letters, content-word noun', 'hard', 3, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB157', 'background', 'stutter_trigger', 'long_word', 'content_word_stressed', '10 letters, content-word noun, starts with a plosive (b)', 'hard', 2, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1, 3, and 4 stacked.'),
    ('WB158', 'responsibility', 'stutter_trigger', 'long_word', 'low_frequency_word', '14 letters, one of the longest and rarer words in common interview vocabulary -- heaviest planning demand in this set', 'hard', 6, 'business', 'not_yet', '[feature-analysis of stuttered phonemes, ScienceDirect]: length AND word frequency both independently predict stuttering; this word maxes out both.'),
    ('WB159', 'challenge', 'stutter_trigger', 'initial_consonant', 'content_word_stressed', 'Starts with a consonant, content-word noun/verb, extremely common interview word', 'medium', 2, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1 and 4.'),
    ('WB160', 'opportunity', 'stutter_trigger', 'long_word', 'low_frequency_word', '11 letters, moderately rare, content-word noun, very common interview word', 'hard', 5, 'business', 'not_yet', '[feature-analysis of stuttered phonemes, ScienceDirect]: length and frequency stacked.'),
    ('WB161', 'achievement', 'stutter_trigger', 'long_word', 'content_word_stressed', '11 letters, content-word noun', 'hard', 3, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB162', 'experience', 'stutter_trigger', 'long_word', 'content_word_stressed', '10 letters, content-word noun, extremely common interview word', 'hard', 4, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 3 and 4.'),
    ('WB163', 'communication', 'stutter_trigger', 'long_word', 'low_frequency_word', '13 letters, content-word noun -- high planning demand', 'hard', 5, 'business', 'not_yet', '[feature-analysis of stuttered phonemes, ScienceDirect]: length and frequency stacked.'),
    ('WB164', 'negotiate', 'stutter_trigger', 'initial_consonant', 'content_word_stressed', 'Starts with a consonant, content-word verb', 'medium', 4, 'business', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factors 1 and 4.'),
    ('WB165', 'priorities', 'stutter_trigger', 'long_word', 'low_frequency_word', '10 letters, moderately rare content-word noun', 'hard', 4, 'business', 'not_yet', '[feature-analysis of stuttered phonemes, ScienceDirect]: length and frequency stacked.'),
    ('WB166', 'particularly', 'stutter_trigger', 'long_word', 'sentence_initial_position', '12 letters, often opens a sentence as an adverb -- note: sentence-position evidence is weaker than the other factors', 'hard', 5, 'general', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factor 2 combined with length; [Max et al. 2019 -- position factor caveat] found position alone did not independently predict stuttering once other factors were controlled -- treat as suggestive, not confirmed.'),
    ('WB167', 'therefore', 'stutter_trigger', 'sentence_initial_position', 'initial_consonant', 'Often opens a sentence, starts with ''th'' (also relevant to th-sound MTI bucket)', 'medium', 2, 'academics', 'not_yet', '[Brown 1945, via Max et al. 2019 replication] factor 2 (weaker evidence, see Max et al. 2019 caveat) plus factor 1.')
ON CONFLICT (word_code) DO NOTHING;