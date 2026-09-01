
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const CONTENT_SERVICE_URL = import.meta.env.VITE_CONTENT_SERVICE_URL || "http://localhost:8084";
const SESSION_SERVICE_URL = import.meta.env.VITE_SESSION_SERVICE_URL || "http://localhost:8082";
const REPORT_SERVICE_URL = import.meta.env.VITE_REPORT_SERVICE_URL || "http://localhost:8083";
const PRACTICE_GAME_SERVICE_URL = import.meta.env.VITE_PRACTICE_GAME_SERVICE_URL || "http://localhost:8085";

export interface AnalysisResult {
    overall_score: number;
    cefr_level: string;
    breakdown: {
        fluency: number;
        pronunciation: number;
        clarity: number;
        grammar: number;
        vocabulary: number;
        confidence: number;
        wpm: number;
        fillers: number;
        eye_contact: number;
    };
    strengths: string[];
    focus_areas: string[];
    feedback: string;
    transcription: string;
    deep_analysis?: {
        clarity_fluency: string;
        confidence_tone: string;
        pronunciation_details: {
            mispronounced_words: string[];
            struggled_sounds: string[];
        };
        grammar_vocabulary: string;
        pacing_control: string;
        action_plan: Array<{
            weakness: string;
            example: string;
            tip: string;
        }>;
    };

    // AMCAT-Style Assessment Report Data
    amcat_metrics?: {
        pronunciation: { score: number; consonant: number; vowel: number; stress: number; };
        fluency: { score: number; rate: number; pause: number; fillers: number; };
        intonation: { score: number; sentence: number; rise_fall: number; pitch: number; };
        clarity: { score: number; end_consonants: number; enunciation: number; pace: number; };
        mti: { score: number; l1_interference: number; retroflex: number; vowel_shift: number; };
        relevancy?: { score: number; feedback: string; };
    };
    amcat_insights?: Array<{
        dimension: string;
        score: number;
        definition: string;
        feedback: string;
    }>;
    amcat_mti_deep_dive?: {
        detected_accent: string;
        patterns: Array<{
            name: string;
            frequency: number; // 0 to 100
            behaviors: string[];
        }>;
    };
    amcat_transcript?: {
        reference_text: string;
        user_text: string;
        error_words: Array<{ word: string; severity: "minor" | "moderate" | "major"; type: string; }>;
        stats: {
            total_words: number;
            speech_rate_wpm: number;
            ideal_wpm_range: string;
            total_sentences: number;
            avg_sentence_duration: number;
            longest_pause: number;
            filler_count: number;
        };
        error_summary: {
            mispronunciation: number;
            vocabulary_errors?: number;
            stutters: number;
            unnatural_pauses: number;
            filler_words: number;
            mti_substitutions: number;
        };
    };
    amcat_error_log?: Array<{
        timestamp: string;
        word: string;
        said_as: string;
        correct_ipa: string;
        error_type: string;
        severity: "minor" | "moderate" | "major";
        category: "Pronunciation" | "Fluency" | "MTI" | "Grammar" | "Style";
    }>;
    amcat_sentences?: Array<{
        text: string;
        pronunciation_issues: string;
        fluency: string;
        mti_detected: string;
        rhythm: string;
        intonation: string;
    }>;
    amcat_summary?: {
        top_strengths: string[];
        top_improvements: string[];
        learning_resources: Array<{
            area: string;
            items: Array<{ title: string; type: "Free" | "Paid" | "YouTube" | "Web"; }>;
        }>;
    };
    improvement_plan?: Record<string, { focus: string; exercise: string; daily_minutes: number; }>;
    practice_exercises?: Array<{ title: string; description: string; duration_minutes: number; }>;
    grammar_errors?: Array<{ original: string; corrected: string; rule: string; }>;
    next_topic_suggestion?: string;
    api_error?: boolean;
}

export interface EligibilityResponse {
    can_assess: boolean;
    next_available_at: string | null;
    assessments_remaining: number;
}

export interface SpeechProfile {
    weakness_priority_1: string;
    weakness_priority_2: string;
    weakness_priority_3: string;
    current_scores: Record<string, number>;
    identified_issues: Record<string, string[]>;
    learning_pace: string;
}

