import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic,
    MicOff,
    Square,
    RotateCcw,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Sparkles,
    Volume2,
    X,
    Flame,
    Award,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { EnhancedCard } from '../dashboard/EnhancedCard';
import {
    STATIC_DRILL_PHRASES,
    DRILL_BUCKETS,
    DrillPhrase
} from '../../data/drillContent';
import {
    startPracticeSession,
    submitDrillAttempt,
    completePracticeSession,
    PracticeSessionResponse,
    DrillAttemptApiResponse
} from '../../services/api';

interface DrillRecorderProps {
    onClose: () => void;
    initialBucket?: 'th_sound' | 'v_w_mix';
}

type RecordingStatus = 'initializing' | 'idle' | 'recording' | 'evaluating' | 'result' | 'completed' | 'error';

export function DrillRecorder({ onClose, initialBucket = 'th_sound' }: DrillRecorderProps) {
    const [selectedBucket, setSelectedBucket] = useState<'th_sound' | 'v_w_mix'>(initialBucket);
    const [session, setSession] = useState<PracticeSessionResponse | null>(null);
    const [status, setStatus] = useState<RecordingStatus>('initializing');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Phrases for the chosen bucket
    const bucketPhrases = React.useMemo(() => {
        return STATIC_DRILL_PHRASES.filter(p => p.bucket === selectedBucket);
    }, [selectedBucket]);

    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [attemptNumber, setAttemptNumber] = useState(1);
    const [lastAttempt, setLastAttempt] = useState<DrillAttemptApiResponse | null>(null);
    const [sessionAttempts, setSessionAttempts] = useState<DrillAttemptApiResponse[]>([]);

    // Timer (5 seconds hard cap per drill rep)
    const MAX_DURATION = 5;
    const [secondsLeft, setSecondsLeft] = useState(MAX_DURATION);

    // Audio stream & recorder refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerIntervalRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const currentPhrase: DrillPhrase | undefined = bucketPhrases[currentPhraseIndex];
    const bucketInfo = DRILL_BUCKETS[selectedBucket];

    // Initialize session on mount or bucket switch
    useEffect(() => {
        let isMounted = true;

        async function initSession() {
            try {
                setStatus('initializing');
                setErrorMessage(null);

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error("Please log in to start a practice drill.");
                }

                const newSession = await startPracticeSession(user.id, selectedBucket);
                if (!isMounted) return;

                setSession(newSession);
                setCurrentPhraseIndex(0);
                setAttemptNumber(1);
                setLastAttempt(null);
                setSessionAttempts([]);
                setStatus('idle');
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Failed to start drill session:", err);
                setErrorMessage(err.message || "Failed to initialize drill session.");
                setStatus('error');
            }
        }

        initSession();

        return () => {
            isMounted = false;
            stopMediaTracks();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [selectedBucket]);

    const stopMediaTracks = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    // Countdown during recording
    useEffect(() => {
        if (status === 'recording') {
            setSecondsLeft(MAX_DURATION);
            timerIntervalRef.current = setInterval(() => {
                setSecondsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current);
                        stopRecording();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [status]);

    const startRecording = async () => {
        setErrorMessage(null);
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stopMediaTracks();
                handleAudioUpload(audioBlob);
            };

            mediaRecorderRef.current = recorder;
            recorder.start(100);
            setStatus('recording');
        } catch (err: any) {
            console.error("Microphone access error:", err);
            setErrorMessage("Microphone access denied or unavailable. Please enable microphone permissions.");
            setStatus('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setStatus('evaluating');
        }
    };

    const handleAudioUpload = async (audioBlob: Blob) => {
        if (!session || !currentPhrase) return;

        setStatus('evaluating');
        setErrorMessage(null);

        try {
            const attemptRes = await submitDrillAttempt(
                session.sessionId,
                currentPhrase.targetText,
                attemptNumber,
                audioBlob
            );

            setLastAttempt(attemptRes);
            setSessionAttempts(prev => [...prev, attemptRes]);
            setStatus('result');
        } catch (err: any) {
            console.error("Submission error:", err);
            setErrorMessage(err.message || "Failed to analyze speech. Please verify the audio service is online and try again.");
            setStatus('error');
        }
    };

    const handleAdvanceNextPhrase = async () => {
        if (currentPhraseIndex < bucketPhrases.length - 1) {
            setCurrentPhraseIndex(prev => prev + 1);
            setAttemptNumber(1);
            setLastAttempt(null);
            setStatus('idle');
        } else {
            // All phrases finished -> complete session
            if (session) {
                try {
                    await completePracticeSession(session.sessionId);
                } catch (e) {
                    console.warn("Error marking session completed:", e);
                }
            }
            setStatus('completed');
        }
    };

    const handleRetryCurrentPhrase = () => {
        setAttemptNumber(prev => prev + 1);
        setLastAttempt(null);
        setErrorMessage(null);
        setStatus('idle');
    };

    // Metrics for completion screen
    const totalAttempts = sessionAttempts.length;
    const matchCount = sessionAttempts.filter(a => a.isMatch).length;
    const accuracy = totalAttempts > 0 ? Math.round((matchCount / totalAttempts) * 100) : 0;

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Header with Breadcrumb & Close */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Quick Practice Drill</h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                D17 V1
                            </span>
                        </div>
                        <p className="text-xs text-white/50">{bucketInfo?.title} • {bucketPhrases.length} Target Reps</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Bucket Switcher Pills */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                        <button
                            onClick={() => setSelectedBucket('th_sound')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg font-bold transition-all",
                                selectedBucket === 'th_sound' ? "bg-emerald-500 text-black shadow-md" : "text-white/60 hover:text-white"
                            )}
                        >
                            TH Sound
                        </button>
                        <button
                            onClick={() => setSelectedBucket('v_w_mix')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg font-bold transition-all",
                                selectedBucket === 'v_w_mix' ? "bg-emerald-500 text-black shadow-md" : "text-white/60 hover:text-white"
                            )}
                        >
                            V vs W
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        title="Close Drill"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-red-200 text-sm"
                    >
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                        <button
                            onClick={() => {
                                setErrorMessage(null);
                                setStatus('idle');
                            }}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Interactive Stage */}
            {status === 'completed' ? (
                /* Completed Session Summary */
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <EnhancedCard className="p-10 text-center space-y-8 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 animate-pulse" />
                            <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-3xl border border-emerald-400/30 inline-block relative">
                                <Award className="w-16 h-16" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-white tracking-tight">Drill Completed!</h3>
                            <p className="text-white/60 text-sm font-medium">
                                Great reps on <span className="text-emerald-400 font-bold">{bucketInfo.title}</span>.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-2xl font-black text-white">{bucketPhrases.length}</div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Phrases Cleared</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-2xl font-black text-emerald-400">{matchCount}</div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Clean Matches</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div className="text-2xl font-black text-amber-400">{accuracy}%</div>
                                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Accuracy</div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-4 pt-4">
                            <button
                                onClick={() => {
                                    setSelectedBucket(selectedBucket === 'th_sound' ? 'v_w_mix' : 'th_sound');
                                }}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all text-sm uppercase tracking-wider flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" /> Next Drill ({selectedBucket === 'th_sound' ? 'V vs W' : 'TH Sound'})
                            </button>
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                            >
                                Return to Practice
                            </button>
                        </div>
                    </EnhancedCard>
                </motion.div>
            ) : (
                /* Active Drill Card */
                <EnhancedCard className="relative overflow-hidden p-8 md:p-10 bg-slate-900/90 border-white/10 space-y-8">
                    {/* Progress Bar & Rep Indicator */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/60">
                            <span>Phrase {currentPhraseIndex + 1} of {bucketPhrases.length}</span>
                            <span className="text-amber-400 flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5" /> Attempt {attemptNumber}
                            </span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${((currentPhraseIndex + 1) / bucketPhrases.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>

                    {/* Target Phrase Box */}
                    <div className="p-8 bg-white/[0.03] rounded-3xl border border-white/10 text-center space-y-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[11px] font-bold text-emerald-400 uppercase tracking-widest border border-white/5">
                            <Volume2 className="w-3 h-3" /> Target Twister
                        </div>

                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug max-w-2xl mx-auto">
                            "{currentPhrase?.targetText}"
                        </h3>

                        {/* Phonetic Tip */}
                        <p className="text-xs text-white/40 max-w-md mx-auto italic">
                            💡 Tip: {bucketInfo?.tip}
                        </p>
                    </div>

                    {/* Result / Feedback Section */}
                    {status === 'result' && lastAttempt && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "p-6 rounded-2xl border text-center space-y-3",
                                lastAttempt.isMatch
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-200"
                            )}
                        >
                            <div className="flex items-center justify-center gap-2 font-black text-lg">
                                {lastAttempt.isMatch ? (
                                    <>
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                        <span>Spot on! Great pronunciation!</span>
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-6 h-6 text-amber-400" />
                                        <span>Attempt {attemptNumber} — let's try that again!</span>
                                    </>
                                )}
                            </div>

                            <div className="text-sm font-medium opacity-80">
                                Heard: <span className="font-bold font-mono">"{lastAttempt.transcribedText || '(silence)'}"</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex justify-center gap-3">
                                {lastAttempt.isMatch ? (
                                    <button
                                        onClick={handleAdvanceNextPhrase}
                                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        Next Phrase <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRetryCurrentPhrase}
                                        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                                    >
                                        Try Rep Again <RotateCcw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Controls & Recording Trigger */}
                    <div className="flex flex-col items-center justify-center space-y-4 pt-2">
                        {status === 'recording' ? (
                            <div className="flex flex-col items-center space-y-3">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={stopRecording}
                                    className="relative p-6 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-2xl shadow-red-600/40 transition-all flex items-center justify-center group"
                                >
                                    <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />
                                    <Square className="w-8 h-8 fill-current" />
                                </motion.button>
                                <div className="text-center">
                                    <div className="text-xs font-black text-red-400 uppercase tracking-widest font-mono">
                                        Recording • {secondsLeft}s left
                                    </div>
                                    <p className="text-[11px] text-white/40 mt-0.5">Tap button to finish early or speak the full line</p>
                                </div>
                            </div>
                        ) : status === 'evaluating' ? (
                            <div className="flex flex-col items-center space-y-3 py-4">
                                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                <div className="text-xs font-bold text-white/60 uppercase tracking-wider">
                                    Analyzing speech with Whisper...
                                </div>
                            </div>
                        ) : (
                            status !== 'result' && (
                                <div className="flex flex-col items-center space-y-3">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={startRecording}
                                        className="p-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-2xl shadow-emerald-500/40 transition-all flex items-center justify-center"
                                    >
                                        <Mic className="w-8 h-8" />
                                    </motion.button>
                                    <div className="text-center">
                                        <span className="text-xs font-black text-white uppercase tracking-widest">
                                            Tap Mic to Record (5s max)
                                        </span>
                                        <p className="text-[11px] text-white/40 mt-0.5">Speak clearly into your microphone</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </EnhancedCard>
            )}
        </div>
    );
}
