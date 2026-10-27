
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CONTENT_SERVICE_URL =
    import.meta.env.VITE_CONTENT_SERVICE_URL || 'http://localhost:8084';
const SESSION_SERVICE_URL =
    import.meta.env.VITE_SESSION_SERVICE_URL || 'http://localhost:8082';
const REPORT_SERVICE_URL =
    import.meta.env.VITE_REPORT_SERVICE_URL || 'http://localhost:8083';
const PRACTICE_GAME_SERVICE_URL =
    import.meta.env.VITE_PRACTICE_GAME_SERVICE_URL || 'http://localhost:8085';

/* -------------------------------------------------------------------------- */
/* Shared HTTP and authentication helpers                                     */
/* -------------------------------------------------------------------------- */

async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {};

    try {
        const {
            data: { session },
            error,
        } = await supabase.auth.getSession();

        if (error) {
            throw new Error(`Unable to retrieve authentication session: ${error.message}`);
        }

        const accessToken = session?.access_token?.trim();

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }
    } catch (error) {
        // Do not silently swallow auth failures. The caller can decide how
        // to handle a missing session or failed token retrieval.
        if (error instanceof Error) {
            throw error;
        }

        throw new Error('Unable to retrieve authentication session.');
    }

    return headers;
}

async function getErrorMessage(response: Response): Promise<string> {
    const body = await response.text().catch(() => '');

    if (!body.trim()) {
        return response.statusText || 'No error details returned by the server.';
    }

    try {
        const parsed: unknown = JSON.parse(body);

        if (typeof parsed === 'string') {
            return parsed;
        }

        if (parsed && typeof parsed === 'object') {
            const value = parsed as Record<string, unknown>;

            for (const key of ['message', 'detail', 'error', 'title']) {
                if (typeof value[key] === 'string' && value[key]) {
                    return value[key] as string;
                }
            }
        }
    } catch {
        // The server returned plain text rather than JSON.
    }

    return body;
}

