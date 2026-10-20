import { supabase } from '../lib/supabase';

const CONTENT_SERVICE_URL = import.meta.env.VITE_CONTENT_SERVICE_URL || "http://localhost:8084";

export interface ExerciseOption {
    id: string;
    text: string;
    explanation?: string;
}

export interface ExerciseDto {
    id: string;
    lessonId: string;
    title: string;
    instruction: string;
    exerciseType: 'MULTIPLE_CHOICE' | 'SENTENCE_REPETITION' | 'SPEAKING_PROMPT' | 'FILL_IN_BLANK' | string;
    promptText: string;
    options: ExerciseOption[];
    hints: string[];
    orderIndex: number;
    completed: boolean;
    previousScore?: number | null;
    previousFeedback?: string | null;
}

export interface LessonSummaryDto {
    id: string;
    title: string;
    description?: string;
    orderIndex: number;
    durationMinutes: number;
    completed: boolean;
}

export interface ModuleDetailDto {
    id: string;
    title: string;
    description?: string;
    orderIndex: number;
    lessons: LessonSummaryDto[];
}

export interface CourseSummaryDto {
    id: string;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | string;
    category: string;
    estimatedMinutes: number;
    thumbnailUrl?: string;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    enrolled: boolean;
    currentLessonId?: string | null;
}

export interface CourseDetailDto extends CourseSummaryDto {
    modules: ModuleDetailDto[];
}

export interface LessonDetailDto {
    id: string;
    moduleId: string;
    moduleTitle: string;
    courseId: string;
    courseTitle: string;
    title: string;
    description?: string;
    orderIndex: number;
    durationMinutes: number;
    contentMarkdown: string;
    keyTakeaways: string[];
    completed: boolean;
    nextLessonId?: string | null;
    prevLessonId?: string | null;
    exercises: ExerciseDto[];
}

export interface CourseProgressDto {
    courseId: string;
    enrolled: boolean;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
    currentLessonId?: string | null;
    enrolledAt?: string | null;
    completedAt?: string | null;
    completedLessonIds?: string[];
}

export interface ExerciseAttemptResponse {
    id: string;
    exerciseId: string;
    isCorrect: boolean;
    score: number;
    feedback: string;
    attemptedAt: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token.trim()}`;
        }
    } catch (e) {
        // Fall back to unauthenticated header
    }
    return headers;
}

export const courseApi = {
    async getCourses(): Promise<CourseSummaryDto[]> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/courses`, {
            method: 'GET',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to load courses (${res.status})`);
        }
        return res.json();
    },

    async getCourseDetail(courseId: string): Promise<CourseDetailDto> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/courses/${courseId}`, {
            method: 'GET',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to load course details (${res.status})`);
        }
        return res.json();
    },

    async enrollInCourse(courseId: string): Promise<CourseProgressDto> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/courses/${courseId}/enroll`, {
            method: 'POST',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to enroll in course (${res.status})`);
        }
        return res.json();
    },

    async getCourseProgress(courseId: string): Promise<CourseProgressDto> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/courses/${courseId}/progress`, {
            method: 'GET',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to load course progress (${res.status})`);
        }
        return res.json();
    },

    async getLessonDetail(lessonId: string): Promise<LessonDetailDto> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/lessons/${lessonId}`, {
            method: 'GET',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to load lesson (${res.status})`);
        }
        return res.json();
    },

    async completeLesson(lessonId: string): Promise<CourseProgressDto> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/lessons/${lessonId}/complete`, {
            method: 'POST',
            headers,
        });
        if (!res.ok) {
            throw new Error(`Failed to mark lesson complete (${res.status})`);
        }
        return res.json();
    },

    async submitExerciseAttempt(exerciseId: string, responseText: string): Promise<ExerciseAttemptResponse> {
        const headers = await getAuthHeaders();
        const res = await fetch(`${CONTENT_SERVICE_URL}/api/exercises/${exerciseId}/attempt`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ responseText }),
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `Failed to submit exercise (${res.status})`);
        }
        return res.json();
    },
};
