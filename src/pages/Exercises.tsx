import React, { useEffect, useState, useCallback } from 'react';
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
    ArrowRight,
    Target,
    Mic,
    X,
    ChevronRight,
    Info,
} from 'lucide-react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { DashboardBackground } from "../components/dashboard/DashboardBackground";
import { Navbar } from "../components/navigation/Navbar";
import { EnhancedCard } from "../components/dashboard/EnhancedCard";
import { courseApi, CourseSummaryDto } from "../services/courseApi";
import { CourseCurriculumView } from "../components/learning/CourseCurriculumView";
import { LessonPlayerView } from "../components/learning/LessonPlayerView";
import { SpeechGameShell } from "../components/practice/SpeechGameShell";
import {
    getOrCreateDrillPlan,
    recordDrillAttempt,
    DrillPlanDto,
    DrillPlanItemDto,
} from "../services/api";
import { DrillPhrase } from "../data/drillContent";

/* ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */

type TabId = 'drills' | 'courses';

/** Map a plan item to the DrillPhrase shape expected by SpeechGameShell */
function itemToPhrase(item: DrillPlanItemDto): DrillPhrase {
    return {
        id: item.id,
        // SpeechGameShell bucket field is typed narrowly; cast to string for custom onsets
        bucket: (item.target_value ?? 'th_sound') as DrillPhrase['bucket'],
        targetText: item.phrase_text,
        focusWords: item.trigger_word ? [item.trigger_word] : [],
        difficulty:
            item.level === 1 ? 'easy' : item.level === 2 ? 'medium' : 'hard',
    };
}

