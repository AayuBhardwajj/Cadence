import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, 
    Sparkles, 
    Clock, 
    Play, 
    Search, 
    Filter, 
    CheckCircle2, 
    GraduationCap, 
    RefreshCw, 
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { Navbar } from "../components/navigation/Navbar";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { courseApi, CourseSummaryDto } from "../services/courseApi";
import { CourseCurriculumView } from "../components/learning/CourseCurriculumView";
import { LessonPlayerView } from "../components/learning/LessonPlayerView";

export function ExercisesPage({ username = "Alex" }: { username?: string }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { courseId: routeCourseId, lessonId: routeLessonId } = useParams();
    const navigate = useNavigate();
    const activeCourseId = searchParams.get('courseId') || routeCourseId;
    const activeLessonId = searchParams.get('lessonId') || routeLessonId;

    const [courses, setCourses] = useState<CourseSummaryDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<string>('ALL');

    const loadCourses = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await courseApi.getCourses();
            setCourses(data);
        } catch (err: any) {
            console.error('Failed to load courses:', err);
            setError(err?.message || 'Failed to load courses.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const handleSelectCourse = (courseId: string) => {
        setSearchParams({ courseId });
    };

    const handleSelectLesson = (lessonId: string) => {
        if (activeCourseId) {
            setSearchParams({ courseId: activeCourseId, lessonId });
        } else {
            setSearchParams({ lessonId });
        }
    };

    const handleBackToCatalogue = () => {
        setSearchParams({});
    };

    const handleBackToCourse = () => {
        if (activeCourseId) {
            setSearchParams({ courseId: activeCourseId });
        } else {
            setSearchParams({});
        }
    };

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel = selectedLevel === 'ALL' || course.level.toUpperCase() === selectedLevel.toUpperCase();
        return matchesSearch && matchesLevel;
    });

    const activeEnrolledCourse = courses.find(c => c.enrolled && c.progressPercent < 100);

    return (
        <DashboardBackground>
            <div className="flex flex-col min-h-screen">
                <Navbar username={username} />

                <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto relative z-10">
                    <AnimatePresence mode="wait">
                        {activeLessonId ? (
                            <motion.div
                                key="lesson-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                            >
                                <LessonPlayerView
                                    lessonId={activeLessonId}
                                    onBackToCourse={handleBackToCourse}
                                    onSelectLesson={handleSelectLesson}
                                />
                            </motion.div>
                        ) : activeCourseId ? (
                            <motion.div
                                key="course-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CourseCurriculumView
                                    courseId={activeCourseId}
                                    onBackToCatalogue={handleBackToCatalogue}
                                    onSelectLesson={handleSelectLesson}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="catalogue-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {/* Header Banner */}
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                                        <GraduationCap size={16} />
                                        <span>Guided Speech Mastery Curriculums</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                                        Course & Learning Pipeline
                                    </h1>
                                    <p className="text-white/60 text-sm sm:text-base max-w-2xl leading-relaxed">
                                        Structured step-by-step vocal modules, cadence workouts, and real-time interactive exercises to transform your English speech.
                                    </p>
                                </div>

                                {/* Resume Banner if enrolled */}
                                {activeEnrolledCourse && (
                                    <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-blue-900/40 border border-blue-500/30 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                                                Resume In-Progress Course
                                            </span>
                                            <h3 className="text-lg font-bold text-white">
                                                {activeEnrolledCourse.title}
                                            </h3>
                                            <p className="text-xs text-white/60">
                                                {activeEnrolledCourse.completedLessons} of {activeEnrolledCourse.totalLessons} lessons completed ({activeEnrolledCourse.progressPercent}%)
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleSelectCourse(activeEnrolledCourse.id)}
                                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition self-start sm:self-auto shrink-0"
                                        >
                                            <Play size={14} className="fill-current" />
                                            <span>Continue Learning</span>
                                        </button>
                                    </div>
                                )}

                                {/* Search and Filter Toolbar */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by topic, skill, or keyword..."
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/40"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                        <Filter size={16} className="text-white/40 shrink-0 ml-1 mr-1" />
                                        {['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((level) => (
                                            <button
                                                key={level}
                                                type="button"
                                                onClick={() => setSelectedLevel(level)}
                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                                                    selectedLevel === level
                                                        ? 'bg-blue-600 text-white shadow-md'
                                                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Course Grid */}
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <RefreshCw className="animate-spin text-blue-400 mb-3" size={36} />
                                        <p className="text-sm font-medium text-white/50">Loading speech mastery courses...</p>
                                    </div>
                                ) : error ? (
                                    <div className="p-8 text-center rounded-2xl bg-red-950/30 border border-red-900/50">
                                        <AlertCircle className="mx-auto text-red-400 mb-2" size={32} />
                                        <p className="text-sm text-red-300 font-medium mb-4">{error}</p>
                                        <button
                                            type="button"
                                            onClick={loadCourses}
                                            className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : filteredCourses.length === 0 ? (
                                    <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
                                        <BookOpen className="mx-auto text-white/30 mb-3" size={40} />
                                        <h3 className="text-base font-bold text-white mb-1">No courses match your criteria</h3>
                                        <p className="text-xs text-white/50 max-w-sm mx-auto">
                                            Try adjusting your search terms or filter selection.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredCourses.map((course) => (
                                            <EnhancedCard
                                                key={course.id}
                                                className="flex flex-col justify-between p-6 rounded-2xl border-white/10 bg-white/[0.02] hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-200 group"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                                            {course.level}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-xs text-white/50">
                                                            <Clock size={14} />
                                                            <span>{course.estimatedMinutes}m</span>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition mb-2">
                                                        {course.title}
                                                    </h3>

                                                    <p className="text-xs text-white/60 line-clamp-3 leading-relaxed mb-6">
                                                        {course.shortDescription || course.description}
                                                    </p>
                                                </div>

                                                <div className="pt-4 border-t border-white/10 mt-auto">
                                                    <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                                                        <span>{course.totalLessons} Lessons</span>
                                                        {course.enrolled && (
                                                            <span className="text-blue-400 font-semibold">
                                                                {course.progressPercent}% complete
                                                            </span>
                                                        )}
                                                    </div>

                                                    {course.enrolled && (
                                                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${course.progressPercent}%` }}
                                                            />
                                                        </div>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectCourse(course.id)}
                                                        className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 group-hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                                                    >
                                                        <span>{course.enrolled ? (course.progressPercent > 0 ? 'Resume Course' : 'Start Course') : 'Explore Curriculum'}</span>
                                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            </EnhancedCard>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </DashboardBackground>
    );
}
