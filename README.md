# Fluently - AI-Powered Speech & Communication Platform

## Project Overview
Fluently is a comprehensive web-based speech improvement application that helps users overcome three major communication challenges in English:
1. **Stuttering/Stammering** - Involuntary speech disfluencies
2. **Accent Interference** - Regional accent patterns affecting English pronunciation (especially for non-native speakers from Bihar, Haryana, Punjab, Tamil Nadu, etc.)
3. **Word Retrieval Issues** - Difficulty finding appropriate English words while speaking, causing hesitations and speech breaks

Using AI-powered analysis of both video (facial expressions, lip movements) and audio (speech patterns, pronunciation, fluency), the platform identifies specific problems and provides personalized practice modules with real-time feedback.

## Core Problem We're Solving

### Problem 1: Stuttering/Stammering
- Traditional speech therapy is expensive (₹1000-3000 per session in India)
- Inconsistent practice between therapy sessions
- Lack of objective progress measurement
- Social stigma prevents people from seeking help

### Problem 2: Accent & Pronunciation Barriers (NEW)
- **Regional accent interference**: Students from Bihar, Haryana, UP, Punjab, and other states often carry strong mother-tongue influences (Hindi, Punjabi, Bhojpuri, Haryanvi, etc.) that affect English pronunciation
- **Common issues**:
  - "v/w" confusion: "very" → "wery" (common in Hindi/Punjabi speakers)
  - "th" sound difficulties: "think" → "tink" or "sink"
  - Retroflex sounds: Hindi ट/ड affecting English "t/d"
  - Wrong word stress: "PHO-to-graph" → "pho-TO-graph"
  - Consonant cluster problems: "school" → "ischool"
- **Impact**: Affects job interviews, presentations, campus placements, international communication
- **Current solutions are inadequate**: Generic accent reduction apps don't understand Indian language-specific issues

### Problem 3: Lexical Access Issues (Word Finding Difficulty) (NEW)
- **Non-native speakers** often know what they want to say but can't retrieve the English word quickly
- Results in:
  - Long pauses mid-sentence
  - Excessive filler words ("uh", "um", "like", "basically")
  - Code-switching (mixing Hindi/regional language with English)
  - Simplified vocabulary to avoid words they're unsure of
  - Lost confidence in professional settings
- **Root causes**: Limited vocabulary exposure, L1 interference, pressure/anxiety
- **Current gap**: No tools specifically address word retrieval speed in conversational contexts

## Target Users
1. **College students** from non-metro cities preparing for placements, presentations, group discussions
2. **Young professionals** who face communication barriers in corporate environments
3. **Individuals who stutter** seeking affordable practice tools
4. **Non-native English speakers** wanting to reduce accent interference
5. **Speech-Language Pathologists (SLPs)** (future) needing patient monitoring tools

---

## Key Features (MVP → Advanced)

### Phase 1: Core Multi-Modal Analysis (MVP)

#### Recording Interface
- **Video + Audio Recording**: Users read a provided paragraph or speak spontaneously while being recorded
- **Multiple Practice Modes**:
  - Paragraph reading (controlled text)
  - Picture description (tests vocabulary and spontaneous speech)
  - Topic-based speaking (tests word retrieval under pressure)
- **Live feedback indicators**: Visual cues for volume, pace

#### AI-Powered Analysis (Three-Pronged Approach)

**1. Stuttering/Disfluency Detection**
- Computer vision (OpenCV/MediaPipe) detects:
  - Facial tension (jaw clenching, lip pursing)
  - Secondary behaviors (eye blinking, head movements)
  - Physical struggle during speech blocks
- Speech analysis identifies:
  - Repetitions: "I-I-I want"
  - Prolongations: "Sssssomething"
  - Blocks: Silent pauses with visible struggle
  - Interjections: "um", "uh", "like"
- **Timestamps** for each disfluency event

**2. Accent & Pronunciation Analysis (NEW)**
- **Native Language Detection**: AI identifies likely mother tongue (Hindi, Punjabi, Tamil, Bengali, etc.) based on pronunciation patterns
- **Phoneme-Level Analysis**:
  - Detects mispronunciations specific to Indian languages
  - Examples detected:
    - "v/w" substitution (Hindi/Punjabi pattern)
    - Missing "th" sounds (replaced with "t", "d", or "s")
    - Incorrect retroflex usage
    - Aspirated consonants where not needed
  - Compares user's pronunciation to native English phonemes
