-- ==============================================================================
-- V4__course_learning_pipeline.sql
-- Cadence Learning Pipeline: Courses, Modules, Lessons, Exercises, and Progress
-- ==============================================================================

-- 1. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(500),
    level VARCHAR(50) NOT NULL DEFAULT 'INTERMEDIATE', -- 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
    category VARCHAR(100) NOT NULL DEFAULT 'Fluency & Flow',
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    thumbnail_url VARCHAR(500),
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COURSE MODULES TABLE
CREATE TABLE IF NOT EXISTS public.course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LESSONS TABLE
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 10,
    content_markdown TEXT NOT NULL,
    key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EXERCISES TABLE
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instruction TEXT NOT NULL,
    exercise_type VARCHAR(50) NOT NULL DEFAULT 'MULTIPLE_CHOICE', -- 'MULTIPLE_CHOICE', 'SENTENCE_REPETITION', 'SPEAKING_PROMPT', 'FILL_IN_BLANK'
    prompt_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    hints JSONB NOT NULL DEFAULT '[]'::jsonb,
    rubric JSONB NOT NULL DEFAULT '{}'::jsonb,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COURSE ENROLLMENTS TABLE (Learner Ownership)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_course_enrollment UNIQUE (course_id, learner_id)
);

-- 6. LESSON PROGRESS TABLE (Learner Ownership)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_lesson_learner UNIQUE (lesson_id, learner_id)
);

-- 7. EXERCISE ATTEMPTS TABLE (Learner Ownership)
CREATE TABLE IF NOT EXISTS public.exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    learner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    is_correct BOOLEAN,
    score INTEGER NOT NULL DEFAULT 0,
    feedback TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson_id ON public.exercises(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_learner ON public.course_enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_learner ON public.lesson_progress(learner_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_learner ON public.exercise_attempts(learner_id, exercise_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_attempts ENABLE ROW LEVEL SECURITY;

-- Permissions for Supabase Platform roles
GRANT ALL ON TABLE public.courses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.course_modules TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lessons TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exercises TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.course_enrollments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lesson_progress TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exercise_attempts TO anon, authenticated, service_role;

-- RLS Policies
-- Courses: public can read published courses
CREATE POLICY "Public can view published courses"
    ON public.courses FOR SELECT
    USING (published = true);

-- Course Modules: visible if parent course is published
CREATE POLICY "Public can view published course modules"
    ON public.course_modules FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id AND c.published = true));

-- Lessons: visible if published and parent course is published
CREATE POLICY "Public can view published lessons"
    ON public.lessons FOR SELECT
    USING (published = true AND EXISTS (
        SELECT 1 FROM public.course_modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = lessons.module_id AND c.published = true
    ));

-- Exercises: visible if parent lesson and course are published
CREATE POLICY "Public can view published exercises"
    ON public.exercises FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = exercises.lesson_id AND l.published = true AND c.published = true
    ));

-- Learner Ownership Policies
CREATE POLICY "Learners can manage own course enrollments"
    ON public.course_enrollments FOR ALL
    USING (auth.uid() = learner_id)
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can manage own lesson progress"
    ON public.lesson_progress FOR ALL
    USING (auth.uid() = learner_id)
    WITH CHECK (auth.uid() = learner_id);

CREATE POLICY "Learners can manage own exercise attempts"
    ON public.exercise_attempts FOR ALL
    USING (auth.uid() = learner_id)
    WITH CHECK (auth.uid() = learner_id);

-- ==============================================================================
-- SEED DATA: Spoken English Courses, Modules, Lessons, and Exercises
-- ==============================================================================

-- Course 1: Mastering Conversational Fluency (Intermediate)
INSERT INTO public.courses (id, title, slug, description, short_description, level, category, estimated_minutes, published)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Mastering Conversational Fluency',
    'mastering-conversational-fluency',
    'Develop natural speaking rhythm, structure thoughts into seamless speech groups, and eliminate verbal fillers (um, uh, like) during spontaneous conversations and professional interviews.',
    'Build natural speech rhythm and eliminate verbal fillers with structured speaking drills.',
    'INTERMEDIATE',
    'Fluency & Flow',
    45,
    true
) ON CONFLICT (slug) DO NOTHING;

