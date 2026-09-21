import { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { perfProbe } from "../lib/perfProbe";

export interface FacialEvent {
  timestamp: number;
  jawOpen: number;
  mouthClose: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  faceDetected: boolean;
  approxLookingAtScreen: boolean;
  delegate: "GPU" | "CPU";
}

export interface UseFaceSensingOptions {
  /** Target delegate (default: GPU, fallback to CPU automatically on error) */
  delegate?: "GPU" | "CPU";
  /** Optional throttle target in Hz (e.g. 5 for 5 Hz / 200ms). Default: unthrottled (runs every rAF frame) */
  throttleHz?: number;
  /** Enable adaptive degradation under high latency. Default: false */
  adaptiveDegradation?: boolean;
  /** Pause inference when document.hidden is true. Default: false */
  pauseOnHidden?: boolean;
  /** Fired on cosmetic/high-freq frames. If true, suppresses React setState on every frame. Default: false */
  cosmeticOnly?: boolean;
  /** Callback fired on each facial sensing frame update */
  onEvent?: (event: FacialEvent) => void;
  /** Log performance and state updates */
  debug?: boolean;
}

export type FaceSensingStatus =
  | "idle"
  | "initializing"
  | "active"
  | "degraded"
  | "disabled"
  | "error"
  | "closed";

export interface UseFaceSensingReturn {
  status: FaceSensingStatus;
  activeDelegate: "GPU" | "CPU" | null;
  fps: number;
  avgFrameTimeMs: number;
  latestEvent: FacialEvent | null;
  latestEventRef: React.MutableRefObject<FacialEvent | null>;
  error: Error | null;
  start: (videoElement: HTMLVideoElement) => Promise<void>;
  stop: () => void;
  onEvent: (listener: (event: FacialEvent) => void) => () => void;
}

const WASM_RESOLVER_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
const MODEL_ASSET_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

/**
 * Pure face sensing hook using MediaPipe FaceLandmarker with GPU delegate and CPU fallback.
 * Default behavior is unthrottled, continuous, and non-degrading for assessment gating.
 * Opt-in flags (throttleHz, adaptiveDegradation, cosmeticOnly) are passed by performance-sensitive views.
 */
export function useFaceSensing(options: UseFaceSensingOptions = {}): UseFaceSensingReturn {
  const {
    delegate = "GPU",
    throttleHz,
    adaptiveDegradation = false,
    pauseOnHidden = false,
    cosmeticOnly = false,
    onEvent: externalOnEvent,
    debug = true,
  } = options;

  const [status, setStatus] = useState<FaceSensingStatus>("idle");
  const [activeDelegate, setActiveDelegate] = useState<"GPU" | "CPU" | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [avgFrameTimeMs, setAvgFrameTimeMs] = useState<number>(0);
  const [latestEvent, setLatestEvent] = useState<FacialEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const latestEventRef = useRef<FacialEvent | null>(null);

  const listenersRef = useRef<Set<(event: FacialEvent) => void>>(new Set());
  const externalOnEventRef = useRef(externalOnEvent);
  externalOnEventRef.current = externalOnEvent;

  // Throttling & degradation refs
  const targetIntervalMsRef = useRef<number>(
    throttleHz && throttleHz > 0 ? 1000 / throttleHz : 0
  );
  const lastInferTimestampRef = useRef<number>(0);
  const degradationStageRef = useRef<number>(0); // 0: baseline, 1: degraded, 2: disabled
  const inferDurationsRef = useRef<number[]>([]);
  const lastDegradationCheckTsRef = useRef<number>(performance.now());
  const readyTimestampRef = useRef<number>(performance.now());
  const sampleCountRef = useRef<number>(0);

  // FPS and frame duration calculation refs
  const frameCountRef = useRef<number>(0);
  const frameTimeSumRef = useRef<number>(0);
  const lastFpsTimestampRef = useRef<number>(performance.now());
  const lastVideoTimeRef = useRef<number>(-1);

  // Approximate looking at screen heuristic from landmarks
  const estimateLookingAtScreen = useCallback(
    (landmarks: Array<{ x: number; y: number; z: number }>): boolean => {
      if (!landmarks || landmarks.length < 264) return false;
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const forehead = landmarks[10];
      const chin = landmarks[152];

      if (!nose || !leftEye || !rightEye || !forehead || !chin) return false;

      // Horizontal ratio: nose position between eyes (centered is ~0.5)
      const eyeSpan = rightEye.x - leftEye.x;
      if (eyeSpan <= 0.01) return false;
      const hRatio = (nose.x - leftEye.x) / eyeSpan;

      // Vertical ratio: nose position between forehead and chin
      const faceHeight = chin.y - forehead.y;
      if (faceHeight <= 0.01) return false;
      const vRatio = (nose.y - forehead.y) / faceHeight;

      // Generous bounding box for soft gaze check (per D19)
      const isLookingHorizontal = hRatio >= 0.25 && hRatio <= 0.75;
      const isLookingVertical = vRatio >= 0.3 && vRatio <= 0.75;

      return isLookingHorizontal && isLookingVertical;
    },
    []
  );

  // Frame processing loop
  const processFrame = useCallback(() => {
    if (!isRunningRef.current || status === "disabled") return;

    // Optional: Pause inference when document is hidden (only if pauseOnHidden is true)
    if (pauseOnHidden && typeof document !== "undefined" && document.hidden) {
      animFrameIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoElementRef.current;
    const landmarker = landmarkerRef.current;
    const currentDelegate = activeDelegate || delegate;

    if (video && video.readyState >= 2 && landmarker) {
      const startT = performance.now();

      // Throttling logic (only applies if targetIntervalMs > 0)
      if (
        targetIntervalMsRef.current === 0 ||
        startT - lastInferTimestampRef.current >= targetIntervalMsRef.current
      ) {
        lastInferTimestampRef.current = startT;
        lastVideoTimeRef.current = video.currentTime;

        try {
          // Fix: Always measure synchronous detectForVideo execution duration with performance.now() deltas
          const tInferStart = performance.now();
          const results = landmarker.detectForVideo(video, startT);
          const durationMs = performance.now() - tInferStart;

          if (perfProbe.isEnabled()) {
            perfProbe.recordMediaPipeInference(durationMs);
          }

          sampleCountRef.current += 1;
          const timeSinceReady = startT - readyTimestampRef.current;

          // Opt-in adaptive degradation measurement
          // Filter out warm-up: Ignore first 10 samples OR first 2000ms after landmarker is ready
          if (adaptiveDegradation && sampleCountRef.current > 10 && timeSinceReady > 2000) {
            inferDurationsRef.current.push(durationMs);

            // Evaluate degradation window every >= 3000ms
            if (startT - lastDegradationCheckTsRef.current >= 3000) {
              const windowSamples = [...inferDurationsRef.current];
              const windowTime = startT - lastDegradationCheckTsRef.current;
              inferDurationsRef.current = [];
              lastDegradationCheckTsRef.current = startT;

              // Require >= 30 samples over >= 3s window
              if (windowSamples.length >= 30 && windowTime >= 3000) {
                const sorted = [...windowSamples].sort((a, b) => a - b);
                const p95 =
                  sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];

                if (p95 > 20) {
                  if (degradationStageRef.current === 0) {
                    degradationStageRef.current = 1;
                    const baseHz = throttleHz || 30;
                    const degradedHz = Math.max(1, baseHz / 2);
                    targetIntervalMsRef.current = 1000 / degradedHz;
                    console.warn(
                      `[useFaceSensing] High inference latency (p95 = ${p95.toFixed(1)}ms > 20ms over ${windowSamples.length} samples). ` +
                        `Raw sample values: [${windowSamples.map((s) => s.toFixed(1)).join(", ")}]. Degrading rate to ${degradedHz} Hz.`
                    );
                    setStatus("degraded");
                  } else if (degradationStageRef.current === 1) {
                    degradationStageRef.current = 2;
                    console.warn(
                      `[useFaceSensing] High inference latency persisted (p95 = ${p95.toFixed(1)}ms > 20ms over ${windowSamples.length} samples). ` +
                        `Raw sample values: [${windowSamples.map((s) => s.toFixed(1)).join(", ")}]. Disabling face tracking.`
                    );
                    try {
                      landmarkerRef.current?.close();
                    } catch {}
                    landmarkerRef.current = null;
                    setStatus("disabled");
                  }
                }
              }
            }
          }

          const faceDetected = Boolean(
            results.faceLandmarks && results.faceLandmarks.length > 0
          );

          let jawOpen = 0;
          let mouthClose = 0;
          let eyeBlinkLeft = 0;
          let eyeBlinkRight = 0;

          if (
            faceDetected &&
            results.faceBlendshapes &&
            results.faceBlendshapes.length > 0 &&
            results.faceBlendshapes[0].categories
          ) {
            const categories = results.faceBlendshapes[0].categories;
            for (let i = 0; i < categories.length; i++) {
              const cat = categories[i];
              if (cat.categoryName === "jawOpen") jawOpen = cat.score;
              else if (cat.categoryName === "mouthClose") mouthClose = cat.score;
              else if (cat.categoryName === "eyeBlinkLeft") eyeBlinkLeft = cat.score;
              else if (cat.categoryName === "eyeBlinkRight") eyeBlinkRight = cat.score;
            }
          }

          const approxLookingAtScreen = faceDetected
            ? estimateLookingAtScreen(results.faceLandmarks[0])
            : false;

          const event: FacialEvent = {
            timestamp: startT,
            jawOpen: Number(jawOpen.toFixed(3)),
            mouthClose: Number(mouthClose.toFixed(3)),
            eyeBlinkLeft: Number(eyeBlinkLeft.toFixed(3)),
            eyeBlinkRight: Number(eyeBlinkRight.toFixed(3)),
            faceDetected,
            approxLookingAtScreen,
            delegate: currentDelegate,
          };

          latestEventRef.current = event;

          if (!cosmeticOnly) {
            // Default assessment path: Always update React state on every frame so PreRecordingSetup re-renders
            setLatestEvent(event);
          } else {
            // Practice game cosmetic path: Only update React state on presence/status change
            if (!latestEvent || latestEvent.faceDetected !== faceDetected) {
              setLatestEvent(event);
            }
          }

          externalOnEventRef.current?.(event);
          listenersRef.current.forEach((listener) => {
            try {
              listener(event);
            } catch (err) {
              console.error("[useFaceSensing] Listener error:", err);
            }
          });
        } catch (inferErr) {
          console.warn("[useFaceSensing] Frame inference warning:", inferErr);
        }
      }

      const endT = performance.now();
      frameTimeSumRef.current += endT - startT;
      frameCountRef.current += 1;

      // Update FPS counter once per second
      if (startT - lastFpsTimestampRef.current >= 1000) {
        const elapsed = startT - lastFpsTimestampRef.current;
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        const avgMs =
          frameCountRef.current > 0
            ? frameTimeSumRef.current / frameCountRef.current
            : 0;

        setFps(currentFps);
        setAvgFrameTimeMs(Number(avgMs.toFixed(2)));

        if (debug) {
          console.debug(
            `[useFaceSensing FPS] ${currentFps} fps (avg frame compute: ${avgMs.toFixed(2)}ms, delegate: ${currentDelegate})`
          );
        }

        frameCountRef.current = 0;
        frameTimeSumRef.current = 0;
        lastFpsTimestampRef.current = startT;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  }, [
    activeDelegate,
    delegate,
    estimateLookingAtScreen,
    debug,
    throttleHz,
    adaptiveDegradation,
    pauseOnHidden,
    cosmeticOnly,
    status,
    latestEvent,
  ]);

  // Start face sensing with video element
  const start = useCallback(
    async (videoElement: HTMLVideoElement) => {
      videoElementRef.current = videoElement;
      setStatus("initializing");
      setError(null);

      try {
        if (debug) {
          console.log(`[useFaceSensing] Loading MediaPipe FilesetResolver from CDN...`);
        }
        const filesetResolver = await FilesetResolver.forVisionTasks(WASM_RESOLVER_URL);

        let landmarker: FaceLandmarker | null = null;
        let chosenDelegate: "GPU" | "CPU" = delegate;

        // Try primary delegate (GPU) first, fallback to CPU on error
        try {
          if (debug) {
            console.log(`[useFaceSensing] Attempting FaceLandmarker initialization with ${delegate} delegate...`);
          }
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MODEL_ASSET_PATH,
              delegate: delegate,
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          });
          chosenDelegate = delegate;
        } catch (gpuErr: any) {
          if (delegate === "GPU") {
            console.warn(`[useFaceSensing] GPU delegate failed (${gpuErr.message}), falling back to CPU...`);
            landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
              baseOptions: {
                modelAssetPath: MODEL_ASSET_PATH,
                delegate: "CPU",
              },
              outputFaceBlendshapes: true,
              runningMode: "VIDEO",
              numFaces: 1,
            });
            chosenDelegate = "CPU";
          } else {
            throw gpuErr;
          }
        }

        if (landmarkerRef.current) {
          landmarkerRef.current.close();
        }

        landmarkerRef.current = landmarker;
        setActiveDelegate(chosenDelegate);
        setStatus("active");
        isRunningRef.current = true;

        // Reset measurement timing & window counters on fresh startup
        readyTimestampRef.current = performance.now();
        sampleCountRef.current = 0;
        inferDurationsRef.current = [];
        lastDegradationCheckTsRef.current = performance.now();
        degradationStageRef.current = 0;
        targetIntervalMsRef.current =
          throttleHz && throttleHz > 0 ? 1000 / throttleHz : 0;

        perfProbe.logInitMetadataOnce("useFaceSensing", { mediaPipeDelegate: chosenDelegate });

        if (debug) {
          console.log(`[useFaceSensing] ✅ FaceLandmarker active with ${chosenDelegate} delegate`);
        }

        // Start rAF detection loop
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
        animFrameIdRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        console.error("[useFaceSensing Error]", err);
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus("error");
      }
    },
    [delegate, debug, processFrame, throttleHz]
  );

  // Stop face sensing
  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch (err) {
        console.warn("[useFaceSensing] Close warning:", err);
      }
      landmarkerRef.current = null;
    }
    setStatus("idle");
    setActiveDelegate(null);
  }, []);

  // Event listener subscription
  const onEvent = useCallback((listener: (event: FacialEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      setStatus("closed");
    };
  }, [stop]);

  return {
    status,
    activeDelegate,
    fps,
    avgFrameTimeMs,
    latestEvent,
    latestEventRef,
    error,
    start,
    stop,
    onEvent,
  };
}