export interface Recommendation {
    id: string;
    priority_rank: number;
    personalization_context: {
        why: string;
        focus_items: string[];
        dynamic_prompt?: string;
    };
    template: {
        title: string;
        description: string;
        skill_category: string;
        difficulty_level: string;
        estimated_duration_minutes: number;
    };
    status: 'not_started' | 'in_progress' | 'completed';
}

export const checkEligibility = async (userId: string): Promise<EligibilityResponse> => {
    const response = await fetch(`${API_URL}/api/assessment/eligibility?user_id=${userId}`);
    if (!response.ok) throw new Error("Failed to check eligibility");
    return await response.json();
};

export const startAssessment = async (userId: string): Promise<{ sessionId: string }> => {
    const response = await fetch(`${API_URL}/api/assessment/start?user_id=${userId}`, {
        method: "POST"
    });
    if (!response.ok) throw new Error("Failed to start assessment");
    return await response.json();
};

export const getRecommendations = async (userId: string): Promise<{ profile: SpeechProfile; recommendations: Recommendation[] }> => {
    const response = await fetch(`${API_URL}/api/recommendations?user_id=${userId}`);
    if (!response.ok) throw new Error("Failed to fetch recommendations");
    return await response.json();
};

export const uploadFullAssessment = async (
    videoBlob: Blob,
    userId: string,
    sessionId: string,
    topicId: string,
    duration: number
): Promise<{ sessionId: string; status: string; storagePath?: string }> => {
    const formData = new FormData();
    formData.append("file", videoBlob, "recording.webm");

    const response = await fetch(
        `${SESSION_SERVICE_URL}/api/assessment/upload?userId=${userId}&sessionId=${sessionId}&topicId=${topicId}&duration=${duration}`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
    }

    return await response.json();
};

export const fetchAssessmentReport = async (sessionId: string): Promise<AnalysisResult> => {
    const response = await fetch(`${REPORT_SERVICE_URL}/api/assessment/results/${sessionId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status}`);
    }
    const data = await response.json();
    const transcription = data.transcription ?? '';
    const words = transcription.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const amcatMetrics = data.amcat_metrics || {
        pronunciation: { score: data.pronunciation_score ?? 0, consonant: 0, vowel: 0, stress: 0 },
        fluency: { score: data.fluency_score ?? 0, rate: 0, pause: 0, fillers: 0 },
        clarity: { score: data.clarity_score ?? 0, end_consonants: 0, enunciation: 0, pace: 0 },
        intonation: { score: 0, sentence: 0, rise_fall: 0, pitch: 0 },
        mti: { score: 0, l1_interference: 0, retroflex: 0, vowel_shift: 0 },
        relevancy: { score: 0, feedback: '' },
    };

    const amcatSummary = data.amcat_summary || {
        top_strengths: data.strengths ?? [],
        top_improvements: data.focus_areas ?? [],
        learning_resources: [],
    };

    const errorLog = data.amcat_error_log || undefined;
    const sentences = data.amcat_sentences || undefined;

    const amcatTranscript = {
        reference_text: '',
        user_text: transcription,
        error_words: [],
        stats: {
            total_words: wordCount,
            speech_rate_wpm: data.wpm ?? 0,
            ideal_wpm_range: '130-150',
            total_sentences: sentences ? sentences.length : 0,
            avg_sentence_duration: 0,
            longest_pause: 0,
            filler_count: data.filler_word_count ?? 0,
        },
        error_summary: {
            mispronunciation: errorLog ? errorLog.filter((e: any) => e.category === 'Pronunciation').length : 0,
            stutters: errorLog ? errorLog.filter((e: any) => e.category === 'Fluency' && e.said_as?.includes('Stutter')).length : 0,
            unnatural_pauses: 0,
            filler_words: data.filler_word_count ?? 0,
            mti_substitutions: errorLog ? errorLog.filter((e: any) => e.category === 'MTI').length : 0,
        },
    };

    return {
        overall_score: data.overall_score ?? 0,
        cefr_level: data.cefr_level ?? 'B1',
        breakdown: {
            fluency: data.fluency_score ?? 0,
            pronunciation: data.pronunciation_score ?? 0,
            clarity: data.clarity_score ?? 0,
            grammar: data.grammar_score ?? 0,
            vocabulary: data.vocabulary_score ?? 0,
            confidence: data.confidence_score ?? 0,
            wpm: data.wpm ?? 0,
            fillers: data.filler_word_count ?? 0,
            eye_contact: data.eye_contact_score ?? 0,
        },
        strengths: data.strengths || [],
        focus_areas: data.focus_areas || [],
        feedback: data.feedback || '',
        transcription: transcription,

        amcat_metrics: amcatMetrics,
        amcat_insights: data.amcat_insights || undefined,
        amcat_mti_deep_dive: data.amcat_mti_deep_dive || undefined,
        amcat_transcript: amcatTranscript,
        amcat_error_log: errorLog,
        amcat_sentences: sentences,
        amcat_summary: amcatSummary,
        improvement_plan: data.improvement_plan || undefined,
        practice_exercises: data.practice_exercises || undefined,
        grammar_errors: data.grammar_errors || undefined,
        next_topic_suggestion: data.next_topic_suggestion || undefined,
    };
};