- **Stress Pattern Analysis**:
  - Identifies incorrect word stress (common in Hindi speakers who apply different stress rules)
  - Example: "development" with wrong syllable emphasis
- **Intonation Analysis**:
  - Flat intonation patterns vs. English prosody
  - Rising/falling tone issues in questions

**3. Lexical Access Analysis (Word Retrieval) (NEW)**
- **Pause Detection**:
  - Identifies unnatural pauses (>800ms) within sentences
  - Distinguishes between "thinking pauses" and "searching for words" pauses using context
- **Filler Word Tracking**:
  - Counts "um", "uh", "like", "basically", "actually"
  - Identifies language-specific fillers ("matlab", "yaar", "basically")
- **Code-Switching Detection**:
  - Spots Hindi/regional language words mixed in English sentences
  - Example: "I was going to the *dukaan* to buy..."
- **Vocabulary Complexity Analysis**:
  - Measures lexical diversity (unique words / total words)
  - Identifies overuse of simple words when complex alternatives exist
- **Semantic Coherence**:
  - Checks if word choices match context (potential wrong word retrieval)

#### Comprehensive Analysis Report

Users receive a detailed report with:

**Summary Card**
- Overall fluency score (0-100)
- Accent clarity score (0-100)
- Vocabulary fluency score (0-100)
- Speech rate (words per minute)
- Total speaking time vs. pause time

**Stuttering Section** (if detected)
- Timeline visualization of disfluency events
- Breakdown by type (repetitions: X%, prolongations: Y%, blocks: Z%)
- Specific problem words/phonemes
- Facial tension heatmap overlaid on video

**Pronunciation Section** (NEW)
- **Detected native language influence**: "Your speech patterns suggest Hindi/Punjabi as first language"
- **Problem sounds ranked by frequency**:
  - "th" sound (detected 12 times): "think" → "tink", "father" → "fader"
  - "v/w" confusion (detected 8 times): "very" → "wery"
  - Word stress errors (detected 5 times): List of words with incorrect stress
- **Audio comparison**: Side-by-side waveform of user's pronunciation vs. native speaker
- **Visual mouth position guide**: Shows correct tongue/lip position for problem sounds

**Word Retrieval Section** (NEW)
- **Pause analysis**:
  - Total pauses: 23 (15 normal, 8 problematic)
  - Average pause duration: 1.2 seconds
  - Longest pause: 3.4 seconds at [timestamp] before word "___"
- **Filler word usage**:
  - "um/uh": 18 times (reduce to <5 for fluent speech)
  - "like": 12 times
  - "basically": 7 times
- **Code-switching instances**: 
  - Switched to Hindi 4 times (list with timestamps)
- **Vocabulary metrics**:
  - Lexical diversity: 45% (target: >60%)
  - Average word length: 4.2 characters (target: 5+ for academic/professional speech)
  - Overused simple words: "good" (8x), "nice" (6x), "thing" (5x)

**Actionable Recommendations**
- **For stuttering**: "Try easy onset technique for 'k' sounds" with video tutorial link
- **For accent**: "Practice 'th' sound daily - tongue between teeth" with exercises
- **For word retrieval**: "Build synonyms for overused words: good → excellent, beneficial, valuable"

### Phase 2: Personalized Practice Modules

#### Accent-Specific Training (NEW)
- **Minimal pairs exercises**: Practice words that differ by one sound
  - "very" vs "wary" (for v/w confusion)
  - "think" vs "sink" (for th sounds)
- **Tongue position videos**: Animated guides showing exact mouth movements
- **Regional accent-specific modules**:
  - "Hindi speaker's guide to English 'th'"
  - "Punjabi speaker's guide to English stress patterns"
  - "Tamil speaker's guide to consonant clusters"
- **Progressive difficulty**: Sounds → Words → Phrases → Sentences → Conversation

#### Vocabulary Building for Word Retrieval (NEW)
- **Context-based word lists**: Based on user's hesitation patterns
  - If user paused before describing something as "good", suggest alternatives: excellent, superb, outstanding, remarkable
- **Synonym chains**: Build word associations to strengthen retrieval pathways
- **Situational vocabulary**: Job interview words, presentation words, casual conversation words
- **Spaced repetition system**: Words reappear at optimal intervals for retention
- **Active recall exercises**: 
  - "Describe this image using: ___" (forces use of specific vocabulary)
  - Timed speaking challenges to build retrieval speed

