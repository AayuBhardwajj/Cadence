# Cadence AI: Core Implementation & System Architecture

This document details the core implementation, system architecture, and AI model orchestration powering the Cadence application.

## 1. System Architecture Overview

Cadence is a full-stack AI-driven speech assessment and coaching platform.
- **Frontend:** React + TypeScript + Vite + Chakra UI + Framer Motion
- **Backend:** Python + FastAPI
- **Database / Auth:** Supabase (PostgreSQL)
- **AI/ML Layer:** OpenAI Whisper (Local) + Google Gemini 1.5 Flash (Cloud)

---

## 2. The AI Pipeline (How Models Are Used)

The core value of Cadence lies in its hybrid AI approach, utilizing two distinct models to process user speech and generate actionable feedback.

### Step 1: Speech-to-Text & Word Timing (OpenAI Whisper)
- **Model:** `whisper.base` (Running locally via Python)
- **Location:** `backend/services/audio_service.py`
- **Function:** When a user uploads a video/audio reading assessment, the backend passes the file to Whisper. 
- **Implementation:** Whisper transcribes the audio into verbatim text and extracts exact millisecond `start` and `end` timestamps for every single word spoken (`word_timestamps=True`). It also calculates basic metrics like Words Per Minute (WPM) and filler word counts.

### Step 2: Expert Linguistic Analysis (Google Gemini 1.5 Flash)
- **Model:** `gemini-1.5-flash` (via `google.generativeai` API)
- **Location:** `backend/services/analysis_service.py`
- **Function:** Acts as an expert Speech-Language Pathologist.
- **Implementation:** The transcript and the Whisper word-timing data are injected into a highly complex, meticulously prompt-engineered request. Gemini evaluates clarity, fluency, confidence, tone, structural grammar, pacing, and identifies specific mispronounced words. It is strictly constrained to return a complex, deeply-nested JSON object (the structured AMCAT schema).

### Step 3: Adaptive Learning & Generation (Google Gemini 1.5 Flash)
- **Model:** `gemini-1.5-flash`
- **Location:** `backend/services/recommendation_service.py`
- **Function:** Creates dynamic, personalized coaching exercises.
- **Implementation:** The system ranks the user's weaknesses (e.g., MTI or Grammar) and stores them in a Supabase `speech_profiles` table. Gemini is then prompted to generate short, engaging, 3-sentence speaking exercises specifically designed to target the user's top identified flaws. As the user completes exercises, their profile scores update, and the AI dynamically shifts its exercise curriculum (Adaptive Learning).

---

## 3. Data Flow: The Assessment Lifecycle

1. **Client Recording:** The React frontend captures a webm video/audio blob using the browser's MediaRecorder API and POSTs it to the FastAPI backend (`/api/assessment/upload`).
2. **Backend Processing:** 
   - `main.py` receives the file and triggers `audio_service.py` (Whisper).
   - The resulting text and timing data are passed to `analysis_service.py` (Gemini).
   - Gemini returns a comprehensive AMCAT-structured JSON payload.
   - `recommendation_service.py` generates specific user profiles and follow-up exercises.
3. **Database Sync:** The generated scores, history, and generated exercises are saved to Supabase Postgres tables (`profiles`, `user_exercise_history`, `exercise_recommendations`).
4. **Client Rendering:** The JSON payload is returned to the frontend, which meticulously renders the **AMCAT-Style Speech Assessment Report**.

---

## 4. Frontend Implementation: The AMCAT Report

**Location:** `src/components/assessment/AssessmentReport.tsx`

The frontend consumes the complex nested JSON from Gemini and renders an industry-standard, 8-page SHL/AMCAT Assessment Center Report.

### Report Structure:
1. **Candidate Dashboard:** 5 Core Dimensions (Pronunciation, Fluency, Intonation, Clarity, MTI) scored out of 100 with 🟢🟡🔴 color-coding rules, plus a CEFR English proficiency badge.
2. **Score Interpretation:** Breakdown of the scoring rubric.
3. **Insights Section:** Detailed definitions and specific, transcript-cited feedback for every dimension.
4. **MTI Deep Dive:** Highlights detected Mother Tongue Influence (L1 interference) via frequency sliders and behavioral bullet points (e.g., Retroflex consonant bleeding).
5. **Transcript Analysis:** A side-by-side comparison of the reference text versus the transcribed speech, complete with colored error-word highlighting and speech statistics.
6. **Word-Level Error Log:** A grouped, timestamped tabular log mapping every single mispronounced word to its correct IPA formatting and severity rating.
7. **Sentence Breakdown:** Micro-analysis grids detailing fluency drops and phonetic issues per spoken line.
8. **Learning Resources:** Output of the top 3 strengths, top 3 improvements, and actionable web/video resources perfectly mapped to the identified weaknesses.

### Tech Highlights:
- **Chakra UI:** Used for dense, structured grid/card layouts and typography.
- **Recharts:** Powers the dynamic "Performance Chakra" radar chart.
- **Print CSS:** Contains `@media print` directives forcing the dynamic DOM to cleanly paginate into 8 individual A4 sheets when exported to PDF.

---

## 5. Current Project Status

**The core implementation of the Cadence AI project is largely complete.**
- The full-stack pipeline (Recording -> Whisper -> Gemini -> Report) is fully wired and functional.
- The complex prompt schemas enforcing exact JSON returns from Gemini are implemented.
- The UI flawlessly renders the data structures.
- The Vite build configuration is optimized for production chunking.
