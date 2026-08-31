import { useEffect, useRef, useState, useCallback } from "react";
import { MicVAD } from "@ricky0123/vad-web";

export type SpeechEventType =
  | "SPEECH_START"
  | "SPEECH_END"
  | "PAUSE_DETECTED"
  | "PAUSE_TIMEOUT";

export interface SpeechEvent {
  type: SpeechEventType;
  timestamp: number;
  pauseDurationMs?: number;
  speechProb?: number;
  audio?: Float32Array;
}

export interface UseSpeechSensingOptions {
  /**
   * Optional MediaStream provider. If not supplied, an existing active stream
   * can be provided via `stream`.
   */
  getStream?: () => Promise<MediaStream>;
  /** Existing MediaStream to avoid multiple getUserMedia permission prompts */
  stream?: MediaStream | null;
  /** Milliseconds of sustained silence before emitting PAUSE_DETECTED (Tier 1 debounce, default: 350ms) */
  pauseDetectionDelayMs?: number;
  /** Milliseconds of total sustained silence before emitting PAUSE_TIMEOUT (Tier 2 timeout, default: 1800ms) */
  pauseTimeoutThresholdMs?: number;
  /** Positive speech probability threshold (tuned default: 0.65 to reduce background false positives) */
  positiveSpeechThreshold?: number;
  /** Negative speech probability threshold (tuned default: 0.45) */
  negativeSpeechThreshold?: number;
  /** Min speech duration in ms (tuned default: 250ms to ignore short acoustic transients) */
  minSpeechMs?: number;
  /** Minimum RMS audio amplitude required to confirm speech (amplitude gate, default: 0.015) */
  minRmsThreshold?: number;
  /** Callback fired for every speech lifecycle event */
  onEvent?: (event: SpeechEvent) => void;
  /** Enable debug console logging */
  debug?: boolean;
}

export type SpeechSensingStatus = "idle" | "initializing" | "active" | "error" | "destroyed";
export type SpeechState = "idle" | "speaking" | "paused" | "timed_out";

export interface UseSpeechSensingReturn {
  status: SpeechSensingStatus;
  speechState: SpeechState;
  speechProb: number;
  rms: number;
  minRmsThreshold: number;
  lastVADLatencyMs: number;
  avgVADLatencyMs: number;
  error: Error | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onEvent: (listener: (event: SpeechEvent) => void) => () => void;
}

const VAD_BASE_ASSET_PATH = "https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@0.0.30/dist/";
const ONNX_WASM_BASE_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";

/**
 * Clean, pure speech sensing hook using Silero VAD with single-threaded WASM.
 * Implements:
 * 1. Two-tier pause detection (PAUSE_DETECTED debounce -> PAUSE_TIMEOUT).
 * 2. Tuned Silero thresholds (positiveSpeechThreshold: 0.65, minSpeechMs: 250ms).
 * 3. RMS amplitude gating to reject low-volume background chatter / noise.
 */
