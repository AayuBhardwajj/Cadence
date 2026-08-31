import { useEffect, useRef, useState, useCallback } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

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
  /** Callback fired on each facial sensing frame update */
  onEvent?: (event: FacialEvent) => void;
  /** Log performance and state updates */
  debug?: boolean;
}

export type FaceSensingStatus = "idle" | "initializing" | "active" | "error" | "closed";

export interface UseFaceSensingReturn {
  status: FaceSensingStatus;
  activeDelegate: "GPU" | "CPU" | null;
  fps: number;
  avgFrameTimeMs: number;
  latestEvent: FacialEvent | null;
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
 * Emits extracted blendshapes (jawOpen, mouthClose, eyeBlinkLeft, eyeBlinkRight),
 * head pose screen gaze approximation, and measures real FPS and frame latency.
 */
export function useFaceSensing(options: UseFaceSensingOptions = {}): UseFaceSensingReturn {
  const { delegate = "GPU", onEvent: externalOnEvent, debug = true } = options;

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

  const listenersRef = useRef<Set<(event: FacialEvent) => void>>(new Set());
  const externalOnEventRef = useRef(externalOnEvent);
  externalOnEventRef.current = externalOnEvent;

  // FPS and frame duration calculation refs
  const frameCountRef = useRef<number>(0);
  const frameTimeSumRef = useRef<number>(0);
  const lastFpsTimestampRef = useRef<number>(performance.now());
  const lastVideoTimeRef = useRef<number>(-1);

  // Approximate looking at screen heuristic from landmarks
  const estimateLookingAtScreen = useCallback((landmarks: Array<{ x: number; y: number; z: number }>): boolean => {
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
  }, []);

  // Frame processing loop
  const processFrame = useCallback(() => {
    if (!isRunningRef.current) return;

    const video = videoElementRef.current;
    const landmarker = landmarkerRef.current;
    const currentDelegate = activeDelegate || delegate;

    if (video && video.readyState >= 2 && landmarker) {
      const startT = performance.now();

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;

        try {
          const results = landmarker.detectForVideo(video, startT);
          const faceDetected = Boolean(results.faceLandmarks && results.faceLandmarks.length > 0);

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

          setLatestEvent(event);
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
  }, [activeDelegate, delegate, estimateLookingAtScreen, debug]);

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
    [delegate, debug, processFrame]
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
    error,
    start,
    stop,
    onEvent,
  };
}
