import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { StopCircle, RefreshCw, UploadCloud, Download } from 'lucide-react';
import { useAssessmentContent } from '../../hooks/useAssessmentContent';
import { CadenceButton } from '../ui/CadenceButton';

interface RecordingInterfaceProps {
    onRecordingComplete: (blob: Blob) => void;
    onCancel: () => void;
    userName?: string;
    topicId?: string;
    difficulty?: string;
    sessionId?: string | null;
}

export const RecordingInterface: React.FC<RecordingInterfaceProps> = ({
    onRecordingComplete,
    onCancel,
    userName = "User",
    topicId = "custom",
    difficulty = "intermediate",
    sessionId = null
}) => {
    const {
      data: assessmentContent,
      isLoading: contentLoading,
      isError: contentError,
    } = useAssessmentContent(topicId || '', difficulty || 'intermediate', sessionId);

    const isFullAssessment = topicId !== 'default'; // Assume 'default' is the old paragraph mode
    const MAX_TIME = isFullAssessment ? 300 : 60;
    const [recordingState, setRecordingState] = useState<'idle' | 'countdown' | 'recording' | 'completed' | 'paused'>('idle');
    const [timeLeft, setTimeLeft] = useState(MAX_TIME);
    const [countdown, setCountdown] = useState(3);
    const [activeTab, setActiveTab] = useState<'overview' | 'passage'>('overview');
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const streamRef = useRef<MediaStream | null>(null);

    // Acquire the camera stream once on mount
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            }).catch(console.error);

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Re-attach the stream once the <video> element actually mounts
    // (it doesn't exist yet while contentLoading is true, due to the early return below)
    useEffect(() => {
        if (!contentLoading && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [contentLoading]);

    // Countdown Logic
    useEffect(() => {
        if (recordingState === 'countdown') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                startRecording();
            }
        }
    }, [recordingState, countdown]);

    // Timer Logic
    useEffect(() => {
        if (recordingState === 'recording' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && recordingState === 'recording') {
            stopRecording();
        }
    }, [recordingState, timeLeft]);

    const startRecording = async () => {
        setTimeLeft(MAX_TIME);
        setRecordingState('recording');
        const stream = videoRef.current?.srcObject as MediaStream;
        if (!stream) return;

        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        chunksRef.current = [];
        recorder.ondataavailable = e => chunksRef.current.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setRecordingState('completed');
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleStartClick = () => {
        setRecordingState('countdown');
    };

    const cleanupStream = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleSubmit = () => {
        cleanupStream();
        if (recordedBlob) onRecordingComplete(recordedBlob);
    };

    // ── DEV-ONLY: temporary local download for test recordings ──────────────
    const handleDevDownload = () => {
        if (!recordedBlob) return;
        const url = URL.createObjectURL(recordedBlob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url;
        a.download = `cadence-recording-${sessionId ?? 'nosession'}-${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    // ── END DEV-ONLY ─────────────────────────────────────────────────────────

    if (contentLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-text-primary gap-4 px-4">
          <svg className="animate-spin w-10 h-10 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-text-muted">Generating your assessment...</p>
        </div>
      );
    }

    if (contentError || !assessmentContent) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background text-text-primary gap-4 px-4">
          <p className="text-sm font-medium text-error">Failed to load assessment content. Please try again.</p>
          <CadenceButton size="sm" variant="outline" onClick={onCancel}>Go Back</CadenceButton>
        </div>
      );
    }

    // For standard reading (not full assessment)
    const paragraph = `My name is ${userName}. Communication skills are very important in the modern workplace. When we work with others, we need to express our thoughts clearly and listen carefully. The weather today feels wonderful with warmth and sunshine. I believe regular practice, along with the right techniques, can help anyone improve their speaking abilities. Whether you're preparing for an interview, presentation, or simply want to feel more confident, dedication and consistency make all the difference. Remember, every small step forward brings you closer to your goals.`;

    const sessionProgress = ((MAX_TIME - timeLeft) / MAX_TIME) * 100;
    const progressSeconds = MAX_TIME - timeLeft;

    return (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-background text-text-primary overflow-y-auto">
            {/* Countdown Overlay */}
            {recordingState === 'countdown' && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-30 flex items-center justify-center">
                    <motion.div
                        key={countdown}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 1 }}
                        exit={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="text-8xl sm:text-9xl font-black text-brand tracking-tighter">{countdown}</span>
                    </motion.div>
                </div>
            )}

            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8 px-4 sm:px-6 md:px-8 py-6 my-auto items-stretch">
                {/* Left Panel: Video Feed */}
                <div className="w-full lg:w-[35%] flex flex-col gap-5">
                    <div
                        className={`w-full aspect-[4/3] rounded-3xl overflow-hidden bg-black border-2 relative shadow-lg transition-all duration-300 ${
                            recordingState === 'recording'
                                ? 'border-error shadow-[0_0_24px_rgba(239,68,68,0.3)]'
                                : recordingState === 'completed'
                                    ? 'border-success shadow-[0_0_24px_rgba(16,185,129,0.3)]'
                                    : 'border-border'
                        }`}
                    >
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

                        {recordingState === 'recording' && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-error/30 backdrop-blur-sm">
                                <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
                                <span className="text-xs font-bold text-error uppercase tracking-wider">REC</span>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="w-full flex items-center justify-center">
                        {recordingState === 'idle' && (
                            <CadenceButton
                                size="lg"
                                fullWidth
                                variant="primary"
                                className="h-14 text-base font-bold uppercase tracking-wider shadow-md"
                                onClick={handleStartClick}
                            >
                                START READING NOW
                            </CadenceButton>
                        )}
                        {recordingState === 'recording' && (
                            <div className="flex flex-col items-center gap-3 w-full">
                                <span
                                    className={`text-3xl sm:text-4xl font-mono font-black ${
                                        timeLeft < 10 ? 'text-error' : 'text-text-primary'
                                    }`}
                                >
                                    {timeLeft === 0 ? "00:00" : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                                </span>
                                <CadenceButton
                                    size="md"
                                    variant="danger"
                                    leftIcon={<StopCircle className="w-5 h-5" />}
                                    onClick={stopRecording}
                                    className="px-8 shadow-md"
                                >
                                    Finish Recording
                                </CadenceButton>
                                <p className="text-xs text-text-muted">Aim for at least 2:00 for a better score</p>
                            </div>
                        )}
                        {recordingState === 'completed' && (
                            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                                <CadenceButton
                                    size="md"
                                    variant="outline"
                                    leftIcon={<RefreshCw className="w-4 h-4" />}
                                    onClick={() => setRecordingState('idle')}
                                >
                                    Retry
                                </CadenceButton>

                                {/* DEV-ONLY: remove before shipping */}
                                <CadenceButton
                                    size="md"
                                    variant="secondary"
                                    leftIcon={<Download className="w-4 h-4" />}
                                    onClick={handleDevDownload}
                                    title="[DEV] Download raw .webm before upload"
                                    className="opacity-70 hover:opacity-100"
                                >
                                    [DEV] Save
                                </CadenceButton>
                                {/* END DEV-ONLY */}

                                <CadenceButton
                                    size="md"
                                    variant="primary"
                                    leftIcon={<UploadCloud className="w-4 h-4" />}
                                    onClick={handleSubmit}
                                    className="shadow-md"
                                >
                                    Analyze My Speech
                                </CadenceButton>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Reading */}
                <div className="w-full lg:w-[65%] min-h-[400px] p-6 sm:p-8 rounded-3xl bg-surface border border-border flex flex-col justify-between shadow-sm">
                    {!isFullAssessment ? (
                        <div className="flex flex-col flex-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">
                                Read the following paragraph aloud
                            </p>
                            <div className="p-6 sm:p-8 bg-elevated-surface rounded-2xl border border-dashed border-border flex-1 flex items-center justify-center text-center">
                                <p className="text-lg sm:text-xl md:text-2xl leading-relaxed font-semibold text-text-primary">
                                    {paragraph}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1">
                            {/* Tab Switcher */}
                            <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                                        activeTab === 'overview'
                                            ? 'bg-brand text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-elevated-surface'
                                    }`}
                                >
                                    Topic Overview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('passage')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all ${
                                        activeTab === 'passage'
                                            ? 'bg-brand text-white shadow-sm'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-elevated-surface'
                                    }`}
                                >
                                    Reading Passage
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto">
                                {activeTab === 'overview' ? (
                                    <div className="p-6 sm:p-8 bg-elevated-surface rounded-2xl border border-dashed border-border min-h-[240px] flex items-center justify-center text-center">
                                        <p className="text-base sm:text-xl md:text-2xl leading-relaxed font-bold text-text-primary">
                                            {assessmentContent?.topicPrompt}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-6 sm:p-8 bg-elevated-surface rounded-2xl border border-dashed border-border min-h-[240px] flex items-start text-left">
                                        <p className="text-sm sm:text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">
                                            {assessmentContent?.readingPassage}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Hints */}
                    {isFullAssessment && (
                        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-muted">
                            <span className="font-bold text-text-secondary uppercase tracking-wider">Tips for a high score:</span>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span>• Speak clearly</span>
                                <span>• Use the tabs for guidance</span>
                                <span>• Steady pace</span>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-6 pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-2">
                            <span>Session Progress</span>
                            <span>{Math.floor(progressSeconds / 60)}:{(progressSeconds % 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="w-full h-2 bg-elevated-surface border border-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(sessionProgress, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