-- Course 1 Module 1: Thought Chunking & Natural Pauses
INSERT INTO public.course_modules (id, course_id, title, description, order_index)
VALUES (
    '22222222-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Thought Chunking & Natural Pauses',
    'Learn how native and confident speakers group words into meaningful acoustic packets instead of word-by-word delivery.',
    1
) ON CONFLICT (id) DO NOTHING;

-- Course 1 Module 1 Lesson 1: The Power of Thought Groups
INSERT INTO public.lessons (id, module_id, title, description, order_index, duration_minutes, content_markdown, key_takeaways, published)
VALUES (
    '33333333-1111-1111-1111-111111111111',
    '22222222-1111-1111-1111-111111111111',
    'Speaking in Thought Groups',
    'Master the technique of chunking phrases together to create clear, rhythmic spoken English.',
    1,
    15,
    '# Speaking in Thought Groups

When non-native speakers feel nervous, they often make one of two mistakes:
1. **Word-by-word delivery:** Speaking like a metronome with pauses between every individual word (*"I... went... to... the... store..."*).
2. **Runaway train delivery:** Blurt out 30 words in a single breath without pausing, running out of air and forcing unnatural stops.

Fluent spoken English relies on **thought groups** (acoustic phrases of 3 to 7 words) separated by brief micro-pauses.

---

### The Three Rules of Thought Chunking

1. **Keep grammatical units together:**
   - Prepositional phrases: `[in the previous quarter]`
   - Subject + verb combinations: `[our team decided]`
   - Infinitive structures: `[to launch the initiative]`

2. **Pause before transitions and connectors:**
   - Instead of pausing randomly, pause right before conjunctions like *because, although, however, but*.
   - Example: *"We achieved 120% of our milestone / because everyone collaborated effectively."*

3. **Anchor the focus word at the end of each chunk:**
   - In each thought group, one syllable receives primary stress and pitch change.
   - Example: *"[In the first phase] / [we prioritized stability] / [over speed]."*

---

### Comparison Practice

Read these two deliveries aloud and notice the difference in clarity:

- **Choppy:** *"I / think / that / we / should / start / now."* (Distracting, robotic)
- **Fluid Chunking:** *"[I think that] / [we should start now]."* (Natural, authoritative)',
    '["Thought groups are 3 to 7 word units representing a single idea.", "Micro-pauses should occur at syntactic boundaries, not mid-phrase.", "Punctuate your speech with deliberate breaths between chunks."]'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- Exercise for Course 1 Module 1 Lesson 1 (Multiple Choice)
INSERT INTO public.exercises (id, lesson_id, title, instruction, exercise_type, prompt_text, options, correct_answer, hints, rubric, order_index)
VALUES (
    '44444444-1111-1111-1111-111111111111',
    '33333333-1111-1111-1111-111111111111',
    'Thought Group Boundary Identification',
    'Choose the delivery that places micro-pauses (marked with /) at natural thought-group boundaries.',
    'MULTIPLE_CHOICE',
    'Select the sentence chunking that sounds most professional and fluent:',
    '[
        {"id": "A", "text": "Although our team / faced unexpected technical difficulties / we completed the release on / schedule.", "explanation": "Incorrect: Pausing after ''on'' separates the preposition from its noun object ''schedule''."},
        {"id": "B", "text": "Although our team faced unexpected technical difficulties, / we completed the release / on schedule.", "explanation": "Correct! The clauses and prepositional phrase are divided at natural syntactic boundaries."},
        {"id": "C", "text": "Although / our team faced / unexpected technical / difficulties we completed / the release on schedule.", "explanation": "Incorrect: The words are chopped awkwardly mid-phrase, breaking listening comprehension."},
        {"id": "D", "text": "Although our / team faced unexpected / technical difficulties we / completed the release on schedule.", "explanation": "Incorrect: Breaking between possessive ''our'' and ''team'' is unnatural."}
    ]'::jsonb,
    'B',
    '["Look for natural grammatical breaks like commas, clause boundaries, and prepositional phrases."]'::jsonb,
    '{"type": "objective", "points": 100}'::jsonb,
    1
) ON CONFLICT (id) DO NOTHING;