#### Stuttering-Specific Exercises (Original)
- Custom word lists focusing on problem phonemes
- Breathing exercises with visual pacing guides
- Progressive text difficulty (words → phrases → paragraphs)
- Techniques library: Easy onset, light contact, continuous phonation

#### Real-time Practice Mode
- **Live accent feedback**: Color-coded pronunciation as you speak (green = good, yellow = close, red = needs work)
- **Word suggestion prompts**: When user pauses, AI suggests possible words based on context
- **Pacing metronome**: Visual breathing guide, speech rate target
- **Instant correction**: "You said 'wery' - try 'very' with bottom lip on top teeth"

### Phase 3: Progress Tracking & Insights

- **Multi-dimensional progress charts**:
  - Fluency score trend over time
  - Accent clarity improvement (per phoneme)
  - Word retrieval speed (average pause duration decreasing)
  - Vocabulary diversity growth
- **Problem area tracking**:
  - Which sounds are improving fastest
  - Which words still cause retrieval delays
  - Stuttering frequency reduction
- **Streak system**: Encourage daily practice
- **Comparative analytics**: "Your 'th' pronunciation improved 40% in 2 weeks"

### Phase 4: Advanced Features (Future)

#### AI Conversation Practice
- **Situational role-plays**:
  - Job interview simulation (tests all three areas under pressure)
  - Presentation practice with Q&A
  - Casual conversation (tests natural word retrieval)
  - Debate/argument scenarios
- **AI adapts to user's level**: Asks follow-up questions, introduces new vocabulary
- **Real-time intervention**: AI pauses and says "Try rephrasing that with clearer pronunciation" or "Take a breath, no rush"

#### Accent Neutralization Mode
- **Target accent selection**: "I want to sound more American/British/Neutral"
- **Prosody training**: Match native speaker's rhythm, stress, intonation
- **Shadowing exercises**: Repeat immediately after native speaker audio

#### Vocabulary Immersion
- **Daily word challenges**: Learn and use 5 new words in conversation
- **Context-rich exposure**: Short stories, news articles with vocabulary highlighting
- **Retrieval games**: Timed word association, synonym matching

#### Community Features
- **Anonymous practice partners**: Match with others working on similar issues
- **Regional support groups**: "Hindi speakers improving English pronunciation"
- **Progress sharing**: Celebrate milestones without revealing identity

#### SLP Dashboard (Professional Tool)
- Monitor multiple patients/students
- Assign customized exercises
- Review session recordings
- Generate progress reports for institutional use

---

## Technical Architecture

### Frontend Stack
- **Framework**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (accessible, customizable)
- **Animations**: Framer Motion + Lottie
- **State Management**: Zustand (lightweight, perfect for real-time features)
- **Audio/Video**:
  - MediaRecorder API (recording)
  - WaveSurfer.js (waveform visualization)
  - Web Audio API (real-time audio analysis)
- **Charts**: Recharts (progress visualization)
- **Router**: React Router v6
- **Package Manager**: pnpm

### Backend Stack
- **Framework**: FastAPI (Python) - async, fast, type-safe
- **Database**: PostgreSQL (user data, sessions, progress)
- **Cache**: Redis (analysis results, session state)
- **File Storage**: AWS S3 / Cloudflare R2 (video/audio recordings)
- **Task Queue**: Celery (async analysis processing)
- **WebSocket**: For real-time feedback during practice

### AI/ML Components

#### 1. Stuttering/Disfluency Detection

**Computer Vision**
- **MediaPipe Face Mesh**: 468 3D facial landmarks
  - Track jaw movement (landmarks 61, 291, 17, 0)
  - Lip tension (landmarks around mouth region)
  - Eye blink rate (upper/lower eyelid distance)
  - Head pose (roll, pitch, yaw - secondary behaviors)
- **OpenCV**: Image preprocessing, landmark visualization

**Speech Analysis**
- **Whisper (OpenAI)**: Speech-to-text with word-level timestamps
- **Custom Disfluency Classifier**: 
  - Fine-tuned Wav2Vec 2.0 model on SEP-28k stuttering dataset
  - Classifies: repetitions, prolongations, blocks, interjections
  - Input: Audio features (MFCCs, spectrograms)
  - Output: Disfluency type + confidence + timestamp
- **Acoustic Features** (LibROSA):
  - Pitch contours (abnormal patterns during blocks)
  - Intensity (energy drops during stuttering)
  - Voice breaks (zero-crossing rate)

