
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
}

export interface EligibilityResponse {
    can_assess: boolean;
    next_available_at: string | null;
    assessments_remaining: number;
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