-- Exercise 2 for Course 1 Module 1 Lesson 1 (Sentence Repetition / Target phrase)
INSERT INTO public.exercises (id, lesson_id, title, instruction, exercise_type, prompt_text, options, correct_answer, hints, rubric, order_index)
VALUES (
    '44444444-1111-1111-1111-111111111112',
    '33333333-1111-1111-1111-111111111111',
    'Cadence Practice: Smooth Chunking',
    'Read the sentence aloud, focusing on pausing briefly at the comma and delivering each chunk smoothly without hesitation.',
    'SENTENCE_REPETITION',
    'In modern software architecture, microservices enable engineering teams to deploy independently.',
    '[]'::jsonb,
    'In modern software architecture, microservices enable engineering teams to deploy independently.',
    '["Break into two distinct packets: ''In modern software architecture'' and ''microservices enable engineering teams to deploy independently''."]'::jsonb,
    '{"type": "repetition", "targetPhrase": "In modern software architecture, microservices enable engineering teams to deploy independently."}'::jsonb,
    2
) ON CONFLICT (id) DO NOTHING;

-- Course 1 Module 1 Lesson 2: Eliminating Fillers
INSERT INTO public.lessons (id, module_id, title, description, order_index, duration_minutes, content_markdown, key_takeaways, published)
VALUES (
    '33333333-1111-1111-1111-111111111112',
    '22222222-1111-1111-1111-111111111111',
    'Replacing Fillers with Silent Pauses',
    'Learn how to replace ''um'', ''uh'', and ''like'' with confident silent pauses that enhance authority.',
    2,
    15,
    '# Replacing Fillers with Silent Pauses

### Why Do We Say "Um" and "Uh"?

Vocalized fillers happen when your vocal cords stay engaged while your brain searches for the next word. We fear silence because we worry that an interlocutor might interrupt us or think we don''t know the answer.

However, in professional and academic speech, **silence is perceived as thoughtfulness and confidence**, while continuous filler words degrade perceived competence.

---

### The 3-Step Silent Pause Method

1. **Catch the Urge:** Notice the physical impulse to vocalize ("uuuh").
2. **Close Your Lips:** Bring your lips gently together and inhale through your nose.
3. **Release the Next Thought:** Speak only when the next chunk is formed in your mind.

> *"A silent pause of 1.5 seconds feels like an eternity to the speaker, but sounds authoritative and composed to the listener."*

---

### Practice Scenario: Interview Question

- **Filler Delivery:** *"So... um... when I worked at my previous company, like, we had this... uh... scaling issue."*
- **Polished Delivery:** *"[When I worked at my previous company] / [we encountered a significant scaling challenge]."*',
    '["Fillers occur when the brain searches for words while keeping vocal cords vibrating.", "A silent pause of 1-2 seconds sounds executive and composed.", "Close your lips and inhale gently to avoid vocalizing during transitions."]'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- Course 1 Module 2: Discourse Markers & Cohesion
INSERT INTO public.course_modules (id, course_id, title, description, order_index)
VALUES (
    '22222222-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'Discourse Markers & Seamless Transitions',
    'Equip your speech with structured transition phrases to lead listeners through your reasoning.',
    2
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, description, order_index, duration_minutes, content_markdown, key_takeaways, published)
VALUES (
    '33333333-1111-1111-1111-111111111113',
    '22222222-1111-1111-1111-111111111112',
    'Signposting Your Ideas',
    'Use clear verbal signposts to introduce points, compare perspectives, and conclude persuasively.',
    1,
    15,
    '# Signposting Your Ideas

Signposts are verbal roadmaps that tell the listener where your answer is going. Without them, even strong ideas can feel disjointed.

### Category Signposts to Master

| Purpose | High-Impact Signposts | Example |
| :--- | :--- | :--- |
| **Adding a Point** | *Furthermore, In addition to that, Beyond that* | *"Furthermore, this reduced server latency by 40%."* |
| **Contrasting** | *On the other hand, Conversely, Having said that* | *"Having said that, adoption took three extra weeks."* |
| **Emphasizing** | *Crucially, What matters most here is, Notably* | *"Crucially, customer retention remained steady."* |
| **Concluding** | *Ultimately, In short, The key takeaway is* | *"Ultimately, this decision aligned with our roadmap."*',
    '["Signposts guide your listener through complex explanations.", "Avoid repeating ''and then''; use targeted connectors like ''furthermore'' and ''ultimately''.", "Pause right after delivering a signpost to build anticipation."]'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- Course 2: Pronunciation & Articulation Mastery (Beginner)
INSERT INTO public.courses (id, title, slug, description, short_description, level, category, estimated_minutes, published)
VALUES (
    '11111111-2222-2222-2222-222222222222',
    'Pronunciation & Articulation Mastery',
    'pronunciation-and-articulation-mastery',
    'Target common pronunciation hurdles including vowel length contrasts, consonant cluster clarity, and syllable stress to speak clearly and intelligibly.',
    'Master vowel length contrasts, consonant clusters, and syllable stress for crisp clarity.',
    'BEGINNER',
    'Pronunciation & Articulation',
    35,
    true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, title, description, order_index)
VALUES (
    '22222222-2222-2222-2222-222222222221',
    '11111111-2222-2222-2222-222222222222',
    'Vowel Precision & Minimal Pairs',
    'Differentiate easily confused English vowels that alter the meaning of everyday workplace terms.',
    1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, description, order_index, duration_minutes, content_markdown, key_takeaways, published)
VALUES (
    '33333333-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222221',
    'Short vs Long Vowels: The /ɪ/ vs /iː/ Contrast',
    'Never confuse ''ship'' and ''sheep'' or ''fill'' and ''feel'' again.',
    1,
    15,
    '# Short vs Long Vowels: The /ɪ/ vs /iː/ Contrast

A frequent challenge for Indian English speakers is the distinction between tense (long) and lax (short) vowels.

### The Contrast
- **/iː/ (Long & Tense):** Tongue high and forward, lips slightly spread in a smile. (e.g. *sheep, feel, lead, leave*)
- **/ɪ/ (Short & Relaxed):** Tongue slightly lower, jaw relaxed, shorter acoustic duration. (e.g. *ship, fill, lid, live*)

### Common Workplace Minimal Pairs
- *"Please send the **sheet**."* vs *"Please take your **seat**."*
- *"We need to **fill** the position."* vs *"We **feel** confident."*
- *"The **live** demo"* vs *"Where do you **leave** the keys?"*',
    '["Long /iː/ requires tongue tension and slight lip retraction (smile position).", "Short /ɪ/ requires a relaxed jaw and tongue.", "Exaggerating the contrast in practice builds muscle memory."]'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- Exercise for Course 2 Lesson 1
INSERT INTO public.exercises (id, lesson_id, title, instruction, exercise_type, prompt_text, options, correct_answer, hints, rubric, order_index)
VALUES (
    '44444444-2222-2222-2222-222222222221',
    '33333333-2222-2222-2222-222222222221',
    'Minimal Pair Meaning Discrimination',
    'Select the sentence that uses the short lax vowel /ɪ/ as in "sit" or "fit".',
    'MULTIPLE_CHOICE',
    'Which option contains the short /ɪ/ vowel sound?',
    '[
        {"id": "A", "text": "Please provide your feedback on the spreadsheet.", "explanation": "Incorrect: ''sheet'' uses the long tense /iː/ vowel."},
        {"id": "B", "text": "We need to fix this software defect immediately.", "explanation": "Correct! ''fix'' (/fɪks/) uses the relaxed short /ɪ/ vowel."},
        {"id": "C", "text": "The executive team agreed to meet tomorrow.", "explanation": "Incorrect: ''meet'' uses the long tense /iː/ vowel."},
        {"id": "D", "text": "Can you hear the speaker clearly?", "explanation": "Incorrect: ''hear'' is a diphthong /ɪə/."}
    ]'::jsonb,
    'B',
    '["Focus on the vowel sound in ''fix'' compared to ''meet'' and ''sheet''."]'::jsonb,
    '{"type": "objective", "points": 100}'::jsonb,
    1
) ON CONFLICT (id) DO NOTHING;

-- Course 3: Workplace Communication & Executive Presence (Advanced)
INSERT INTO public.courses (id, title, slug, description, short_description, level, category, estimated_minutes, published)
VALUES (
    '11111111-3333-3333-3333-333333333333',
    'Workplace Communication & Executive Presence',
    'workplace-communication-and-executive-presence',
    'Communicate ideas concisely in meetings, answer behavioral interview questions with structured frameworks, and project authority with steady pacing.',
    'Structure concise answers using the PREP framework and project authority in meetings.',
    'ADVANCED',
    'Workplace Communication',
    40,
    true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.course_modules (id, course_id, title, description, order_index)
VALUES (
    '22222222-3333-3333-3333-333333333331',
    '11111111-3333-3333-3333-333333333333',
    'The PREP Framework for Crisp Answers',
    'Transform rambling explanations into crisp, structured executive statements.',
    1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, module_id, title, description, order_index, duration_minutes, content_markdown, key_takeaways, published)
VALUES (
    '33333333-3333-3333-3333-333333333331',
    '22222222-3333-3333-3333-333333333331',
    'Answering Directly with PREP',
    'Master the Point-Reason-Example-Point technique for impromptu questions.',
    1,
    20,
    '# Answering Directly with PREP

When asked unexpected questions in an interview or standup, most speakers start rambling while looking for their main idea.

The **PREP formula** gives you an instant mental structure:

### 1. Point (P)
State your bottom-line conclusion first.
> *"I recommend migrating our data pipeline to asynchronous message queues."*

### 2. Reason (R)
Explain the core justification in one clear sentence.
> *"Because under peak loads, synchronous HTTP requests timeout and drop customer events."*

### 3. Example (E)
Give one concrete metric, anecdote, or past observation.
> *"For instance, during last month''s flash sale, our ingestion error rate spiked to 8%."*

### 4. Point (P)
Restate your point with a forward-looking action.
> *"Therefore, moving to RabbitMQ will safeguard our data reliability."*',
    '["Lead with your conclusion (Bottom Line Up Front).", "Support with a single clear reason and one concrete example.", "End decisively without saying ''that''s pretty much it''."]'::jsonb,
    true
) ON CONFLICT (id) DO NOTHING;

-- Exercise for Course 3 Lesson 1
INSERT INTO public.exercises (id, lesson_id, title, instruction, exercise_type, prompt_text, options, correct_answer, hints, rubric, order_index)
VALUES (
    '44444444-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333331',
    'PREP Structure Ordering Challenge',
    'Identify which part of a PREP response corresponds to the Example stage.',
    'MULTIPLE_CHOICE',
    'In a response about adopting a new testing strategy, which statement functions as the concrete ''Example''?',
    '[
        {"id": "A", "text": "We should adopt automated integration tests across all microservices.", "explanation": "This is the initial Point (P)."},
        {"id": "B", "text": "Because manual verification slows down our deployment cadence by two days every sprint.", "explanation": "This is the Reason (R)."},
        {"id": "C", "text": "Last quarter on Service-A, adding automated contract tests caught 14 regression bugs before staging.", "explanation": "Correct! This provides the specific real-world evidence and metric for the Example (E)."},
        {"id": "D", "text": "Therefore, investing in testing will accelerate our release velocity.", "explanation": "This is the concluding Point restatement (P)."}
    ]'::jsonb,
    'C',
    '["Look for specific historical instances, dates, or quantitative metrics."]'::jsonb,
    '{"type": "objective", "points": 100}'::jsonb,
    1
) ON CONFLICT (id) DO NOTHING;

-- Course 4: Unpublished Draft Course (For verifying published filtering constraint)
INSERT INTO public.courses (id, title, slug, description, short_description, level, category, estimated_minutes, published)
VALUES (
    '11111111-4444-4444-4444-444444444444',
    'Executive Rhetoric & Persuasion (Draft)',
    'executive-rhetoric-and-persuasion-draft',
    'Advanced unpublished curriculum for rhetorical devices and high-stakes negotiation.',
    'Internal draft curriculum for high-stakes leadership persuasion.',
    'ADVANCED',
    'Workplace Communication',
    60,
    false
) ON CONFLICT (slug) DO NOTHING;
