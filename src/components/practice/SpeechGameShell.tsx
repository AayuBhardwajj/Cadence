import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Flame,
  Volume2,
  X,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Award,
  RefreshCw,
  AlertCircle,
  Video,
  Mic,
} from "lucide-react";
import { useMachine } from "@xstate/react";
import Phaser from "phaser";
import { utils } from "@ricky0123/vad-web";

import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";
import { perfProbe } from "../../lib/perfProbe";
import { EnhancedCard } from "../dashboard/EnhancedCard";
import {
  STATIC_DRILL_PHRASES,
  DRILL_BUCKETS,
  DrillPhrase,
} from "../../data/drillContent";
import {
  startPracticeSession,
  submitDrillAttempt,
  completePracticeSession,
  PracticeSessionResponse,
} from "../../services/api";
import { useSpeechSensing } from "../../hooks/useSpeechSensing";
import { useFaceSensing } from "../../hooks/useFaceSensing";
import { speechGameMachine } from "../../game/speechGameMachine";
import { SpeechRunnerScene, RunnerState } from "../../game/SpeechRunnerScene";

interface SpeechGameShellProps {
  onClose: () => void;
  initialBucket?: "th_sound" | "v_w_mix";
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Memoized Phaser Canvas Host Component (Created once, avoids shell re-renders)
 * ────────────────────────────────────────────────────────────────────────── */
interface PhaserHostProps {
  runnerState: RunnerState;
  onSceneReady?: (scene: SpeechRunnerScene) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const PhaserHost: React.FC<PhaserHostProps> = React.memo(
  ({ runnerState, onSceneReady, videoRef }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const phaserGameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<SpeechRunnerScene | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: 720,
        height: 200,
        backgroundColor: "#0f172a",
        scene: [SpeechRunnerScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: {
          transparent: false,
        },
      };

      const game = new Phaser.Game(config);
      phaserGameRef.current = game;

      game.events.once("ready", () => {
        const scene = game.scene.getScene("SpeechRunnerScene") as SpeechRunnerScene;
        sceneRef.current = scene;
        if (onSceneReady) {
          onSceneReady(scene);
        }
      });

      return () => {
        game.destroy(true);
        phaserGameRef.current = null;
        sceneRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.setState(runnerState);
      }
    }, [runnerState]);

    return (
      <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950">
        <div
          ref={containerRef}
          className="w-full flex justify-center items-center"
          style={{ minHeight: 200 }}
        />
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 90,
            height: 68,
            borderRadius: 8,
            opacity: 0.25,
            pointerEvents: "none",
            objectFit: "cover",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        />
      </div>
    );
  }
);
PhaserHost.displayName = "PhaserHost";

/* ─────────────────────────────────────────────────────────────────────────────
 * Memoized HUD Component (Reads VAD & Face metrics via ≤4 Hz timer / refs)
 * ────────────────────────────────────────────────────────────────────────── */
interface SpeechGameHUDProps {
  speechSensingStatus: string;
  speechProbRef: React.MutableRefObject<number>;
  faceSensingStatus: string;
  faceFps: number;
}

const SpeechGameHUD: React.FC<SpeechGameHUDProps> = React.memo(
  ({ speechSensingStatus, speechProbRef, faceSensingStatus, faceFps }) => {
    const [liveProb, setLiveProb] = useState<number>(0);

    // Poll high-frequency VAD speech probability at 4 Hz (250ms) to avoid shell re-renders
    useEffect(() => {
      const timer = setInterval(() => {
        setLiveProb(speechProbRef.current || 0);
      }, 250);
      return () => clearInterval(timer);
    }, [speechProbRef]);

    return (
      <div className="flex items-center justify-between text-[11px] text-white/40 px-2 pt-2 border-t border-white/5 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            VAD: {speechSensingStatus === "active" ? "Active" : speechSensingStatus} (Prob: {(liveProb * 100).toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-sky-400" />
            Face Tracker: {faceSensingStatus === "active" ? `${faceFps} fps` : faceSensingStatus}
          </span>
        </div>
        <span>Speak clearly into your microphone to run</span>
      </div>
    );
  }
);
SpeechGameHUD.displayName = "SpeechGameHUD";

/* ─────────────────────────────────────────────────────────────────────────────
 * Memoized Progress Bar Component (Uses transform scaleX to prevent layout reflows)
 * ────────────────────────────────────────────────────────────────────────── */
interface ProgressBarProps {
  progressRatio: number;
}

const ProgressBar: React.FC<ProgressBarProps> = React.memo(({ progressRatio }) => {
  return (
    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-transform duration-300 ease-out origin-left"
        style={{
          transform: `scaleX(${Math.max(0, Math.min(1, progressRatio))})`,
        }}
      />
    </div>
  );
});
ProgressBar.displayName = "ProgressBar";