export const uploadVideoForAnalysis = async (videoBlob: Blob): Promise<AnalysisResult> => {
    // Keep old version for quick practice if needed, but update signature
    const formData = new FormData();
    formData.append("file", videoBlob, "recording.webm");
    const response = await fetch(`${API_URL}/analyze`, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Analysis failed");
    return await response.json();
};
export const completeExercise = async (
    userId: string,
    exerciseId: string,
    category: string,
    score: number,
    issuesResolved: string[] = []
): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${API_URL}/api/exercises/complete?user_id=${userId}&exercise_id=${exerciseId}&category=${category}&score=${score}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issuesResolved)
    });
    if (!response.ok) throw new Error("Failed to complete exercise");
    return await response.json();
};

export const apiClient = {
  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${CONTENT_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as T;
  }
};

export interface PracticeSessionResponse {
    sessionId: string;
    userId: string;
    bucket: string;
    status: string;
    createdAt: string;
}

export interface DrillAttemptApiResponse {
    id: string;
    practiceSessionId: string;
    targetText: string;
    transcribedText: string;
    isMatch: boolean;
    wer: number;
    attemptNumber: number;
    createdAt: string;
}

export interface CompletePracticeSessionApiResponse {
    sessionId: string;
    status: string;
    completedAt: string;
}

export const startPracticeSession = async (userId: string, bucket: string): Promise<PracticeSessionResponse> => {
    const response = await fetch(`${PRACTICE_GAME_SERVICE_URL}/api/practice/session?user_id=${encodeURIComponent(userId)}&bucket=${encodeURIComponent(bucket)}`, {
        method: "POST"
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Failed to start practice session" }));
        throw new Error(err.detail || "Failed to start practice session");
    }
    return await response.json();
};

export const submitDrillAttempt = async (
    practiceSessionId: string,
    targetText: string,
    attemptNumber: number,
    audioBlob: Blob
): Promise<DrillAttemptApiResponse> => {
    const formData = new FormData();
    formData.append("practiceSessionId", practiceSessionId);
    formData.append("targetText", targetText);
    formData.append("attemptNumber", attemptNumber.toString());
    formData.append("file", audioBlob, "drill.webm");

    const response = await fetch(`${PRACTICE_GAME_SERVICE_URL}/api/practice/attempt`, {
        method: "POST",
        body: formData
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Failed to submit drill attempt" }));
        throw new Error(err.detail || "Failed to submit drill attempt");
    }
    return await response.json();
};

export const completePracticeSession = async (practiceSessionId: string): Promise<CompletePracticeSessionApiResponse> => {
    const response = await fetch(`${PRACTICE_GAME_SERVICE_URL}/api/practice/session/${practiceSessionId}/complete`, {
        method: "POST"
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Failed to complete practice session" }));
        throw new Error(err.detail || "Failed to complete practice session");
    }
    return await response.json();
};

