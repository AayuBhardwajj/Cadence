import React, { useEffect, useState } from 'react';
import { 
    ArrowLeft, 
    CheckCircle2, 
    ChevronRight, 
    Clock, 
    BookOpen, 
    Award, 
    RefreshCw, 
    AlertCircle,
    ChevronLeft,
    Check
} from 'lucide-react';
import { courseApi, LessonDetailDto } from '../../services/courseApi';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ExercisePlayer } from './ExercisePlayer';

interface LessonPlayerViewProps {
    lessonId: string;
    onBackToCourse: () => void;
    onSelectLesson: (lessonId: string) => void;
}

export const LessonPlayerView: React.FC<LessonPlayerViewProps> = ({
    lessonId,
    onBackToCourse,
    onSelectLesson,
}) => {
    const [lesson, setLesson] = useState<LessonDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const loadLesson = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await courseApi.getLessonDetail(lessonId);
            setLesson(data);
            setIsCompleted(data.completed);
        } catch (err: any) {
            console.error('Failed to load lesson:', err);
            setError(err?.message || 'Failed to load lesson details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLesson();
    }, [lessonId]);

    const handleMarkComplete = async () => {
        if (!lesson) return;
        setCompleting(true);
        try {
            await courseApi.completeLesson(lesson.id);
            setIsCompleted(true);
            // If next lesson exists, smoothly offer navigation
            if (lesson.nextLessonId) {
                onSelectLesson(lesson.nextLessonId);
            }
        } catch (err: any) {
            console.error('Failed to complete lesson:', err);
            alert('Failed to record lesson progress: ' + (err?.message || ''));
        } finally {
            setCompleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <RefreshCw className="animate-spin text-brand mb-3" size={32} />
                <p className="text-sm font-medium text-neutral-400">Loading lesson content...</p>
            </div>
        );
    }

    if (error || !lesson) {
        return (
            <div className="p-8 text-center max-w-lg mx-auto bg-neutral-900/60 rounded-2xl border border-white/10 mt-12">
                <AlertCircle className="mx-auto text-red-400 mb-3" size={36} />
                <h3 className="text-lg font-bold text-white mb-2">Lesson Unavailable</h3>
                <p className="text-sm text-white/60 mb-6">{error || 'This lesson could not be found.'}</p>
                <button
                    type="button"
                    onClick={onBackToCourse}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
                >
                    Back to Curriculum
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Top Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                    type="button"
                    onClick={onBackToCourse}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back to {lesson.courseTitle}</span>
                </button>

                <div className="flex items-center gap-2 text-xs font-semibold text-white/40">
                    <span>{lesson.moduleTitle}</span>
                    <ChevronRight size={14} />
                    <span className="text-white/80">Lesson {lesson.orderIndex + 1}</span>
                </div>
            </div>

            {/* Lesson Header Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                {lesson.moduleTitle}
                            </span>
                            <div className="flex items-center gap-1 text-xs text-white/50">
                                <Clock size={14} />
                                <span>{lesson.durationMinutes} min read & practice</span>
                            </div>
                        </div>

                        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                            {lesson.title}
                        </h1>
                        {lesson.description && (
                            <p className="mt-2 text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl">
                                {lesson.description}
                            </p>
                        )}
                    </div>

                    {isCompleted && (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider self-start sm:self-center shrink-0">
                            <CheckCircle2 size={16} />
                            <span>Completed</span>
                        </div>
                    )}
                </div>

                {/* Key Takeaways */}
                {lesson.keyTakeaways && lesson.keyTakeaways.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-3">
                            Key Lesson Takeaways
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {lesson.keyTakeaways.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs sm:text-sm text-white/80">
                                    <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Structured Lesson Content */}
            <div className="p-6 sm:p-10 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-2xl">
                <MarkdownRenderer content={lesson.contentMarkdown} />
            </div>

            {/* Interactive Exercises Section */}
            {lesson.exercises && lesson.exercises.length > 0 && (
                <div className="space-y-6 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
                            <Award size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-white">
                                Interactive Exercises ({lesson.exercises.length})
                            </h2>
                            <p className="text-xs sm:text-sm text-white/50">
                                Practice what you've learned to build lasting vocal muscle memory.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {lesson.exercises.map((ex) => (
                            <ExercisePlayer 
                                key={ex.id} 
                                exercise={ex} 
                                onAttemptSubmitted={(res) => {
                                    if (res.isCorrect) {
                                        // Update state if needed
                                    }
                                }} 
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Actions and Navigation */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    {lesson.prevLessonId ? (
                        <button
                            type="button"
                            onClick={() => onSelectLesson(lesson.prevLessonId!)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/5 transition"
                        >
                            <ChevronLeft size={16} />
                            <span>Previous Lesson</span>
                        </button>
                    ) : (
                        <div />
                    )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleMarkComplete}
                        disabled={completing}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${
                            isCompleted 
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40' 
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                        }`}
                    >
                        {completing ? (
                            <span>Saving Progress...</span>
                        ) : isCompleted ? (
                            <>
                                <CheckCircle2 size={16} />
                                <span>Completed (Click to Re-complete)</span>
                            </>
                        ) : (
                            <>
                                <Check size={16} />
                                <span>Mark Complete & Continue</span>
                            </>
                        )}
                    </button>

                    {lesson.nextLessonId && (
                        <button
                            type="button"
                            onClick={() => onSelectLesson(lesson.nextLessonId!)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition"
                        >
                            <span>Next</span>
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