async function requestJson<T>(
    url: string,
    init: RequestInit = {}
): Promise<T> {
    const response = await fetch(url, init);

    if (!response.ok) {
        const message = await getErrorMessage(response);

        throw new Error(
            `HTTP ${response.status} ${response.statusText || ''}`.trim() +
            `: ${message}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}

/* -------------------------------------------------------------------------- */
/* Assessment result types                                                    */
/* -------------------------------------------------------------------------- */

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

    amcat_metrics?: {
        pronunciation: {
            score: number;
            consonant: number;
            vowel: number;
            stress: number;
        };
        fluency: {
            score: number;
            rate: number;
            pause: number;
            fillers: number;
        };
        intonation: {
            score: number;
            sentence: number;
            rise_fall: number;
            pitch: number;
        };
        clarity: {
            score: number;
            end_consonants: number;
            enunciation: number;
            pace: number;
        };
        mti: {
            score: number;
            l1_interference: number;
            retroflex: number;
            vowel_shift: number;
        };
        relevancy?: {
            score: number;
            feedback: string;
        };
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
            pattern: string;
            score: number;
            behaviors: string[];
        }>;
        region_candidates?: Array<{
            region: string;
            confidence: number;
        }>;
        unreviewed_mapping?: boolean;
        insufficient_signal?: boolean;
    };

    amcat_transcript?: {
        reference_text: string;
        user_text: string;
        error_words: Array<{
            word: string;
            severity: 'minor' | 'moderate' | 'major';
            type: string;
        }>;
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
        severity: 'minor' | 'moderate' | 'major';
        category: 'Pronunciation' | 'Fluency' | 'MTI' | 'Grammar' | 'Style';
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
            items: Array<{
                title: string;
                type: string;
            }>;
        }>;
    };

    improvement_plan?: Record<
        string,
        {
            focus: string;
            exercise: string;
            daily_minutes: number;
        }
    >;

    practice_exercises?: Array<{
        title: string;
        description: string;
        duration_minutes: number;
    }>;

    grammar_errors?: Array<{
        original: string;
        corrected: string;
        rule: string;
    }>;

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

/* -------------------------------------------------------------------------- */
/* Assessment eligibility and session creation                                */
/* -------------------------------------------------------------------------- */

export const checkEligibility = async (
    userId: string
): Promise<EligibilityResponse> => {
    return requestJson<EligibilityResponse>(
        `${API_URL}/api/assessment/eligibility?user_id=${encodeURIComponent(userId)}`
    );
};

export const startAssessment = async (
    userId: string
): Promise<{ sessionId: string }> => {
    return requestJson<{ sessionId: string }>(
        `${API_URL}/api/assessment/start?user_id=${encodeURIComponent(userId)}`,
        { method: 'POST' }
    );
};

export const getRecommendations = async (
    userId: string
): Promise<{ profile: SpeechProfile; recommendations: Recommendation[] }> => {
    return requestJson<{ profile: SpeechProfile; recommendations: Recommendation[] }>(
        `${API_URL}/api/recommendations?user_id=${encodeURIComponent(userId)}`
    );
};

/* -------------------------------------------------------------------------- */
/* Assessment upload                                                          */
/* -------------------------------------------------------------------------- */

export const uploadFullAssessment = async (
    videoBlob: Blob,
    userId: string,
    sessionId: string,
    topicId: string,
    duration: number
): Promise<{ sessionId: string; status: string; storagePath?: string }> => {
    const formData = new FormData();
    formData.append('file', videoBlob, 'recording.webm');

    const params = new URLSearchParams({
        userId,
        sessionId,
        topicId,
        duration: String(duration),
    });

    return requestJson<{ sessionId: string; status: string; storagePath?: string }>(
        `${SESSION_SERVICE_URL}/api/assessment/upload?${params.toString()}`,
        {
            method: 'POST',
            body: formData,
        }
    );
};

/* -------------------------------------------------------------------------- */
/* Assessment report retrieval                                                */
/* -------------------------------------------------------------------------- */

export const fetchAssessmentReport = async (
    sessionId: string
): Promise<AnalysisResult> => {
    if (!sessionId?.trim()) {
        throw new Error('Cannot fetch assessment report: session ID is missing.');
    }

    // Report-service requires an authenticated learner. Send the current
    // Supabase access token on every report request.
    const authHeaders = await getAuthHeaders();

    if (!('Authorization' in authHeaders)) {
        throw new Error(
            'You are not authenticated. Please sign in again before opening the report.'
        );
    }

    const url =
        `${REPORT_SERVICE_URL}/api/assessment/results/` +
        encodeURIComponent(sessionId.trim());

    const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders,
        cache: 'no-store',
    });

    if (!response.ok) {
        const message = await getErrorMessage(response);

        switch (response.status) {
            case 401:
                throw new Error(
                    'Authentication failed while fetching the report (401). ' +
                    'Your session may have expired. Please sign in again.'
                );

            case 403:
                throw new Error(
                    'Access denied while fetching the report (403). ' +
                    'The authenticated account may not have permission to access this report.'
                );

            case 404:
                throw new Error(
                    `Report not found (404) for session ${sessionId}. ` +
                    `The report may not be visible to the authenticated learner, ` +
                    `or the report-service may not be finding the saved record. ` +
                    `Server response: ${message}`
                );

            default:
                throw new Error(
                    `Failed to fetch report (HTTP ${response.status}): ${message}`
                );
        }
    }

    const data = await response.json();

    const transcription: string = data.transcription ?? '';
    const words = transcription.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const amcatMetrics = data.amcat_metrics || {
        pronunciation: {
            score: data.pronunciation_score ?? 0,
            consonant: 0,
            vowel: 0,
            stress: 0,
        },
        fluency: {
            score: data.fluency_score ?? 0,
            rate: 0,
            pause: 0,
            fillers: 0,
        },
        clarity: {
            score: data.clarity_score ?? 0,
            end_consonants: 0,
            enunciation: 0,
            pace: 0,
        },
        intonation: {
            score: 0,
            sentence: 0,
            rise_fall: 0,
            pitch: 0,
        },
        mti: {
            score: 0,
            l1_interference: 0,
            retroflex: 0,
            vowel_shift: 0,
        },
        relevancy: {
            score: 0,
            feedback: '',
        },
    };

    const amcatSummary = data.amcat_summary || {
        top_strengths: data.strengths ?? [],
        top_improvements: data.focus_areas ?? [],
        learning_resources: [],
    };

    const errorLog = data.amcat_error_log || undefined;
    const sentences = data.amcat_sentences || undefined;

    const amcatTranscript = {
        reference_text: data.reference_passage_text || '',
        user_text: transcription,
        error_words: [] as Array<{
            word: string;
            severity: 'minor' | 'moderate' | 'major';
            type: string;
        }>,
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
            mispronunciation: errorLog
                ? errorLog.filter((e: AnalysisResult['amcat_error_log'][number]) =>
                    e.category === 'Pronunciation'
                ).length
                : 0,

            vocabulary_errors: errorLog
                ? errorLog.filter((e: AnalysisResult['amcat_error_log'][number]) =>
                    e.category === 'Style' &&
                    ['substitution', 'deletion'].includes(e.error_type)
                ).length
                : 0,

            stutters: errorLog
                ? errorLog.filter((e: AnalysisResult['amcat_error_log'][number]) =>
                    e.category === 'Fluency' &&
                    e.said_as?.includes('Stutter')
                ).length
                : 0,

            unnatural_pauses: 0,
            filler_words: data.filler_word_count ?? 0,

            mti_substitutions: errorLog
                ? errorLog.filter((e: AnalysisResult['amcat_error_log'][number]) =>
                    e.category === 'MTI'
                ).length
                : 0,
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
        transcription,

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

/* -------------------------------------------------------------------------- */
/* Legacy quick video analysis                                                */
/* -------------------------------------------------------------------------- */

export const uploadVideoForAnalysis = async (
    videoBlob: Blob
): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append('file', videoBlob, 'recording.webm');

    return requestJson<AnalysisResult>(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
    });
};

/* -------------------------------------------------------------------------- */
/* Exercise completion                                                        */
/* -------------------------------------------------------------------------- */

export const completeExercise = async (
    userId: string,
    exerciseId: string,
    category: string,
    score: number,
    issuesResolved: string[] = []
): Promise<{ status: string; message: string }> => {
    const params = new URLSearchParams({
        user_id: userId,
        exercise_id: exerciseId,
        category,
        score: String(score),
    });

    return requestJson<{ status: string; message: string }>(
        `${API_URL}/api/exercises/complete?${params.toString()}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issuesResolved),
        }
    );
};