#### 2. Accent & Pronunciation Analysis (NEW)

**Phoneme Recognition**
- **Montreal Forced Aligner** or **Kaldi**: 
  - Aligns transcript to audio at phoneme level
  - Provides exact timestamps for each sound
  - Example: "think" → /θ/ /ɪ/ /ŋ/ /k/ with timestamps
- **Phoneme Comparison**:
  - Compare user's phonemes to expected English phonemes
  - Calculate acoustic distance (MFCCs, formants)
  - Flag substitutions, deletions, additions

**Native Language Identification**
- **Accent Classification Model**:
  - Custom CNN trained on Indian English accent corpus
  - Identifies: Hindi, Punjabi, Tamil, Telugu, Bengali, Marathi, etc.
  - Features: Prosody patterns, phoneme substitution patterns, rhythm
- **Language-Specific Error Patterns**:
  - Hindi/Punjabi: v/w confusion, th→t/d, retroflex influence
  - Tamil: Lack of aspiration, different vowel system
  - Bengali: v→b substitution, different stress patterns

**Stress & Intonation Analysis**
- **Praat-parselmouth**: 
  - Extract pitch contours (F0)
  - Identify stressed syllables (higher pitch + intensity + duration)
  - Compare to dictionary stress patterns
- **Prosody Scoring**:
  - Flatness index (lack of pitch variation)
  - Question intonation patterns (rising tone)
  - Sentence-level rhythm

**Acoustic-Phonetic Features**
- **Formant Analysis** (F1, F2, F3):
  - Vowel quality comparison (are vowels in correct acoustic space?)
  - Example: Hindi speakers often don't distinguish "cat" /æ/ vs "cut" /ʌ/
- **Voice Onset Time (VOT)**:
  - Measures aspiration in consonants
  - Hindi has different VOT patterns than English

#### 3. Lexical Access & Word Retrieval Analysis (NEW)

**Pause Detection & Classification**
- **Silero VAD (Voice Activity Detection)**:
  - Segments audio into speech/silence
  - Identifies pause locations and durations
- **Pause Classifier**:
  - Normal pauses: Breath pauses, clause boundaries (expected)
  - Word-search pauses: Mid-clause hesitations with context mismatch
  - Features: Duration, location in sentence, surrounding words, facial expressions (furrowed brow = thinking)

**Filler Word Detection**
- **Whisper transcription** + **Rule-based filtering**:
  - Extract: "um", "uh", "er", "like", "basically", "actually", "you know"
  - Regional fillers: "matlab", "yaar", "bas" (code-mixing)
- **Frequency analysis**: Count per minute, compare to fluent speaker baseline (<2/min)

**Code-Switching Detection**
- **Language ID model** (fastText or IndicBERT):
  - Detects non-English words in transcript
  - Flags Hindi/regional language insertions
- **Context analysis**: Is code-switch due to word retrieval failure?

**Vocabulary Analysis**
- **Lexical Diversity Metrics**:
  - Type-Token Ratio (TTR): unique words / total words
  - Moving Average TTR (MATTR): More stable for longer texts
  - Vocd-D: Sophisticated diversity measure
- **Word Frequency Analysis**:
  - Compare against academic/professional word lists (AWL, COCA)
  - Identify overuse of high-frequency simple words
- **Semantic Coherence**:
  - Use sentence transformers (e.g., all-MiniLM-L6-v2) to check if word choices make sense in context
  - Flag potential malapropisms or wrong word retrievals

**Retrieval Speed Modeling**
- **Baseline establishment**: First 3 sessions establish user's normal pause patterns
- **Anomaly detection**: Flag pauses significantly longer than baseline
- **Context prediction**: Use GPT-3.5/4 to predict likely next word, compare to actual word used (detects vocabulary avoidance)

---

## Data Flow Architecture

