import React from 'react';
import { Download, CheckCircle, AlertTriangle, MonitorPlay } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { AnalysisResult } from '../../services/api';
import { AssessmentReportPDF } from './AssessmentReportPDF';
import { CadenceButton } from '../ui/CadenceButton';

interface AssessmentReportProps {
    userName: string;
    sessionId: string;
    result: AnalysisResult;
    onClose?: () => void;
}

const getColorClass = (score: number) => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-500";
    if (score >= 30) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-500";
};

const getDot = (score: number) => {
    if (score >= 70) return "🟢";
    if (score >= 30) return "🟡";
    return "🔴";
};

const PageBreak = () => (
    <div className="page-break my-8 border-b-2 border-dashed border-neutral-300 dark:border-neutral-700" />
);

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
    userName,
    sessionId,
    result,
    onClose
}) => {
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

    const m = result.amcat_metrics || {
        pronunciation: { score: 0, consonant: 0, vowel: 0, stress: 0 },
        fluency: { score: 0, rate: 0, pause: 0, fillers: 0 },
        intonation: { score: 0, sentence: 0, rise_fall: 0, pitch: 0 },
        clarity: { score: 0, end_consonants: 0, enunciation: 0, pace: 0 },
        mti: { score: 0, l1_interference: 0, retroflex: 0, vowel_shift: 0 },
        relevancy: { score: 0, feedback: "No topic relevancy feedback provided." }
    };
    const insights = result.amcat_insights || [];
    const mti_deep_dive = result.amcat_mti_deep_dive || { detected_accent: "None detected", patterns: [] };
    const transcript = result.amcat_transcript || {
        reference_text: "", user_text: "", error_words: [],
        stats: { total_words: 0, speech_rate_wpm: 0, ideal_wpm_range: "130-150", total_sentences: 0, avg_sentence_duration: 0, longest_pause: 0, filler_count: 0 },
        error_summary: { mispronunciation: 0, stutters: 0, unnatural_pauses: 0, filler_words: 0, mti_substitutions: 0 }
    };
    const error_log = result.amcat_error_log || [];
    const sentences = result.amcat_sentences || [];
    const summary = result.amcat_summary || { top_strengths: [], top_improvements: [], learning_resources: [] };

    const pdfFileName = `${userName.replace(/\s+/g, '_')}_Assessment_Report.pdf`;

    return (
        <div className="report-container p-4 sm:p-8 bg-neutral-100 dark:bg-neutral-950 min-h-screen text-neutral-800 dark:text-neutral-200">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4; margin: 15mm; }
                    html, body, #root, .chakra-layout, [data-reactroot], div[style*="overflow: auto"] { 
                        height: auto !important; 
                        min-height: auto !important;
                        overflow: visible !important; 
                        background: white !important;
                    }
                    .no-print { display: none !important; }
                    .report-container { padding: 0 !important; background: white !important; }
                    .page-break { page-break-after: always; clear: both; }
                    .print-box { box-shadow: none !important; padding: 0 !important; }
                }
            `}} />

            {/* ── Top action bar ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 no-print max-w-[900px] mx-auto">
                <CadenceButton
                    variant="ghost"
                    onClick={onClose}
                    className="self-start text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                    Back to Results
                </CadenceButton>

                <PDFDownloadLink
                    document={
                        <AssessmentReportPDF
                            userName={userName}
                            sessionId={sessionId}
                            result={result}
                        />
                    }
                    fileName={pdfFileName}
                >
                    {({ loading }) => (
                        <CadenceButton
                            variant="primary"
                            leftIcon={<Download size={18} />}
                            isLoading={loading}
                            loadingText="Preparing PDF…"
                            className="shadow-md"
                        >
                            Download Assessment Report (PDF)
                        </CadenceButton>
                    )}
                </PDFDownloadLink>
            </div>

            {/* ── On-screen preview ── */}
            <div id="assessment-report-content" className="print-box w-full max-w-[900px] mx-auto bg-white dark:bg-neutral-900 p-6 sm:p-12 shadow-2xl rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-100">

                {/* ======================= PAGE 1 ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <div className="flex flex-col gap-2 mb-8 border-b-4 border-neutral-800 dark:border-neutral-200 pb-4">
                        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-800 dark:text-neutral-100">
                            CADENCE SPEECH ASSESSMENT REPORT
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="text-sm sm:text-base font-bold text-neutral-700 dark:text-neutral-300">Confidential Candidate Analysis</span>
                            <span className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">Date: {today}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-10 bg-neutral-50 dark:bg-neutral-800/60 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">Candidate Name</span>
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{userName}</h2>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">Test ID</span>
                            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{sessionId.split('-')[0].toUpperCase()}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">Email</span>
                            <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">candidate@example.com</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">Phone</span>
                            <span className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300">+1 (555) 000-0000</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Score Dashboard</h2>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-neutral-700 dark:text-neutral-300">CEFR Level:</span>
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm sm:text-base font-bold bg-brand/10 text-brand border border-brand/20">
                                {result.cefr_level || 'B2'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                        {[
                            { name: "Topic Relevancy", score: m.relevancy?.score || 100 },
                            { name: "Pronunciation Accuracy", score: m.pronunciation.score },
                            { name: "MTI / Accent Neutrality", score: m.mti.score },
                            { name: "Fluency & Rhythm", score: m.fluency.score },
                            { name: "Intonation & Stress", score: m.intonation.score },
                            { name: "Clarity & Articulation", score: m.clarity.score }
                        ].map(dim => (
                            <div key={dim.name} className="p-5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm flex flex-col justify-between">
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-3 min-h-[32px]">{dim.name}</span>
                                <div className="flex items-center justify-between">
                                    <span className={`text-2xl font-black ${getColorClass(dim.score)}`}>
                                        {dim.score}<span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">/100</span>
                                    </span>
                                    <span className="text-2xl">{getDot(dim.score)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-6 border-b-2 border-neutral-100 dark:border-neutral-800 pb-2 text-neutral-900 dark:text-neutral-100">
                            Detailed Sub-Dimensions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                            <div className="flex flex-col gap-6">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">Pronunciation Accuracy</span>
                                        <span className={`font-bold ${getColorClass(m.pronunciation.score)}`}>{m.pronunciation.score}/100</span>
                                    </div>
                                    <div className="flex flex-col pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 gap-1 mt-1">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Consonant Accuracy</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.pronunciation.consonant}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Vowel Accuracy</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.pronunciation.vowel}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Word Stress Accuracy</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.pronunciation.stress}/100</span></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">Fluency & Rhythm</span>
                                        <span className={`font-bold ${getColorClass(m.fluency.score)}`}>{m.fluency.score}/100</span>
                                    </div>
                                    <div className="flex flex-col pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 gap-1 mt-1">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Speech Rate (WPM)</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.fluency.rate}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Pause Pattern</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.fluency.pause}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Filler Word Control</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.fluency.fillers}/100</span></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">MTI / Accent Neutrality</span>
                                        <span className={`font-bold ${getColorClass(m.mti.score)}`}>{m.mti.score}/100</span>
                                    </div>
                                    <div className="flex flex-col pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 gap-1 mt-1">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>L1 Phoneme Substitution</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.mti.l1_interference}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Retroflex Influence</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.mti.retroflex}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Vowel Shift Frequency</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.mti.vowel_shift}/100</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">Intonation & Stress</span>
                                        <span className={`font-bold ${getColorClass(m.intonation.score)}`}>{m.intonation.score}/100</span>
                                    </div>
                                    <div className="flex flex-col pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 gap-1 mt-1">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Sentence Stress</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.intonation.sentence}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Rise/Fall Patterns</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.intonation.rise_fall}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Pitch Variation</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.intonation.pitch}/100</span></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-neutral-800 dark:text-neutral-200">Clarity & Articulation</span>
                                        <span className={`font-bold ${getColorClass(m.clarity.score)}`}>{m.clarity.score}/100</span>
                                    </div>
                                    <div className="flex flex-col pl-3 border-l-2 border-neutral-200 dark:border-neutral-700 gap-1 mt-1">
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Consonant Endings</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.clarity.end_consonants}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Vowel Enunciation</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.clarity.enunciation}/100</span></div>
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-600 dark:text-neutral-400"><span>Pace Control</span><span className="font-bold text-neutral-800 dark:text-neutral-200">{m.clarity.pace}/100</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 2 ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        1 | Introduction
                    </h2>
                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-6 sm:p-8 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-8">
                        <h3 className="text-base sm:text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">About This Report</h3>
                        <p className="text-sm sm:text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            This report provides a detailed phonetic and fluency analysis of the candidate's spoken English.
                            The candidate was assessed through a read-aloud task in which standardized paragraphs were displayed on screen.
                            Analysis was performed across five core dimensions of spoken English quality.
                        </p>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">Score Interpretation</h3>
                    <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">All scores are on a scale of 0–100.</p>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                            <span className="text-2xl">🟢</span>
                            <div className="flex flex-col">
                                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-base sm:text-lg">70–100: Proficient</span>
                                <span className="text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">Candidate demonstrates clear, business-ready communication with minimal interference.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <span className="text-2xl">🟡</span>
                            <div className="flex flex-col">
                                <span className="font-bold text-amber-900 dark:text-amber-200 text-base sm:text-lg">30–69: Developing</span>
                                <span className="text-amber-700 dark:text-amber-400 text-xs sm:text-sm">Candidate is intelligible but demonstrates noticeable issues requiring targeted practice.</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-red-50 dark:bg-red-950/30 p-4 border border-red-200 dark:border-red-800 rounded-xl">
                            <span className="text-2xl">🔴</span>
                            <div className="flex flex-col">
                                <span className="font-bold text-red-900 dark:text-red-200 text-base sm:text-lg">0–29: Needs Significant Work</span>
                                <span className="text-red-700 dark:text-red-400 text-xs sm:text-sm">Candidate's speech frequently impedes comprehension; foundational training required.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 3: Insights ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        2 | Insights
                    </h2>
                    <div className="flex flex-col gap-6">
                        {insights.length > 0 ? insights.map((insight: any, idx: number) => (
                            <div key={idx} className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 bg-white dark:bg-neutral-800 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">{insight.dimension}</h3>
                                    <span className={`font-bold text-base sm:text-lg ${getColorClass(insight.score)}`}>
                                        {insight.score}/100 {getDot(insight.score)}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-3 italic">{insight.definition}</p>
                                <hr className="border-neutral-200 dark:border-neutral-700 mb-3" />
                                <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">{insight.feedback}</p>
                            </div>
                        )) : <p className="text-neutral-500 italic">Per-dimension insights are not available in this analysis mode.</p>}
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 4: MTI ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        MTI Deep Dive
                    </h2>
                    <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl">
                        <span className="font-bold text-red-900 dark:text-red-200 text-base sm:text-lg">
                            Detected L1 Influence: {mti_deep_dive.detected_accent || "No obvious accent detected"}
                        </span>
                    </div>
                    <div className="flex flex-col gap-8">
                        {mti_deep_dive.patterns.filter((p: any) => p.pattern && p.pattern.trim() !== '').length > 0
                            ? mti_deep_dive.patterns
                                .filter((item: any) => item.pattern && item.pattern.trim() !== '')
                                .map((item: any, idx: number) => (
                            <div key={idx} className="border-b border-neutral-200 dark:border-neutral-800 pb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">{item.pattern}</h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                        item.score > 60
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                            : item.score > 30
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    }`}>
                                        Score: {item.score}
                                    </span>
                                </div>
                                <div className="relative h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full mb-2">
                                    <span className="absolute -top-5 left-0 text-xs text-neutral-500">Rare</span>
                                    <span className="absolute -top-5 right-0 text-xs text-neutral-500">Frequent</span>
                                    <div
                                        className="absolute -top-1 w-4 h-4 bg-neutral-800 dark:bg-neutral-200 rounded-full -translate-x-1/2"
                                        style={{ left: `${item.score}%` }}
                                    />
                                </div>
                                <div className="mt-4 pl-4">
                                    <ul className="list-disc list-inside text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                                        {item.behaviors?.map((b: string, i: number) => <li key={i}>{b}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )) : <p className="text-neutral-500 italic">No specific MTI patterns detected.</p>}
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 5: Response ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        3 | Response
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3 flex flex-col gap-8">
                            <div>
                                <span className="font-bold text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wider block mb-2">
                                    Paragraph Displayed to Candidate:
                                </span>
                                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-6 border border-neutral-200 dark:border-neutral-700 rounded-xl italic text-neutral-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed">
                                    "{transcript.reference_text || 'Reference passage text is not available for this session.'}"
                                </div>
                            </div>
                            <div>
                                <span className="font-bold text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wider block mb-2">
                                    Candidate's Transcription (Auto-generated):
                                </span>
                                <div className="bg-white dark:bg-neutral-800 p-6 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 text-sm sm:text-base leading-relaxed">
                                    {transcript.user_text || 'Transcription unavailable.'}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="bg-neutral-800 text-white rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-brand p-3 text-center">
                                    <span className="font-bold text-sm uppercase tracking-wider">Error Summary</span>
                                </div>
                                <div className="flex flex-col divide-y divide-neutral-700">
                                    {[
                                        { label: "Mispronunciation", val: transcript.error_summary?.mispronunciation || 0 },
                                        { label: "Vocabulary Errors", val: transcript.error_summary?.vocabulary_errors || 0 },
                                        { label: "Stutters/Repetitions", val: transcript.error_summary?.stutters || 0 },
                                        { label: "Unnatural Pauses", val: transcript.error_summary?.unnatural_pauses || 0 },
                                        { label: "Filler Words", val: transcript.error_summary?.filler_words || 0 },
                                        { label: "MTI Substitutions", val: transcript.error_summary?.mti_substitutions || 0 }
                                    ].map((row, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3">
                                            <span className="text-xs sm:text-sm">{row.label}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300">
                                                {row.val}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                                <div className="bg-neutral-100 dark:bg-neutral-800 p-3 text-center border-b border-neutral-200 dark:border-neutral-700">
                                    <span className="font-bold text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                                        Speech Statistics
                                    </span>
                                </div>
                                <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {[
                                        { label: "Total Words Spoken", val: transcript.stats?.total_words || "N/A" },
                                        { label: "Speech Rate", val: (transcript.stats?.speech_rate_wpm || "N/A") + " WPM" },
                                        { label: "Ideal Range", val: transcript.stats?.ideal_wpm_range || "130-150" },
                                        { label: "Total Sentences", val: transcript.stats?.total_sentences || "N/A" },
                                        { label: "Avg Sentence Length", val: (transcript.stats?.avg_sentence_duration || "N/A") + " sec" },
                                        { label: "Longest Pause", val: (transcript.stats?.longest_pause || "N/A") + " sec" }
                                    ].map((row, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3">
                                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{row.label}</span>
                                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{String(row.val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 6: Error Log ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        Word-Level Error Log
                    </h2>
                    {(() => {
                        const visibleErrors = (error_log || []).filter((err: any) => !err.excluded_from_scoring);
                        const omissionEntry = (error_log || []).find((err: any) => err.error_type === "large_omission");
                        const omittedCount = omissionEntry && omissionEntry.word ? omissionEntry.word.trim().split(/\s+/).length : 0;

                        return (
                            <>
                                {omissionEntry && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-amber-900 dark:text-amber-200">Passage Completion Notice</span>
                                            <span className="text-xs text-amber-800 dark:text-amber-400">
                                                Approximately {omittedCount} words of the reference passage were not read in this recording.
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {visibleErrors.length === 0 ? (
                                    <p className="text-neutral-500 italic">No specific word-level errors were heavily detected.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-xl overflow-hidden">
                                            <thead className="bg-neutral-50 dark:bg-neutral-700/50 text-neutral-600 dark:text-neutral-300 text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Timestamp</th>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Word</th>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Candidate Said</th>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Correct Form</th>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Error Type</th>
                                                    <th className="p-3 border-b border-neutral-200 dark:border-neutral-700">Severity</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
                                                {visibleErrors.map((err: any, i: number) => (
                                                    <tr key={i} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-750">
                                                        <td className="p-3 text-xs text-neutral-500">{err.timestamp}</td>
                                                        <td className="p-3 font-bold text-neutral-900 dark:text-neutral-100">"{err.word}"</td>
                                                        <td className="p-3 text-red-600 dark:text-red-400 font-medium">"{err.said_as}"</td>
                                                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">"{err.correct_ipa}"</td>
                                                        <td className="p-3 text-neutral-700 dark:text-neutral-300">{err.error_type} ({err.category})</td>
                                                        <td className="p-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                                err.severity === 'major'
                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                                    : err.severity === 'moderate'
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                                                            }`}>
                                                                {err.severity}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                <PageBreak />

                {/* ======================= PAGE 7: Sentence Breakdown ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        Sentence-by-Sentence Breakdown
                    </h2>
                    <div className="flex flex-col gap-6">
                        {sentences.length > 0 ? sentences.map((sentence: any, idx: number) => (
                            <div key={idx} className="border-l-4 border-brand bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-r-xl">
                                <h3 className="font-bold text-base mb-3 text-neutral-900 dark:text-neutral-100">
                                    Sentence {idx + 1}: "{sentence.text}"
                                </h3>
                                <div className="grid grid-cols-1 gap-2 pl-4">
                                    {[
                                        { label: "Pronunciation Issues", val: sentence.pronunciation_issues },
                                        { label: "Fluency", val: sentence.fluency },
                                        { label: "MTI Detected", val: sentence.mti_detected },
                                        { label: "Rhythm", val: sentence.rhythm },
                                        { label: "Intonation", val: sentence.intonation },
                                    ].map((row, i) => (
                                        <p key={i} className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                                            <span className="font-bold text-neutral-600 dark:text-neutral-400">{row.label}: </span>
                                            {row.val}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )) : <p className="text-neutral-500 italic">Sentence-level analysis is not available for this session.</p>}
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 8: Learning Resources ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        4 | Learning Resources
                    </h2>
                    <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8 bg-brand/5 p-6 rounded-xl border border-brand/20">
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand">Overall Speech Score</span>
                            <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-neutral-100">
                                {result.overall_score || 58}<span className="text-sm font-normal text-neutral-500">/100</span>
                            </span>
                        </div>
                        <div className="h-12 w-px bg-brand/30" />
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-brand">CEFR Speaking Level</span>
                            <span className="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-neutral-100">
                                {result.cefr_level || 'B1'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-10">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center gap-2 mb-4">
                                <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                                <h3 className="font-bold text-base sm:text-lg text-emerald-900 dark:text-emerald-200">Top Strengths</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                {summary.top_strengths?.map((str: string, i: number) => (
                                    <span key={i} className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">• {str}</span>
                                )) || <span className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">No defined strengths collected.</span>}
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-xl border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                                <h3 className="font-bold text-base sm:text-lg text-red-900 dark:text-red-200">Priority Improvements</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                                {summary.top_improvements?.map((imp: string, i: number) => (
                                    <span key={i} className="text-xs sm:text-sm text-red-800 dark:text-red-300">• {imp}</span>
                                )) || <span className="text-xs sm:text-sm text-red-800 dark:text-red-300">No priority improvements derived.</span>}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold mb-4 text-neutral-900 dark:text-neutral-100">Personalized Learning Resources</h3>
                    <div className="flex flex-col gap-6">
                        {summary.learning_resources?.map((res: any, idx: number) => (
                            <div key={idx}>
                                <h4 className="font-bold text-sm sm:text-base mb-3 text-neutral-800 dark:text-neutral-200">{res.area}</h4>
                                <div className="flex flex-col gap-2">
                                    {res.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-white dark:bg-neutral-800 p-3 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <MonitorPlay size={16} className="text-neutral-500" />
                                                <span className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.title}</span>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                item.type === 'YouTube'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                    : 'bg-brand/10 text-brand'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )) || <p className="text-neutral-500 italic">No specific learning resources matched yet.</p>}
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 8.5: Grammar Errors ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        Grammar Errors Detected
                    </h2>
                    <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
                        The following grammatical inaccuracies were identified in the candidate's spoken response.
                        Each entry shows the original phrasing, the corrected form, and the rule being applied.
                    </p>
                    {(result.grammar_errors && result.grammar_errors.length > 0) ? (
                        <div className="flex flex-col gap-4">
                            {result.grammar_errors.map((err, idx) => (
                                <div
                                    key={idx}
                                    className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 bg-white dark:bg-neutral-800 shadow-sm"
                                >
                                    <div className="flex items-start gap-3 mb-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0 mt-0.5">
                                            #{idx + 1}
                                        </span>
                                        <p className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                            {err.rule}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-9">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Original</span>
                                            <span className="text-sm text-neutral-800 dark:text-neutral-200 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 leading-relaxed">
                                                "{err.original}"
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Corrected</span>
                                            <span className="text-sm text-neutral-800 dark:text-neutral-200 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 leading-relaxed">
                                                "{err.corrected}"
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-neutral-500 italic">No specific grammar errors were flagged in this session.</p>
                    )}
                </div>

                <PageBreak />

                {/* ======================= PAGE 9: 3-Week Plan ======================= */}

                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        5 | 3-Week Improvement Plan
                    </h2>
                    <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
                        This structured plan is designed to address your specific weaknesses identified during this assessment.
                    </p>
                    <div className="flex flex-col gap-8">
                        {(result as any).improvement_plan ? Object.entries((result as any).improvement_plan).map(([week, data]: [string, any]) => (
                            <div key={week} className="p-6 bg-brand/5 rounded-xl border border-brand/20 relative pt-7">
                                <span className="absolute -top-3 left-5 px-3 py-0.5 rounded-full text-xs font-bold bg-brand text-white shadow-sm">
                                    {week.replace('_', ' ').toUpperCase()}
                                </span>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-base sm:text-lg text-brand">Focus: {data.focus}</h3>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                        {data.daily_minutes} mins / day
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-brand/15 shadow-sm">
                                    <span className="font-bold text-xs uppercase tracking-wider text-neutral-500 block mb-1">Daily Exercise:</span>
                                    <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">{data.exercise}</p>
                                </div>
                            </div>
                        )) : <p className="text-neutral-500 italic">A personalized improvement plan is not available for this session.</p>}
                    </div>
                </div>

                <PageBreak />

                {/* ======================= PAGE 10: Practice ======================= */}
                <div className="pdf-page min-h-[950px]">
                    <h2 className="text-xl font-bold mb-6 border-b-2 border-neutral-800 dark:border-neutral-200 pb-2 text-brand">
                        6 | Recommended Practice
                    </h2>
                    <p className="mb-8 text-sm text-neutral-600 dark:text-neutral-400">
                        Immediate actions you can take to see improvement in your communication clarity and flow.
                    </p>
                    <div className="grid grid-cols-1 gap-6">
                        {(result as any).practice_exercises?.map((ex: any, idx: number) => (
                            <div key={idx} className="p-6 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm bg-white dark:bg-neutral-800">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-brand/10 text-brand">
                                            <MonitorPlay size={20} />
                                        </div>
                                        <h3 className="font-bold text-base sm:text-lg text-neutral-800 dark:text-neutral-200">{ex.title}</h3>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                        {ex.duration_minutes} MINS
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed pl-11">{ex.description}</p>
                            </div>
                        )) || <p className="text-neutral-500 italic">No practice exercises suggested for this session.</p>}
                    </div>
                    <div className="mt-12 p-6 bg-neutral-900 text-white rounded-xl shadow-sm flex items-start sm:items-center gap-4">
                        <AlertTriangle className="text-amber-400 shrink-0" size={24} />
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-neutral-300">Suggested Next Topic:</span>
                            <span className="text-base sm:text-lg italic font-semibold text-white">"{(result as any).next_topic_suggestion || "Public Speaking Basics"}"</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center mt-12 border-t border-neutral-200 dark:border-neutral-700 pt-8 no-print">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">--- END OF REPORT ---</span>
                </div>
            </div>
        </div>
    );
};