/* -------------------------------------------------------------------------- */
/* Content service client                                                     */
/* -------------------------------------------------------------------------- */

export const apiClient = {
    async post<T>(path: string, body: unknown): Promise<T> {
        return requestJson<T>(`${CONTENT_SERVICE_URL}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
    },
};

/* -------------------------------------------------------------------------- */
/* Practice game types                                                        */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Practice game API                                                          */
/* -------------------------------------------------------------------------- */

export const startPracticeSession = async (
    userId: string,
    bucket: string
): Promise<PracticeSessionResponse> => {
    const params = new URLSearchParams({
        user_id: userId,
        bucket,
    });

    return requestJson<PracticeSessionResponse>(
        `${PRACTICE_GAME_SERVICE_URL}/api/practice/session?${params.toString()}`,
        { method: 'POST' }
    );
};

export const submitDrillAttempt = async (
    practiceSessionId: string,
    targetText: string,
    attemptNumber: number,
    audioBlob: Blob
): Promise<DrillAttemptApiResponse> => {
    const formData = new FormData();

    formData.append('practiceSessionId', practiceSessionId);
    formData.append('targetText', targetText);
    formData.append('attemptNumber', String(attemptNumber));
    formData.append('file', audioBlob, 'drill.webm');

    return requestJson<DrillAttemptApiResponse>(
        `${PRACTICE_GAME_SERVICE_URL}/api/practice/attempt`,
        {
            method: 'POST',
            body: formData,
        }
    );
};

export const completePracticeSession = async (
    practiceSessionId: string
): Promise<CompletePracticeSessionApiResponse> => {
    return requestJson<CompletePracticeSessionApiResponse>(
        `${PRACTICE_GAME_SERVICE_URL}/api/practice/session/` +
        `${encodeURIComponent(practiceSessionId)}/complete`,
        { method: 'POST' }
    );
};