### Recording & Analysis Pipeline
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER RECORDING                                               │
│    - Video: 720p, H.264, 30fps                                  │
│    - Audio: 48kHz, mono, AAC                                    │
│    - Duration: 1-5 minutes                                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. UPLOAD TO CLOUD STORAGE (S3/R2)                              │
│    - Generate unique session ID                                 │
│    - Store: video_url, audio_url, metadata                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. TRIGGER ASYNC ANALYSIS (Celery Task Queue)                   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3a. VIDEO ANALYSIS PIPELINE                          │   │
│    │     - Extract frames (5 fps)                         │   │
│    │     - MediaPipe: 468 facial landmarks per frame      │   │
│    │     - Calculate:                                     │   │
│    │       • Jaw tension score (landmark distances)       │   │
│    │       • Lip movement patterns                        │   │
│    │       • Eye blink frequency                          │   │
│    │       • Head pose (secondary behaviors)              │   │
│    │     - Output: tension_timeline.json                  │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3b. AUDIO TRANSCRIPTION                              │   │
│    │     - Whisper API: Generate transcript               │   │
│    │     - Output: words with timestamps                  │   │
│    │       [{"word": "hello", "start": 0.5, "end": 0.8}] │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3c. PHONEME-LEVEL ALIGNMENT                          │   │
│    │     - Montreal Forced Aligner                        │   │
│    │     - Input: Audio + Transcript                      │   │
│    │     - Output: Phoneme timestamps                     │   │
│    │       "think" → /θ/(0.5-0.6) /ɪ/(0.6-0.65)...       │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3d. DISFLUENCY DETECTION (Stuttering)                │   │
│    │     - Custom Wav2Vec 2.0 model                       │   │
│    │     - Classify each audio segment:                   │   │
│    │       • Repetition, Prolongation, Block, Normal      │   │
│    │     - Output: disfluencies.json                      │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3e. PRONUNCIATION ANALYSIS (NEW)                     │   │
│    │     - Extract acoustic features (MFCCs, formants)    │   │
│    │     - Compare user phonemes to reference English     │   │
│    │     - Calculate acoustic distance                    │   │
│    │     - Identify substitutions: θ→t, v→w, etc.         │   │
│    │     - Stress pattern analysis (Praat)                │   │
│    │     - Output: pronunciation_errors.json              │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3f. NATIVE LANGUAGE DETECTION (NEW)                  │   │
│    │     - Accent classification CNN                      │   │
│    │     - Input: Prosody features, error patterns        │   │
│    │     - Output: {language: "Hindi", confidence: 0.87}  │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3g. PAUSE & FILLER ANALYSIS (NEW)                    │   │
│    │     - Silero VAD: Detect silence regions             │   │
│    │     - Classify pauses (normal vs. word-search)       │   │
│    │     - Extract filler words from transcript           │   │
│    │     - Detect code-switching (language ID)            │   │
│    │     - Output: lexical_issues.json                    │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3h. VOCABULARY ANALYSIS (NEW)                        │   │
│    │     - Calculate TTR, MATTR, Vocd-D                   │   │
│    │     - Word frequency analysis                        │   │
│    │     - Identify overused simple words                 │   │
│    │     - Semantic coherence check (sentence embeddings) │   │
│    │     - Output: vocabulary_metrics.json                │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
│    ┌──────────────────────────────────────────────────────┐   │
│    │ 3i. SYNTHESIS & RECOMMENDATION ENGINE               │   │
│    │     - Combine all analysis outputs                   │   │
│    │     - Calculate composite scores                     │   │
│    │     - Generate personalized recommendations          │   │
│    │     - Identify focus areas                           │   │
│    │     - Output: final_report.json                      │   │
│    └──────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. STORE RESULTS                                                │
│    - PostgreSQL: Structured metrics, session metadata           │
│    - Redis: Cache report for fast retrieval                     │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. NOTIFY FRONTEND (WebSocket)                                  │
│    - Send "analysis_complete" event                             │
│    - Frontend fetches and displays report                       │
└─────────────────────────────────────────────────────────────────┘
```

### Real-Time Practice Mode Flow
```
┌─────────────────────────────────────────────────────────────────┐
│ USER SPEAKS → Browser captures audio chunks (100ms intervals)   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓ (WebSocket stream)
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND REAL-TIME ANALYSIS                                      │
│    - Silero VAD: Speech/silence detection                       │
│    - Whisper (streaming mode): Partial transcription            │
│    - Quick phoneme check: Is pronunciation close enough?        │
│    - Pause timer: Is user stuck finding a word?                 │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ↓ (WebSocket response, <200ms latency)
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND VISUAL FEEDBACK                                        │
│    - Green/Yellow/Red pronunciation indicator                   │
│    - Word suggestion if pause >2 seconds                        │
│    - Breathing guide animation                                  │
│    - Encouragement messages                                     │
└─────────────────────────────────────────────────────────────────┘
```
