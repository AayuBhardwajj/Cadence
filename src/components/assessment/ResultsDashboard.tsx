import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, Zap, CheckCircle2,
    AlertCircle, Lock, LayoutDashboard, Share2, FileText, X
} from 'lucide-react';
import { AnalysisResult } from '../../services/api';
import { AssessmentReport } from './AssessmentReport';
import { CadenceButton } from '../ui/CadenceButton';

interface ResultsDashboardProps {
    result: AnalysisResult;
    onRetry: () => void;
    userName: string;
    sessionId: string;
}

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {label}
            </span>
            <span className="text-sm font-bold" style={{ color }}>{value}/100</span>
        </div>
        <div className="h-2 bg-elevated-surface rounded-full overflow-hidden border border-border/50">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                style={{ height: '100%', background: color, borderRadius: '9999px' }}
            />
        </div>
    </div>
);

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, onRetry, userName, sessionId }) => {
    const { breakdown } = result;
    const [isReportOpen, setIsReportOpen] = useState(false);

    return (
        <div className="w-full max-w-5xl mx-auto py-6 md:py-12 px-4 sm:px-6 md:px-8">
            <div className="flex flex-col gap-10">
                {/* Header Scorecard */}
                {result.api_error && (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl mb-2">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-warning shrink-0" size={20} />
                            <div className="flex flex-col">
                                <span className="font-bold text-warning text-sm">AI Insights Throttled</span>
                                <span className="text-xs text-text-muted">
                                    Our advanced AI is currently experiencing high demand. We've provided a report based on our core heuristic engine.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 p-8 bg-surface rounded-3xl border border-border shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                            <div className="relative shrink-0">
                                <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-8 border-brand flex flex-col items-center justify-center shadow-lg shadow-brand/20">
                                    <span className="text-3xl md:text-4xl font-black text-text-primary">{result.overall_score}</span>
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">OVERALL</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center sm:items-start gap-4 text-center sm:text-left">
                                <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
                                    CEFR LEVEL: {result.cefr_level}
                                </span>
                                <h2 className="text-2xl font-bold text-text-primary">Assessment Snapshot</h2>
                                <p className="text-text-secondary text-sm leading-relaxed">
                                    {result.feedback}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-brand rounded-3xl flex flex-col items-center justify-center gap-4 text-white text-center shadow-sm">
                        <TrendingUp className="w-10 h-10" />
                        <div className="flex flex-col">
                            <span className="text-2xl font-black">Better than 60%</span>
                            <span className="text-xs font-bold opacity-80">of users at your level</span>
                        </div>
                    </div>
                </div>

                {/* Performance Breakdown */}
                <div className="p-8 bg-surface rounded-3xl border border-border shadow-sm flex flex-col gap-8">
                    <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                        <TrendingUp size={20} className="text-brand" /> Performance Breakdown
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <MetricBar label="Fluency" value={breakdown.fluency} color="#4F46E5" />
                        <MetricBar label="Pronunciation" value={breakdown.pronunciation} color="#8B5CF6" />
                        <MetricBar label="Grammar" value={breakdown.grammar} color="#10B981" />
                        <MetricBar label="Vocabulary" value={breakdown.vocabulary} color="#F59E0B" />
                        <MetricBar label="Clarity" value={breakdown.clarity} color="#EF4444" />
                        <MetricBar label="Confidence" value={breakdown.confidence} color="#EC4899" />
                    </div>
                </div>

                {/* Strengths & Focus Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-success/5 rounded-3xl border border-success/20 flex flex-col gap-6">
                        <h4 className="text-sm font-bold text-success flex items-center gap-2">
                            <CheckCircle2 size={18} /> Top Strengths
                        </h4>
                        <div className="flex flex-col gap-3">
                            {result.strengths.map((s, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Zap className="w-3.5 h-3.5 text-success shrink-0" />
                                    <span className="text-sm text-text-secondary">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 bg-warning/5 rounded-3xl border border-warning/20 flex flex-col gap-6">
                        <h4 className="text-sm font-bold text-warning flex items-center gap-2">
                            <AlertCircle size={18} /> Focus Areas
                        </h4>
                        <div className="flex flex-col gap-3">
                            {result.focus_areas.map((f, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                                    <span className="text-sm text-text-secondary">{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* PRO Features Preview (Locked) */}
                <div className="p-8 bg-surface rounded-3xl border border-border relative overflow-hidden shadow-sm">
                    <div className="flex flex-col gap-6 filter blur-[4px] pointer-events-none opacity-40 select-none">
                        <h3 className="text-lg font-bold text-text-primary">Detailed Word-by-Word Analysis</h3>
                        <p className="text-text-secondary">Your pronunciation of 'th' sounds in 'the' and 'through' was slightly muffled...</p>
                        <div className="border-t border-border" />
                        <h3 className="text-lg font-bold text-text-primary">Audio Playback Highlights</h3>
                        <div className="h-24 bg-elevated-surface rounded-xl w-full" />
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/75 dark:bg-surface/85 backdrop-blur-sm p-6 text-center">
                        <div className="flex flex-col items-center gap-4 max-w-md">
                            <div className="p-3 rounded-2xl bg-brand/10 text-brand">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-text-primary">Unlock PRO Insights</h3>
                            <p className="text-sm text-text-muted">
                                Get word-by-word corrections, audio highlights, and a 30-day improvement plan.
                            </p>
                            <CadenceButton
                                variant="primary"
                                className="rounded-full px-8 shadow-md"
                            >
                                Upgrade for $9.99/mo
                            </CadenceButton>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4">
                    <CadenceButton
                        variant="ghost"
                        leftIcon={<LayoutDashboard size={18} />}
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full sm:w-auto"
                    >
                        Back to Dashboard
                    </CadenceButton>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <CadenceButton
                            variant="primary"
                            leftIcon={<FileText size={18} />}
                            onClick={() => setIsReportOpen(true)}
                            className="w-full sm:w-auto shadow-md"
                        >
                            View Full Performance Report
                        </CadenceButton>
                        <CadenceButton
                            variant="outline"
                            leftIcon={<Share2 size={18} />}
                            className="w-full sm:w-auto"
                        >
                            Share
                        </CadenceButton>
                        <CadenceButton
                            variant="secondary"
                            onClick={onRetry}
                            className="w-full sm:w-auto"
                        >
                            New Assessment
                        </CadenceButton>
                    </div>
                </div>
            </div>

            {/* Performance Report Modal Overlay */}
            {isReportOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full Performance Report"
                >
                    <div className="relative w-full h-full max-h-screen overflow-y-auto bg-neutral-100 dark:bg-neutral-900">
                        <button
                            type="button"
                            onClick={() => setIsReportOpen(false)}
                            aria-label="Close report"
                            className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 shadow-lg border border-neutral-200 dark:border-neutral-700 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <AssessmentReport
                            userName={userName}
                            sessionId={sessionId}
                            result={result}
                            onClose={() => setIsReportOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
