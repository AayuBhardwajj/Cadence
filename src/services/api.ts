
const API_URL = "http://localhost:8000";

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
): Promise<{ sessionId: string; results: AnalysisResult; status: string }> => {
    const formData = new FormData();
    formData.append("file", videoBlob, "recording.webm");

    const response = await fetch(
        `${API_URL}/api/assessment/upload?userId=${userId}&sessionId=${sessionId}&topicId=${topicId}&duration=${duration}`,
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