/* ─────────────────────────────────────────────────────────────────────────────
 * Main Speech Game Shell Container
 * ────────────────────────────────────────────────────────────────────────── */
export const SpeechGameShell: React.FC<SpeechGameShellProps> = ({
  onClose,
  initialBucket = "th_sound",
}) => {
  if (perfProbe.isEnabled()) {
    perfProbe.markRender();
  }

  const [selectedBucket, setSelectedBucket] = useState<"th_sound" | "v_w_mix">(
    initialBucket
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamStatus, setStreamStatus] = useState<"requesting" | "ready" | "error">("requesting");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [session, setSession] = useState<PracticeSessionResponse | null>(null);
  const [isStillChecking, setIsStillChecking] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const sceneRef = useRef<SpeechRunnerScene | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // XState Game Machine
  const [state, send] = useMachine(speechGameMachine);

  // Filter phrases for the active bucket
  const bucketPhrases = React.useMemo(() => {
    return STATIC_DRILL_PHRASES.filter((p) => p.bucket === selectedBucket);
  }, [selectedBucket]);

  const bucketInfo = DRILL_BUCKETS[selectedBucket];
  const currentPhrase: DrillPhrase | undefined =
    state.context.phrases[state.context.currentPhraseIndex] ||
    bucketPhrases[state.context.currentPhraseIndex];

  // 1. Single Unified MediaStream Request ({ audio: constraints, video: constraints })
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    async function initMedia() {
      try {
        setStreamStatus("requesting");
        setStreamError(null);

        console.log("[SpeechGameShell] Requesting unified getUserMedia...");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 },
          },
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);
        setStreamStatus("ready");

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch((e) => console.warn("Video play notice:", e));
        }
      } catch (err: any) {
        console.error("[SpeechGameShell] Stream Error:", err);
        setStreamError(err.message || "Failed to acquire camera and microphone permissions.");
        setStreamStatus("error");
      }
    }

    initMedia();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 2. Pure Face Sensing Hook (MediaPipe 5 Hz capped, opt-in degradation & cosmetic ref-dispatch)
  const faceSensing = useFaceSensing({
    delegate: "GPU",
    throttleHz: 5,
    adaptiveDegradation: true,
    pauseOnHidden: true,
    cosmeticOnly: true,
    debug: false,
    onEvent: (ev) => {
      sceneRef.current?.setJawOpen(ev.jawOpen);
    },
  });

  // Start face sensing when stream & video element are ready
  useEffect(() => {
    if (streamStatus === "ready" && videoRef.current) {
      faceSensing.start(videoRef.current);
    }
    return () => {
      faceSensing.stop();
    };
  }, [streamStatus]);

  // 3. Audio Utterance Submission Helper (Whisper backend evaluation)
  const handleUtteranceAudio = useCallback(
    async (audioData: Float32Array) => {
      if (isSubmittingRef.current || !session || !currentPhrase) return;
      isSubmittingRef.current = true;

      try {
        const tEncodeStart = perfProbe.isEnabled() ? performance.now() : 0;
        const wavBuffer = utils.encodeWAV(audioData, 1, 16000, 1, 16);
        const wavBlob = new Blob([wavBuffer], { type: "audio/wav" });
        if (perfProbe.isEnabled()) {
          perfProbe.recordEncodeWav(performance.now() - tEncodeStart);
        }

        const tVerdictStart = perfProbe.isEnabled() ? performance.now() : 0;
        const result = await submitDrillAttempt(
          session.sessionId,
          currentPhrase.targetText,
          state.context.attemptNumber,
          wavBlob
        );
        if (perfProbe.isEnabled()) {
          perfProbe.recordVerdictRtt(performance.now() - tVerdictStart);
        }

        if (result.isMatch) {
          send({
            type: "VERDICT_SUCCESS",
            transcribedText: result.transcribedText,
            wer: result.wer,
          });
        } else {
          send({
            type: "VERDICT_ERROR",
            transcribedText: result.transcribedText,
            wer: result.wer,
          });
        }
      } catch (err: any) {
        console.error("[SpeechGameShell] Submission error:", err);
        send({
          type: "VERDICT_FAILURE",
          errorMessage: err.message || "Speech analysis failed. Please try again.",
        });
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [session, currentPhrase, state.context.attemptNumber, send]
  );

  // 4. Pure Speech Sensing Hook (Silero VAD)
  const speechSensing = useSpeechSensing({
    stream,
    pauseDetectionDelayMs: 350,
    pauseTimeoutThresholdMs: 1800,
    debug: false,
    onEvent: (ev) => {
      switch (ev.type) {
        case "SPEECH_START":
          send({ type: "SPEECH_START", timestamp: ev.timestamp });
          break;
        case "SPEECH_END":
          send({
            type: "SPEECH_END",
            timestamp: ev.timestamp,
            audio: ev.audio,
          });
          if (ev.audio && ev.audio.length > 0) {
            handleUtteranceAudio(ev.audio);
          }
          break;
        case "PAUSE_DETECTED":
          send({
            type: "PAUSE_DETECTED",
            timestamp: ev.timestamp,
            pauseDurationMs: ev.pauseDurationMs,
          });
          break;
        case "PAUSE_TIMEOUT":
          send({
            type: "PAUSE_TIMEOUT",
            timestamp: ev.timestamp,
            pauseDurationMs: ev.pauseDurationMs,
          });
          break;
      }
    },
  });

  // 5. Initialize Backend Session & Seed Phrases into Machine
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Please log in to start a practice session.");
        }

        const newSession = await startPracticeSession(user.id, selectedBucket);
        if (!isMounted) return;

        setSession(newSession);
        send({
          type: "SET_PHRASES",
          phrases: bucketPhrases,
          sessionId: newSession.sessionId,
        });
      } catch (err: any) {
        console.error("[SpeechGameShell] Failed to start practice session:", err);
        setStreamError(err.message || "Failed to initialize practice session.");
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [selectedBucket]);

  // 6. Monitor 5s verdict timeout
  useEffect(() => {
    let timer: any = null;
    if (state.matches("awaiting_verdict")) {
      setIsStillChecking(false);
      timer = setTimeout(() => {
        setIsStillChecking(true);
      }, 5000);
    } else {
      setIsStillChecking(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [state.value]);

  // 7. Map XState Machine State -> Phaser RunnerState
  const runnerState: RunnerState = React.useMemo(() => {
    if (state.matches("idle") || state.matches("listening")) return "idle";
    if (state.matches("speaking") || state.matches("pause_warning")) return "running";
    if (state.matches("awaiting_verdict")) return "coasting";
    if (state.matches("word_error") || state.matches("pause_timeout_fail")) return "stumble";
    if (state.matches("phrase_success") || state.matches("level_complete")) return "success";
    return "idle";
  }, [state.value]);

  // Mark session complete when level finishes
  useEffect(() => {
    if (state.matches("level_complete") && session) {
      completePracticeSession(session.sessionId).catch((e) =>
        console.warn("Session completion notice:", e)
      );
    }
  }, [state, session]);

  const handleNextPhrase = () => {
    send({ type: "NEXT_PHRASE" });
  };

  const handleRetryPhrase = () => {
    send({ type: "RETRY_PHRASE" });
  };

  const handleSceneReady = useCallback((scene: SpeechRunnerScene) => {
    sceneRef.current = scene;
  }, []);

  const progressRatio =
    (state.context.currentPhraseIndex + 1) / (bucketPhrases.length || 1);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header with Breadcrumbs & Bucket Switcher */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Speech Runner
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Phase A
              </span>
            </div>
            <p className="text-xs text-white/50">
              {bucketInfo?.title} • {bucketPhrases.length} Target Reps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Bucket Switcher */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setSelectedBucket("th_sound")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all",
                selectedBucket === "th_sound"
                  ? "bg-indigo-500 text-white shadow-md"
                  : "text-white/60 hover:text-white"
              )}
            >
              TH Sound
            </button>
            <button
              onClick={() => setSelectedBucket("v_w_mix")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-all",
                selectedBucket === "v_w_mix"
                  ? "bg-indigo-500 text-white shadow-md"
                  : "text-white/60 hover:text-white"
              )}
            >
              V vs W
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Exit Practice Drill"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Permission / Stream Error Banner */}
      <AnimatePresence>
        {streamError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-between gap-3 text-red-200 text-sm"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{streamError}</span>
            </div>
            <button
              onClick={() => setStreamError(null)}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-lg transition-colors uppercase tracking-wider"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interactive Stage */}
      {state.matches("level_complete") ? (
        /* Completion Summary Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <EnhancedCard className="p-10 text-center space-y-8 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/30">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-indigo-400 blur-2xl opacity-20 animate-pulse" />
              <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-3xl border border-indigo-400/30 inline-block relative">
                <Award className="w-16 h-16" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-3xl font-black text-white tracking-tight">
                Level Complete! 🎉
              </h3>
              <p className="text-white/60 text-sm font-medium">
                Awesome fluency reps on{" "}
                <span className="text-indigo-400 font-bold">
                  {bucketInfo?.title}
                </span>
                .
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-2xl font-black text-white">
                  {bucketPhrases.length}
                </div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                  Target Phrases Cleared
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="text-2xl font-black text-emerald-400">
                  {state.context.totalCompleted}
                </div>
                <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                  Verified Matches
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => {
                  setSelectedBucket(
                    selectedBucket === "th_sound" ? "v_w_mix" : "th_sound"
                  );
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all text-sm uppercase tracking-wider flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Next Drill (
                {selectedBucket === "th_sound" ? "V vs W" : "TH Sound"})
              </button>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-black rounded-xl transition-all text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20"
              >
                Return to Practice
              </button>
            </div>
          </EnhancedCard>
        </motion.div>
      ) : (
        /* Active Game Runner Card */
        <EnhancedCard className="relative overflow-hidden p-6 md:p-8 bg-slate-900/90 border-white/10 space-y-6">
          {/* Top Indicators: Progress & Attempt Count */}
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/60">
            <span>
              Phrase {state.context.currentPhraseIndex + 1} of{" "}
              {bucketPhrases.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Attempt{" "}
                {state.context.attemptNumber}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  state.matches("speaking")
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : state.matches("awaiting_verdict")
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse"
                    : state.matches("pause_warning")
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-white/5 text-white/40 border-white/10"
                )}
              >
                {state.matches("speaking")
                  ? "Speaking"
                  : state.matches("awaiting_verdict")
                  ? "Analyzing"
                  : state.matches("pause_warning")
                  ? "Pause Detected"
                  : "Listening"}
              </span>
            </div>
          </div>

          {/* Progress Bar (Memoized, transform scaleX) */}
          <ProgressBar progressRatio={progressRatio} />

          {/* Phaser 2D Runner Game Viewport (Memoized Host) */}
          <PhaserHost
            runnerState={runnerState}
            onSceneReady={handleSceneReady}
            videoRef={videoRef}
          />

          {/* Target Phrase Typography Banner */}
          <div className="p-6 md:p-8 bg-white/[0.03] rounded-3xl border border-white/10 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-400 uppercase tracking-widest border border-indigo-500/20">
              <Volume2 className="w-3 h-3" /> Target Twister
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug max-w-2xl mx-auto">
              "{currentPhrase?.targetText}"
            </h3>

            <p className="text-xs text-white/40 max-w-md mx-auto italic">
              💡 Tip: {bucketInfo?.tip}
            </p>
          </div>

          {/* Dynamic State Overlay Cards (Framer Motion - Opacity / Transform Animations) */}
          <AnimatePresence mode="wait">
            {/* Coasting / Awaiting Verdict */}
            {state.matches("awaiting_verdict") && (
              <motion.div
                key="coasting"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-3 text-amber-200 text-sm font-medium"
              >
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  {isStillChecking
                    ? "Still checking... processing speech verdict with Whisper..."
                    : "Coasting & analyzing pronunciation with Whisper..."}
                </span>
              </motion.div>
            )}

            {/* Phrase Success Beat */}
            {state.matches("phrase_success") && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3"
              >
                <div className="flex items-center justify-center gap-2 font-black text-lg text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span>Spot on! Great pronunciation!</span>
                </div>
                {state.context.lastTranscribedText && (
                  <div className="text-xs text-emerald-200/80">
                    Heard:{" "}
                    <span className="font-mono font-bold">
                      "{state.context.lastTranscribedText}"
                    </span>
                  </div>
                )}
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleNextPhrase}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Next Phrase <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Word Error (Neutral copy per D19/§10) */}
            {state.matches("word_error") && (
              <motion.div
                key="word_error"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3"
              >
                <div className="flex items-center justify-center gap-2 font-black text-lg text-amber-300">
                  <RotateCcw className="w-6 h-6 text-amber-400" />
                  <span>Let's try that phrase again</span>
                </div>
                {state.context.lastTranscribedText && (
                  <div className="text-xs text-amber-200/80">
                    Heard:{" "}
                    <span className="font-mono font-bold">
                      "{state.context.lastTranscribedText}"
                    </span>
                  </div>
                )}
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleRetryPhrase}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Try Rep Again <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Pause Timeout Fail */}
            {state.matches("pause_timeout_fail") && (
              <motion.div
                key="pause_timeout"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3"
              >
                <div className="flex items-center justify-center gap-2 font-black text-lg text-rose-300">
                  <AlertCircle className="w-6 h-6 text-rose-400" />
                  <span>Natural pause exceeded — let's try the phrase again!</span>
                </div>
                <p className="text-xs text-rose-200/70">
                  Keep a continuous speaking cadence without stopping for more than 1.8s.
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={handleRetryPhrase}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black rounded-xl text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-rose-500/20"
                  >
                    Try Rep Again <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sensing HUD status (Memoized Component) */}
          <SpeechGameHUD
            speechSensingStatus={speechSensing.status}
            speechProbRef={speechSensing.speechProbRef}
            faceSensingStatus={faceSensing.status}
            faceFps={faceSensing.fps}
          />
        </EnhancedCard>
      )}
    </div>
  );
};
