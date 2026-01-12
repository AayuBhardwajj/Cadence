
const API_URL = "http://localhost:8000";

export interface AnalysisResult {
    overall_score: number;
    breakdown: {
        fluency_score: number;
        confidence_score: number;
        wpm: number;
        fillers: number;
        eye_contact: number;
    };
    feedback: string;
}

export const uploadVideoForAnalysis = async (videoBlob: Blob): Promise<AnalysisResult> => {
    const formData = new FormData();
    // Append the blob with a filename (required by FastAPI)
    formData.append("file", videoBlob, "recording.webm");

    try {
        const response = await fetch(`${API_URL}/analyze`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analysis failed: ${errorText}`);
        }

        const data = await response.json();
        return data as AnalysisResult;
    } catch (error) {
        console.error("Error uploading video:", error);
        throw error;
    }
};
