import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    BookOpen, 
    ArrowRight, 
    CheckCircle2, 
    Clock, 
    Sparkles, 
    Play, 
    GraduationCap,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { courseApi, CourseSummaryDto } from '../../services/courseApi';

interface LearningPathSectionProps {
    sessionId?: string;
    className?: string;
    onSelectCourse?: (courseId: string) => void;
}

export const LearningPathSection: React.FC<LearningPathSectionProps> = ({
    sessionId,
    className = '',
    onSelectCourse,
}) => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<CourseSummaryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCourses = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await courseApi.getCourses();
            setCourses(data);
        } catch (err: any) {
            console.error('Failed to load courses for learning path:', err);
            setError(err?.message || 'Unable to load recommended courses.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const handleCourseClick = (courseId: string) => {
        if (onSelectCourse) {
            onSelectCourse(courseId);
        } else {
            navigate(`/exercises?courseId=${courseId}`);
        }
    };

    return (
        <section 
            id="learning-path-section"
            className={`mt-10 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-xl ${className}`}
            aria-labelledby="learning-path-heading"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand/10 text-brand mb-2">
                        <GraduationCap size={16} />
                        <span>NEXT STEP IN YOUR JOURNEY</span>
                    </div>
                    <h2 
                        id="learning-path-heading" 
                        className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 tracking-tight"
                    >
                        Your Learning Path
                    </h2>
                    <p className="mt-1 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl">
                        Continue improving your spoken English with structured lessons, articulation drills, and guided practice.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/exercises')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm font-semibold transition-all shadow-sm hover:shadow self-start md:self-center"
                >
                    <span>View All Courses</span>
                    <ArrowRight size={16} />
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <RefreshCw className="animate-spin text-brand mb-3" size={28} />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Loading your curriculum options...
                    </p>
                </div>
            ) : error ? (
                <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-2" size={28} />
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-3">{error}</p>
                    <button
                        type="button"
                        onClick={loadCourses}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                    >
                        Retry Loading
                    </button>
                </div>
            ) : courses.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <BookOpen className="mx-auto text-neutral-400 mb-2" size={32} />
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        No courses are currently published. Check back soon for new speech curriculums.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                        const isEnrolled = course.enrolled;
                        const progress = course.progressPercent || 0;

                        return (
                            <div
                                key={course.id}
                                className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg dark:hover:border-brand/40"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand">
                                            {course.level}
                                        </span>
                                        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <Clock size={14} />
                                            <span>{course.estimatedMinutes}m</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-brand transition-colors line-clamp-1 mb-2">
                                        {course.title}
                                    </h3>

                                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-4 leading-relaxed">
                                        {course.shortDescription || course.description}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700/60 mt-auto">
                                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                        <span>{course.totalLessons} Lessons</span>
                                        {isEnrolled && (
                                            <span className="font-semibold text-brand">
                                                {progress}% completed
                                            </span>
                                        )}
                                    </div>

                                    {isEnrolled && (
                                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden mb-4">
                                            <div 
                                                className="bg-brand h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleCourseClick(course.id)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all bg-brand text-white hover:bg-brand/90 shadow-sm"
                                    >
                                        <Play size={14} className="fill-current" />
                                        <span>{isEnrolled ? (progress > 0 ? 'Resume Course' : 'Start Course') : 'Explore Course'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};