export function useSpeechSensing(options: UseSpeechSensingOptions = {}): UseSpeechSensingReturn {
  const {
    getStream,
    stream,
    pauseDetectionDelayMs = 350,
    pauseTimeoutThresholdMs = 1800,
    positiveSpeechThreshold = 0.65,
    negativeSpeechThreshold = 0.45,
    minSpeechMs = 250,
    minRmsThreshold = 0.015,
    onEvent: externalOnEvent,
    debug = true,
  } = options;

  const [status, setStatus] = useState<SpeechSensingStatus>("idle");
  const [speechState, setSpeechState] = useState<SpeechState>("idle");
  const [speechProb, setSpeechProb] = useState<number>(0);
  const [rms, setRms] = useState<number>(0);
  const [lastVADLatencyMs, setLastVADLatencyMs] = useState<number>(0);
  const [avgVADLatencyMs, setAvgVADLatencyMs] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const vadRef = useRef<MicVAD | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pcmBufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const currentRmsRef = useRef<number>(0);

  const listenersRef = useRef<Set<(event: SpeechEvent) => void>>(new Set());
  const externalOnEventRef = useRef(externalOnEvent);
  externalOnEventRef.current = externalOnEvent;

  // Pause detection refs
  const speechEndTimeRef = useRef<number | null>(null);
  const pauseDetectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseTimeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef<boolean>(false);

  // Latency metrics tracking
  const latencySumRef = useRef<number>(0);
  const latencyCountRef = useRef<number>(0);

  // Compute live RMS amplitude helper
  const measureCurrentRms = useCallback((): number => {
    if (!analyserRef.current || !pcmBufferRef.current) return 0;
    analyserRef.current.getFloatTimeDomainData(pcmBufferRef.current as Float32Array<ArrayBuffer>);
    let sum = 0;
    const buf = pcmBufferRef.current;
    for (let i = 0; i < buf.length; i++) {
      sum += buf[i] * buf[i];
    }
    const calculatedRms = Math.sqrt(sum / buf.length);
    currentRmsRef.current = calculatedRms;
    return calculatedRms;
  }, []);

  // Broadcast event helper
  const emitEvent = useCallback((event: SpeechEvent) => {
    if (debug) {
      console.log(
        `[SpeechSensing Event] ${event.type} (timestamp=${event.timestamp.toFixed(1)}${
          event.pauseDurationMs !== undefined ? `, duration=${event.pauseDurationMs.toFixed(0)}ms` : ""
        })`
      );
    }
    externalOnEventRef.current?.(event);
    listenersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("[useSpeechSensing] Listener error:", err);
      }
    });
  }, [debug]);

  // Clear all pending pause timers
  const clearPauseTimers = useCallback(() => {
    if (pauseDetectedTimerRef.current) {
      clearTimeout(pauseDetectedTimerRef.current);
      pauseDetectedTimerRef.current = null;
    }
    if (pauseTimeoutTimerRef.current) {
      clearTimeout(pauseTimeoutTimerRef.current);
      pauseTimeoutTimerRef.current = null;
    }
    speechEndTimeRef.current = null;
  }, []);

  // Handler when speech begins
  const handleSpeechStart = useCallback(() => {
    const currentRms = measureCurrentRms();
    setRms(currentRms);

    // RMS Gate check: reject low-amplitude background noise/chatter
    if (currentRms < minRmsThreshold) {
      if (debug) {
        console.debug(
          `[useSpeechSensing] Gated out low-amplitude trigger: RMS ${currentRms.toFixed(4)} < threshold ${minRmsThreshold}`
        );
      }
      return;
    }

    const now = performance.now();
    isSpeakingRef.current = true;
    clearPauseTimers();

    setSpeechState("speaking");
    emitEvent({
      type: "SPEECH_START",
      timestamp: now,
    });
  }, [clearPauseTimers, emitEvent, measureCurrentRms, minRmsThreshold, debug]);

  // Handler when speech ends
  const handleSpeechEnd = useCallback((audio: Float32Array) => {
    const endT = performance.now();
    isSpeakingRef.current = false;
    speechEndTimeRef.current = endT;

    setSpeechState("idle");
    emitEvent({
      type: "SPEECH_END",
      timestamp: endT,
      audio,
    });

    // Tier 1: Debounced PAUSE_DETECTED (~300-400ms sustained silence)
    pauseDetectedTimerRef.current = setTimeout(() => {
      if (isSpeakingRef.current) return;
      const pauseStartT = performance.now();
      const duration = pauseStartT - (speechEndTimeRef.current ?? pauseStartT);
      setSpeechState("paused");
      emitEvent({
        type: "PAUSE_DETECTED",
        timestamp: pauseStartT,
        pauseDurationMs: duration,
      });
    }, pauseDetectionDelayMs);

    // Tier 2: PAUSE_TIMEOUT (1.5s - 2.0s sustained silence)
    pauseTimeoutTimerRef.current = setTimeout(() => {
      if (isSpeakingRef.current) return;
      const timeoutT = performance.now();
      const duration = timeoutT - (speechEndTimeRef.current ?? timeoutT);
      setSpeechState("timed_out");
      emitEvent({
        type: "PAUSE_TIMEOUT",
        timestamp: timeoutT,
        pauseDurationMs: duration,
      });
    }, pauseTimeoutThresholdMs);
  }, [emitEvent, pauseDetectionDelayMs, pauseTimeoutThresholdMs]);

  // Start sensing
  const start = useCallback(async () => {
    try {
      if (vadRef.current) {
        vadRef.current.start();
        setStatus("active");
        return;
      }

      setStatus("initializing");
      setError(null);

      const activeStream = stream || (getStream ? await getStream() : null);
      if (activeStream && activeStream.getAudioTracks().length > 0) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(activeStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            pcmBufferRef.current = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;
          }
        } catch (audioErr) {
          console.warn("[useSpeechSensing] AudioContext initialization notice:", audioErr);
        }
      }

      const streamResolver = async () => {
        if (activeStream) return activeStream;
        if (getStream) return await getStream();
        throw new Error("No MediaStream provided to useSpeechSensing");
      };

      if (debug) {
        console.log(
          `[useSpeechSensing] Initializing Silero VAD (numThreads: 1, posThresh: ${positiveSpeechThreshold}, negThresh: ${negativeSpeechThreshold}, minSpeechMs: ${minSpeechMs}, minRms: ${minRmsThreshold})...`
        );
      }

      const vad = await MicVAD.new({
        getStream: streamResolver,
        baseAssetPath: VAD_BASE_ASSET_PATH,
        onnxWASMBasePath: ONNX_WASM_BASE_PATH,
        positiveSpeechThreshold,
        negativeSpeechThreshold,
        minSpeechMs,
        ortConfig: (ort: any) => {
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.proxy = false;
          ort.env.wasm.wasmPaths = ONNX_WASM_BASE_PATH;
        },
        onSpeechStart: () => {
          handleSpeechStart();
        },
        onSpeechEnd: (audio: Float32Array) => {
          handleSpeechEnd(audio);
        },
        onFrameProcessed: (probs: any) => {
          const t0 = performance.now();
          const p = probs.isSpeech;
          setSpeechProb(p);

          const liveRms = measureCurrentRms();
          setRms(Number(liveRms.toFixed(4)));

          const latency = performance.now() - t0;
          latencySumRef.current += latency;
          latencyCountRef.current += 1;
          const avg = latencySumRef.current / latencyCountRef.current;

          setLastVADLatencyMs(Number(latency.toFixed(2)));
          setAvgVADLatencyMs(Number(avg.toFixed(2)));

          if (debug && latencyCountRef.current % 100 === 0) {
            console.debug(
              `[useSpeechSensing VAD Latency] Last: ${latency.toFixed(3)}ms, Avg: ${avg.toFixed(3)}ms (over ${latencyCountRef.current} frames) | RMS: ${liveRms.toFixed(4)}`
            );
          }
        },
        onVADMisfire: () => {
          if (debug) console.log(`[useSpeechSensing] VAD misfire at ${performance.now().toFixed(1)}ms`);
        },
      });

      vad.start();
      vadRef.current = vad;
      setStatus("active");
      if (debug) console.log("[useSpeechSensing] ✅ VAD started successfully");
    } catch (err: any) {
      console.error("[useSpeechSensing Error]", err);
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus("error");
    }
  }, [
    getStream,
    stream,
    positiveSpeechThreshold,
    negativeSpeechThreshold,
    minSpeechMs,
    minRmsThreshold,
    debug,
    handleSpeechStart,
    handleSpeechEnd,
    measureCurrentRms,
  ]);

  // Stop sensing
  const stop = useCallback(async () => {
    clearPauseTimers();
    if (vadRef.current) {
      try {
        await vadRef.current.pause();
      } catch (err) {
        console.warn("[useSpeechSensing] Pause warning:", err);
      }
    }
    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close();
      } catch (err) {
        console.warn("[useSpeechSensing] AudioContext close notice:", err);
      }
      audioCtxRef.current = null;
      analyserRef.current = null;
      pcmBufferRef.current = null;
    }
    setStatus("idle");
    setSpeechState("idle");
  }, [clearPauseTimers]);

  // Subscribe to events
  const onEvent = useCallback((listener: (event: SpeechEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Auto-start if stream is supplied
  useEffect(() => {
    if (stream) {
      start();
    }
    return () => {
      clearPauseTimers();
      if (vadRef.current) {
        vadRef.current.destroy();
        vadRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
        analyserRef.current = null;
        pcmBufferRef.current = null;
      }
      setStatus("destroyed");
    };
  }, [stream, start, clearPauseTimers]);

  return {
    status,
    speechState,
    speechProb,
    rms,
    minRmsThreshold,
    lastVADLatencyMs,
    avgVADLatencyMs,
    error,
    start,
    stop,
    onEvent,
  };
}