/** Group items by target_value */
function groupByTarget(
    items: DrillPlanItemDto[]
): Map<string, DrillPlanItemDto[]> {
    const map = new Map<string, DrillPlanItemDto[]>();
    for (const item of items) {
        const key = item.target_value ?? 'unknown';
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
    }
    return map;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Personalized Drill Hub
 * ────────────────────────────────────────────────────────────────────────── */

type DrillHubState = 'loading' | 'no_targets' | 'error' | 'ready';

interface ActiveSession {
    targetValue: string;
    phrases: DrillPhrase[];
}

function PersonalizedDrillHub() {
    const [hubState, setHubState] = useState<DrillHubState>('loading');
    const [plan, setPlan] = useState<DrillPlanDto | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

    const loadPlan = useCallback(async () => {
        setHubState('loading');
        setErrorMsg(null);
        try {
            const data = await getOrCreateDrillPlan();
            setPlan(data);
            if (data.status === 'no_targets' || !data.items || data.items.length === 0) {
                setHubState('no_targets');
            } else {
                setHubState('ready');
            }
        } catch (err: any) {
            setErrorMsg(err?.message ?? 'Failed to load your drill plan.');
            setHubState('error');
        }
    }, []);

    useEffect(() => {
        loadPlan();
    }, [loadPlan]);

    /** After an attempt, update local counters immediately */
    const handleAttemptResult = useCallback(
        async (phraseId: string, passed: boolean) => {
            try {
                const updated = await recordDrillAttempt(phraseId, passed);
                setPlan((prev) => {
                    if (!prev || !prev.items) return prev;
                    return {
                        ...prev,
                        items: prev.items.map((it) =>
                            it.id === updated.id ? updated : it
                        ),
                    };
                });
            } catch (err) {
                console.warn('[DrillHub] Failed to record attempt:', err);
            }
        },
        []
    );

    if (activeSession) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors"
                >
                    <X size={16} />
                    Close Practice
                </button>
                <SpeechGameShell
                    onClose={() => setActiveSession(null)}
                    phrases={activeSession.phrases}
                    title={`Drill: ${activeSession.targetValue.toUpperCase()}`}
                    onAttemptResult={handleAttemptResult}
                />
            </div>
        );
    }

    if (hubState === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <RefreshCw className="animate-spin text-indigo-400 mb-3" size={36} />
                <p className="text-sm font-medium text-white/50">
                    Building your personalized drill plan…
                </p>
            </div>
        );
    }

    if (hubState === 'error') {
        return (
            <div className="p-8 text-center rounded-2xl bg-red-950/30 border border-red-900/50">
                <AlertCircle className="mx-auto text-red-400 mb-2" size={32} />
                <p className="text-sm text-red-300 font-medium mb-4">{errorMsg}</p>
                <button
                    type="button"
                    onClick={loadPlan}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (hubState === 'no_targets') {
        return (
            <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="p-4 inline-block rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4">
                    <Info size={40} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                    No specific sound patterns identified yet
                </h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto leading-relaxed">
                    Your assessment did not identify a specific sound pattern to practice yet.
                    Complete a new assessment or try Quick Practice!
                </p>
            </div>
        );
    }

    // ready
    const items = plan?.items ?? [];
    const grouped = groupByTarget(items);

    return (
        <div className="space-y-6">
            {/* Plan header */}
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                    <Sparkles size={18} />
                </div>
                <div>
                    <p className="text-sm font-bold text-white mb-0.5">Your Personalized Drill Plan</p>
                    <p className="text-xs text-white/50 leading-relaxed">
                        Drills are derived from words that did not match the passage you read during your assessment.
                        Work through each target sound group and track your progress below.
                    </p>
                </div>
            </div>

            {/* Target groups */}
            {Array.from(grouped.entries()).map(([targetValue, groupItems]) => {
                const totalAttempts = groupItems.reduce((s, i) => s + i.attempts, 0);
                const totalPassed = groupItems.reduce((s, i) => s + i.passed_attempts, 0);
                const reportItems = groupItems.filter((i) => i.from_report);
                const phrases = groupItems.map(itemToPhrase);

                return (
                    <EnhancedCard
                        key={targetValue}
                        className="p-6 border-white/10 bg-white/[0.02] space-y-4"
                    >
                        {/* Group header */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/20">
                                    <Target size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                                        Sound: <span className="text-sky-400">{targetValue}</span>
                                    </h3>
                                    <p className="text-[11px] text-white/40 mt-0.5">
                                        {groupItems.length} drill{groupItems.length !== 1 ? 's' : ''} •{' '}
                                        {totalPassed}/{totalAttempts} attempts passed
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveSession({ targetValue, phrases })
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/20 shrink-0"
                            >
                                <Mic size={14} />
                                Start Practice
                            </button>
                        </div>

                        {/* Item list */}
                        <div className="space-y-2">
                            {groupItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                            {/* Level badge */}
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-700/60 text-slate-300 border border-slate-600/40">
                                                L{item.level}
                                            </span>
                                            {/* Source tag */}
                                            {item.from_report ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                    Assessment finding
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-700/40 text-slate-400 border border-slate-600/30">
                                                    Supplementary
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-white/80 font-medium leading-snug">
                                            {item.phrase_text}
                                        </p>
                                        {item.trigger_word && (
                                            <p className="text-[11px] text-white/40 mt-0.5">
                                                Focus word:{' '}
                                                <span className="font-bold text-sky-400">
                                                    {item.trigger_word}
                                                </span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="flex items-center gap-1 justify-end text-xs text-white/50 font-mono">
                                            <CheckCircle2
                                                size={12}
                                                className={
                                                    item.passed_attempts > 0
                                                        ? 'text-emerald-400'
                                                        : 'text-white/20'
                                                }
                                            />
                                            <span>
                                                {item.passed_attempts}/{item.attempts}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">
                                            passed
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Report-words note */}
                        {reportItems.length > 0 && (
                            <p className="text-[11px] text-white/35 italic">
                                {reportItems.length} drill{reportItems.length !== 1 ? 's' : ''} derived
                                from words that did not match the passage you read.
                            </p>
                        )}
                    </EnhancedCard>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Course Catalogue (preserved from original Exercises.tsx)
 * ────────────────────────────────────────────────────────────────────────── */

function CourseCatalogue({
    onSelectCourse,
}: {
    onSelectCourse: (id: string) => void;
}) {
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

    const filteredCourses = courses.filter((course) => {
        const matchesSearch =
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLevel =
            selectedLevel === 'ALL' ||
            course.level.toUpperCase() === selectedLevel.toUpperCase();
        return matchesSearch && matchesLevel;
    });

    const activeEnrolledCourse = courses.find(
        (c) => c.enrolled && c.progressPercent < 100
    );

    return (
        <div className="space-y-8">
            {/* Resume Banner */}
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
                            {activeEnrolledCourse.completedLessons} of{' '}
                            {activeEnrolledCourse.totalLessons} lessons completed (
                            {activeEnrolledCourse.progressPercent}%)
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelectCourse(activeEnrolledCourse.id)}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition self-start sm:self-auto shrink-0"
                    >
                        <Play size={14} className="fill-current" />
                        Continue Learning
                    </button>
                </div>
            )}

            {/* Search and Filter */}
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
                    <p className="text-sm font-medium text-white/50">
                        Loading speech mastery courses…
                    </p>
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
                    <h3 className="text-base font-bold text-white mb-1">
                        No courses match your criteria
                    </h3>
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
                                    onClick={() => onSelectCourse(course.id)}
                                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 group-hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                                >
                                    <span>
                                        {course.enrolled
                                            ? course.progressPercent > 0
                                                ? 'Resume Course'
                                                : 'Start Course'
                                            : 'Explore Curriculum'}
                                    </span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </EnhancedCard>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Exercises Page (Drill Hub + Courses, tabbed)
 * ────────────────────────────────────────────────────────────────────────── */

export function ExercisesPage({ username = "Alex" }: { username?: string }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const { courseId: routeCourseId, lessonId: routeLessonId } = useParams();
    const navigate = useNavigate();

    const activeCourseId = searchParams.get('courseId') || routeCourseId;
    const activeLessonId = searchParams.get('lessonId') || routeLessonId;

    // Default to 'drills' tab; switch to 'courses' when a course/lesson is active
    const [activeTab, setActiveTab] = useState<TabId>(
        activeCourseId || activeLessonId ? 'courses' : 'drills'
    );

    const handleSelectCourse = (courseId: string) => {
        setActiveTab('courses');
        setSearchParams({ courseId });
    };

    const handleSelectLesson = (lessonId: string) => {
        if (activeCourseId) {
            setSearchParams({ courseId: activeCourseId, lessonId });
        } else {
            setSearchParams({ lessonId });
        }
    };

    const handleBackToCatalogue = () => setSearchParams({});
    const handleBackToCourse = () => {
        if (activeCourseId) {
            setSearchParams({ courseId: activeCourseId });
        } else {
            setSearchParams({});
        }
    };

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
                                key="main-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-8"
                            >
                                {/* Page Header */}
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                                        <Sparkles size={14} />
                                        <span>Speech Practice Hub</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                                        Practice & Exercises
                                    </h1>
                                    <p className="text-white/60 text-sm sm:text-base max-w-2xl leading-relaxed">
                                        Work through personalized drills derived from your assessment, or explore
                                        structured speech mastery courses.
                                    </p>
                                </div>

                                {/* Tab Switcher */}
                                <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 w-fit">
                                    {([
                                        { id: 'drills' as TabId, label: 'My Drills', icon: <Target size={15} /> },
                                        { id: 'courses' as TabId, label: 'Courses', icon: <GraduationCap size={15} /> },
                                    ] as { id: TabId; label: string; icon: React.ReactNode }[]).map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                activeTab === tab.id
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <AnimatePresence mode="wait">
                                    {activeTab === 'drills' ? (
                                        <motion.div
                                            key="drills-panel"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <PersonalizedDrillHub />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="courses-panel"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <CourseCatalogue onSelectCourse={handleSelectCourse} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </DashboardBackground>
    );
}
