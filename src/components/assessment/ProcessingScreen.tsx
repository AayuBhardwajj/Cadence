import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToAssessment, AssessmentNotification } from '../../services/websocket';
import { fetchAssessmentReport, AnalysisResult } from '../../services/api';
import { CadenceButton } from '../ui/CadenceButton';

interface ProcessingScreenProps {
    sessionId: string;
    onReportReady: (result: AnalysisResult) => void;
    onRecommendationsReady?: () => void;
    onError?: (error: string) => void;
    onRetry?: () => void;
}

const steps = [
    "Analyzing pronunciation patterns...",
    "Detecting accent characteristics...",
    "Measuring speech fluency...",
    "Identifying problem sounds...",
    "Comparing with native speakers...",
    "Generating personalized recommendations...",
    "Finalizing your report..."
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
    sessionId,
    onReportReady,
    onRecommendationsReady,
    onError,
    onRetry,
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const pendingResultRef = useRef<AnalysisResult | null>(null);
    const recommendationsReadyRef = useRef<boolean>(false);
    const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onReportReadyRef = useRef(onReportReady);
    onReportReadyRef.current = onReportReady;

    const onRecommendationsReadyRef = useRef(onRecommendationsReady);
    onRecommendationsReadyRef.current = onRecommendationsReady;

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    // Step animation loop while waiting for async events
    useEffect(() => {
        if (errorMessage) return;
        const interval = setInterval(() => {
            setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 3000);
        return () => clearInterval(interval);
    }, [errorMessage]);

    // WebSocket STOMP subscription to /topic/assessment/{sessionId}
    useEffect(() => {
        if (!sessionId) return;

        const unsubscribe = subscribeToAssessment(
            sessionId,
            async (notification: AssessmentNotification) => {
                if (notification.event === 'REPORT_READY') {
                    setStatusMessage("Report ready! Finalizing personalized recommendations...");
                    try {
                        const result = await fetchAssessmentReport(sessionId);
                        if (recommendationsReadyRef.current) {
                            // RECOMMENDATIONS_READY already arrived before report fetch completed
                            if (fallbackTimerRef.current) {
                                clearTimeout(fallbackTimerRef.current);
                                fallbackTimerRef.current = null;
                            }
                            onReportReadyRef.current(result);
                        } else {
                            // Hold result in pending state until RECOMMENDATIONS_READY or 8s fallback timeout
                            pendingResultRef.current = result;
                            fallbackTimerRef.current = setTimeout(() => {
                                if (pendingResultRef.current) {
                                    const res = pendingResultRef.current;
                                    pendingResultRef.current = null;
                                    onReportReadyRef.current(res);
                                }
                            }, 8000);
                        }
                    } catch (err: any) {
                        console.error('Failed to fetch assessment report after REPORT_READY:', err);
                        setErrorMessage("Failed to load report results. Please try again.");
                        if (onErrorRef.current) onErrorRef.current(err?.message || "Failed to load report");
                    }
                } else if (notification.event === 'RECOMMENDATIONS_READY') {
                    recommendationsReadyRef.current = true;
                    if (onRecommendationsReadyRef.current) {
                        onRecommendationsReadyRef.current();
                    }
                    if (pendingResultRef.current) {
                        if (fallbackTimerRef.current) {
                            clearTimeout(fallbackTimerRef.current);
                            fallbackTimerRef.current = null;
                        }
                        const res = pendingResultRef.current;
                        pendingResultRef.current = null;
                        onReportReadyRef.current(res);
                    }
                } else if (notification.event === 'ASSESSMENT_FAILED') {
                    if (fallbackTimerRef.current) {
                        clearTimeout(fallbackTimerRef.current);
                        fallbackTimerRef.current = null;
                    }
                    const err = notification.error || "Analysis could not be completed";
                    setErrorMessage(err);
                    if (onErrorRef.current) onErrorRef.current(err);
                }
            },
            (error) => {
                console.warn('[STOMP] WebSocket transport error (will auto-reconnect):', error);
            }
        );

        return () => {
            if (fallbackTimerRef.current) {
                clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
            }
            unsubscribe();
        };
    }, [sessionId]);

    if (errorMessage) {
        return (
            <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background px-6">
                <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center text-2xl font-bold border border-error/20">
                        ✕
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                            Analysis Failed
                        </h2>
                        <p className="text-sm text-error mt-2">
                            {errorMessage}
                        </p>
                    </div>
                    {onRetry && (
                        <CadenceButton size="lg" variant="primary" onClick={onRetry} className="px-8 shadow-md">
                            Retry Assessment
                        </CadenceButton>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background px-6 overflow-hidden">
            {/* Visual Center - Orbital System */}
            <div className="relative w-72 h-72 flex items-center justify-center">
                {/* Core glowing orb */}
                <div className="absolute w-20 h-20 rounded-full bg-brand/30 shadow-[0_0_50px_rgba(79,70,229,0.4)] animate-pulse flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-brand" />
                </div>

                {/* Orbit 1 */}
                <motion.div
                    className="absolute w-48 h-48 rounded-full border border-dashed border-border"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                >
                    <div className="w-4 h-4 rounded-full bg-brand absolute -top-2 left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(79,70,229,0.6)]" />
                </motion.div>

                {/* Orbit 2 */}
                <motion.div
                    className="absolute w-64 h-64 rounded-full border border-dashed border-border/60"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                >
                    <div className="w-3.5 h-3.5 rounded-full bg-success absolute -bottom-1.5 left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
                </motion.div>
            </div>

            {/* Messages */}
            <div className="mt-10 text-center flex flex-col items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary tracking-tight">
                    AI Analysis in Progress
                </h2>
                <div className="h-8 relative overflow-hidden flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={statusMessage || currentStep}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                        >
                            <p className="text-sm sm:text-base font-medium text-text-secondary">
                                {statusMessage || steps[currentStep]}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Loading Bar */}
            <div className="w-full max-w-sm h-1.5 bg-elevated-surface border border-border rounded-full mt-8 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 25, ease: "linear" }}
                    className="h-full bg-brand rounded-full"
                />
            </div>
        </div>
    );
};

