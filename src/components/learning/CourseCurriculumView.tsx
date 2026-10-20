import React, { useEffect, useState } from 'react';
import { 
    ArrowLeft, 
    BookOpen, 
    CheckCircle2, 
    Circle, 
    Clock, 
    Play, 
    Sparkles, 
    RefreshCw, 
    AlertCircle,
    ChevronDown,
    ChevronUp,
    GraduationCap,
    Layers
} from 'lucide-react';
import { courseApi, CourseDetailDto } from '../../services/courseApi';

interface CourseCurriculumViewProps {
    courseId: string;
    onBackToCatalogue: () => void;
    onSelectLesson: (lessonId: string) => void;
}

export const CourseCurriculumView: React.FC<CourseCurriculumViewProps> = ({
    courseId,
    onBackToCatalogue,
    onSelectLesson,
}) => {
    const [course, setCourse] = useState<CourseDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [enrolling, setEnrolling] = useState(false);
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const loadCourse = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await courseApi.getCourseDetail(courseId);
            setCourse(data);
            // Default expand all modules
            const expanded: Record<string, boolean> = {};
            data.modules.forEach(m => {
                expanded[m.id] = true;
            });
            setExpandedModules(expanded);
        } catch (err: any) {
            console.error('Failed to load course details:', err);
            setError(err?.message || 'Failed to load course details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourse();
    }, [courseId]);

    const handleEnroll = async () => {
        if (!course) return;
        setEnrolling(true);
        try {
            const progress = await courseApi.enrollInCourse(course.id);
            setCourse(prev => prev ? {
                ...prev,
                enrolled: true,
                currentLessonId: progress.currentLessonId,
                progressPercent: progress.progressPercent,
                completedLessons: progress.completedLessons,
            } : null);

            // If there's a current lesson, open it
            if (progress.currentLessonId) {
                onSelectLesson(progress.currentLessonId);
            }
        } catch (err: any) {
            console.error('Failed to enroll in course:', err);
            alert('Failed to enroll: ' + (err?.message || ''));
        } finally {
            setEnrolling(false);
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleId]: !prev[moduleId]
        }));
    };

    const findNextUncompletedLesson = (): string | null => {
        if (!course) return null;
        for (const module of course.modules) {
            for (const lesson of module.lessons) {
                if (!lesson.completed) {
                    return lesson.id;
                }
            }
        }
        return course.modules[0]?.lessons[0]?.id || null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px]">
                <RefreshCw className="animate-spin text-brand mb-3" size={32} />
                <p className="text-sm font-medium text-neutral-400">Loading syllabus & curriculum...</p>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="p-8 text-center max-w-lg mx-auto bg-neutral-900/60 rounded-2xl border border-white/10 mt-12">
                <AlertCircle className="mx-auto text-red-400 mb-3" size={36} />
                <h3 className="text-lg font-bold text-white mb-2">Course Unavailable</h3>
                <p className="text-sm text-white/60 mb-6">{error || 'This course could not be loaded.'}</p>
                <button
                    type="button"
                    onClick={onBackToCatalogue}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition"
                >
                    Back to Course Catalogue
                </button>
            </div>
        );
    }

    const nextLessonId = course.currentLessonId || findNextUncompletedLesson();

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Back button */}
            <div>
                <button
                    type="button"
                    onClick={onBackToCatalogue}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white transition"
                >
                    <ArrowLeft size={16} />
                    <span>Back to All Courses</span>
                </button>
            </div>

            {/* Course Hero Banner */}
            <div className="p-6 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            {course.level}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {course.category}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-white/60">
                        <div className="flex items-center gap-1.5">
                            <Clock size={15} />
                            <span>{course.estimatedMinutes} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <BookOpen size={15} />
                            <span>{course.totalLessons} Lessons</span>
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
                    {course.title}
                </h1>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl mb-8">
                    {course.description}
                </p>

                {/* Progress & Actions */}
                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1 max-w-md">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-white/60">Overall Progress</span>
                            <span className="text-blue-400">
                                {course.completedLessons} / {course.totalLessons} Lessons ({course.progressPercent}%)
                            </span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${course.progressPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {course.enrolled ? (
                            <button
                                type="button"
                                onClick={() => nextLessonId && onSelectLesson(nextLessonId)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition"
                            >
                                <Play size={16} className="fill-current" />
                                <span>{course.progressPercent > 0 ? 'Resume Learning' : 'Start First Lesson'}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleEnroll}
                                disabled={enrolling}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition disabled:opacity-50"
                            >
                                <GraduationCap size={16} />
                                <span>{enrolling ? 'Enrolling...' : 'Enroll in Course'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Curriculum Breakdown */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="text-blue-400" size={20} />
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                            Curriculum Breakdown
                        </h2>
                    </div>
                    <span className="text-xs font-semibold text-white/50">
                        {course.modules.length} Modules • {course.totalLessons} Lessons
                    </span>
                </div>

                <div className="space-y-4">
                    {course.modules.map((module, mIdx) => {
                        const isExpanded = expandedModules[module.id] ?? true;
                        const moduleCompletedCount = module.lessons.filter(l => l.completed).length;

                        return (
                            <div 
                                key={module.id}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden transition"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleModule(module.id)}
                                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 text-white/70 font-mono text-xs font-bold">
                                            {mIdx + 1}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-white text-base sm:text-lg">
                                                {module.title}
                                            </h3>
                                            {module.description && (
                                                <p className="text-xs text-white/50 mt-0.5">
                                                    {module.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium text-white/40 hidden sm:inline">
                                            {moduleCompletedCount}/{module.lessons.length} done
                                        </span>
                                        {isExpanded ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-white/5 divide-y divide-white/5 bg-black/10">
                                        {module.lessons.map((lesson) => (
                                            <div
                                                key={lesson.id}
                                                onClick={() => onSelectLesson(lesson.id)}
                                                className="flex items-center justify-between p-4 px-6 hover:bg-white/5 cursor-pointer transition group"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    {lesson.completed ? (
                                                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <Circle size={18} className="text-white/30 group-hover:text-blue-400 shrink-0 transition" />
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-sm text-white/90 group-hover:text-blue-400 transition">
                                                            {lesson.title}
                                                        </span>
                                                        {lesson.description && (
                                                            <p className="text-xs text-white/50 line-clamp-1 mt-0.5">
                                                                {lesson.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-white/40 shrink-0">
                                                    <span className="hidden sm:inline">{lesson.durationMinutes} min</span>
                                                    <Play size={14} className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
