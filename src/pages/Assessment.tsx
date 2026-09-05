import { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { PreRecordingSetup } from "../components/assessment/PreRecordingSetup";
import { RecordingInterface } from "../components/assessment/RecordingInterface";
import { ProcessingScreen } from "../components/assessment/ProcessingScreen";
import { TopicSelection } from "../components/assessment/TopicSelection";
import { ResultsDashboard } from "../components/assessment/ResultsDashboard";
import { CadenceButton } from "../components/ui/CadenceButton";
import { CadenceCard } from "../components/ui/CadenceCard";
import { useQueryClient } from "@tanstack/react-query";
import {
    checkEligibility,
    startAssessment,
    uploadFullAssessment,
    getRecommendations,
    AnalysisResult,
    EligibilityResponse
} from "../services/api";
import { supabase } from "../lib/supabase";
import { Clock, AlertTriangle, ArrowRight } from "lucide-react";

// Eligibility View
const EligibilityView = ({ eligibility, onBack }: { eligibility: EligibilityResponse, onBack: () => void }) => {
    const nextAvailable = eligibility.next_available_at ? new Date(eligibility.next_available_at) : null;
    const now = new Date();
    const diffMs = nextAvailable ? nextAvailable.getTime() - now.getTime() : 0;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return (
        <div className="max-w-xl mx-auto px-4 py-16 sm:py-24 flex items-center justify-center min-h-screen">
            <CadenceCard elevation="elevated" className="w-full text-center p-8 sm:p-10">
                <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-warning/10 text-warning rounded-full">
                        <Clock className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary tracking-tight">Assessment on Cooldown</h2>
                        <p className="text-sm text-text-muted mt-2">
                            Free users can take one Full Assessment every 24 hours.
                        </p>
                    </div>

                    <div className="p-6 bg-elevated-surface rounded-2xl border border-border w-full">
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Next available in</p>
                        <p className="text-3xl font-bold text-warning">
                            {diffHours}h {diffMins}m
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <CadenceButton fullWidth variant="outline" onClick={onBack}>
                            Back to Intro
                        </CadenceButton>
                        <CadenceButton fullWidth variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={() => window.location.href = '/exercises'}>
                            Try Quick Practice
                        </CadenceButton>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-brand/5 rounded-xl border border-brand/20 text-brand">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-semibold">
                            Upgrade to PRO for unlimited assessments
                        </span>
                    </div>
                </div>
            </CadenceCard>
        </div>
    );
};

export function Assessment() {
    type Step = 'intro' | 'eligibility-check' | 'not-eligible' | 'topic-selection' | 'setup' | 'recording' | 'processing' | 'results';
    const [step, setStep] = useState<Step>('intro');
    const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [topicId, setTopicId] = useState<string>('custom');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('intermediate');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [userName, setUserName] = useState("User");
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setUserId(data.user.id);
                if (data.user.user_metadata?.full_name) {
                    setUserName(data.user.user_metadata.full_name);
                }
            }
        });
    }, []);

    const handleStartClick = async () => {
        if (!userId) {
            toast({ title: "Please login first", status: "warning" });
            return;
        }
        setStep('eligibility-check');
        try {
            const res = await checkEligibility(userId);
            setEligibility(res);
            if (res.can_assess) {
                const { sessionId } = await startAssessment(userId);
                setSessionId(sessionId);
                setStep('topic-selection');
            } else {
                setStep('not-eligible');
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Connection Error", status: "error" });
            setStep('intro');
        }
    };

    const handleTopicSelect = (id: string, difficulty: string) => {
        setTopicId(id);
        setSelectedDifficulty(difficulty);
        setStep('setup');
    };

    const handleRecordingComplete = (recordedBlob: Blob) => {
        setStep('processing');
        handleUpload(recordedBlob);
    };

    const handleUpload = async (file: Blob) => {
        if (!userId || !sessionId) return;
        try {
            await uploadFullAssessment(file, userId, sessionId, topicId, 300); // 300s target
            // Session-service accepted upload; RabbitMQ async pipeline & WebSocket STOMP handle results
        } catch (err: any) {
            console.error(err);
            toast({ title: "Upload Failed", description: err?.message || "Failed to upload recording", status: "error" });
            setStep('topic-selection');
        }
    };

    const handleRecommendationsReady = async () => {
        if (userId) {
            try {
                await getRecommendations(userId);
            } catch (err) {
                console.error("Failed to fetch updated recommendations:", err);
            }
        }
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    };

    return (
        <div className="min-h-screen w-full relative bg-background text-text-primary overflow-x-hidden">
            <AnimatePresence mode="wait">
                {step === 'intro' && (
                    <div key="intro" className="relative min-h-screen flex items-center justify-center bg-background px-4">
                        {/* Subtle background grid */}
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{
                                backgroundImage: 'radial-gradient(var(--color-text-primary) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="relative z-10 flex flex-col items-center text-center max-w-xl py-12"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-wider mb-6">
                                Comprehensive Speech Check
                            </div>
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-text-primary tracking-tight leading-none mb-4">
                                FULL ASSESSMENT
                            </h1>
                            <p className="text-base sm:text-lg text-text-muted max-w-md mb-8">
                                Test your speaking, fluency, and grammar in a comprehensive 5-minute session.
                            </p>
                            <CadenceButton
                                size="lg"
                                onClick={handleStartClick}
                                className="h-14 px-8 text-base font-semibold shadow-lg mb-4"
                            >
                                Start My Daily Assessment
                            </CadenceButton>
                            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
                                Free: 1 session per 24 hours
                            </p>
                        </motion.div>
                    </div>
                )}

                {step === 'eligibility-check' && (
                    <div key="checking" className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
                        <svg
                            className="animate-spin w-10 h-10 text-brand mb-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-sm font-semibold text-text-primary">Validating session...</p>
                    </div>
                )}

                {step === 'not-eligible' && eligibility && (
                    <div key="not-eligible" className="min-h-screen bg-background">
                        <EligibilityView eligibility={eligibility} onBack={() => setStep('intro')} />
                    </div>
                )}

                {step === 'topic-selection' && (
                    <div
                        key="topics"
                        className="min-h-screen bg-background overflow-y-auto py-6 md:py-10 px-0 md:px-4"
                    >
                        <TopicSelection onSelect={handleTopicSelect} />
                    </div>
                )}

                {step === 'setup' && (
                    <PreRecordingSetup key="setup" onReady={() => setStep('recording')} />
                )}

                {step === 'recording' && (
                    <RecordingInterface
                        key="recording"
                        userName={userName}
                        topicId={topicId}
                        difficulty={selectedDifficulty}
                        sessionId={sessionId}
                        onRecordingComplete={handleRecordingComplete}
                        onCancel={() => setStep('topic-selection')}
                    />
                )}

                {step === 'processing' && (
                    <ProcessingScreen
                        key="processing"
                        sessionId={sessionId || ''}
                        onReportReady={(analysisResult) => {
                            setResult(analysisResult);
                            setStep('results');
                        }}
                        onRecommendationsReady={handleRecommendationsReady}
                        onRetry={() => setStep('topic-selection')}
                    />
                )}

                {step === 'results' && result && (
                    <div key="results" className="min-h-screen bg-background overflow-auto">
                        <ResultsDashboard
                            result={result}
                            onRetry={() => setStep('intro')}
                            userName={userName}
                            sessionId={sessionId || 'CADENCE-AI-SESSION'}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

