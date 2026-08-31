import React, { useEffect, useRef, useState } from "react";
import { useSpeechSensing, SpeechEvent } from "../hooks/useSpeechSensing";
import { useFaceSensing, FacialEvent } from "../hooks/useFaceSensing";

export const SensingTestPage: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>("requesting");
  const [delegateChoice, setDelegateChoice] = useState<"GPU" | "CPU">("GPU");
  const [speechEvents, setSpeechEvents] = useState<SpeechEvent[]>([]);
  const [facialEvents, setFacialEvents] = useState<FacialEvent[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Hook 1: Pure Speech Sensing
  const speechSensing = useSpeechSensing({
    stream,
    pauseDetectionDelayMs: 350,
    pauseTimeoutThresholdMs: 1800,
    debug: true,
    onEvent: (ev) => {
      setSpeechEvents((prev) => [ev, ...prev.slice(0, 19)]);
    },
  });

  // Hook 2: Pure Face Sensing
  const lastLoggedJawRef = useRef<number>(0);
  const faceSensing = useFaceSensing({
    delegate: delegateChoice,
    debug: true,
    onEvent: (ev) => {
      setFacialEvents((prev) => [ev, ...prev.slice(0, 9)]);
      // Log noticeable jawOpen movements for verification evidence
      if (Math.abs(ev.jawOpen - lastLoggedJawRef.current) > 0.15) {
        lastLoggedJawRef.current = ev.jawOpen;
        console.log(`[FaceSensing Jaw] jawOpen: ${ev.jawOpen.toFixed(3)} | mouthClose: ${ev.mouthClose.toFixed(3)} | delegate: ${ev.delegate}`);
      }
    },
  });

  // Acquire single unified media stream (audio + 320x240 video)
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    async function setupStream() {
      try {
        console.log("[SensingTestPage] Requesting unified getUserMedia (audio + 320x240 video)...");
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
        setStreamStatus("active (1 prompt for audio + video)");

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          // Start face sensing hook once video is playing
          faceSensing.start(videoRef.current);
        }
      } catch (err: any) {
        console.error("[SensingTestPage Stream Error]", err);
        setStreamStatus(`error: ${err.message || err}`);
      }
    }

    setupStream();

    return () => {
      isCancelled = true;
      faceSensing.stop();
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [delegateChoice]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif", maxWidth: 840, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 6 }}>
        Sensing Hooks Harness (`useSpeechSensing` + `useFaceSensing`)
      </h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Route: <code>/sensing-test</code> | Pure modular hooks validation
      </p>

      {/* Stream Status */}
      <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px 0" }}>1. Unified MediaStream (Single Permission)</h2>
        <div>Status: <strong>{streamStatus}</strong></div>
        <div style={{ marginTop: 10, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: 320, height: 240, background: "#111", borderRadius: 6, display: "block" }}
          />
          <div style={{ fontSize: 13, color: "#555" }}>
            <p style={{ margin: "4px 0" }}>Video resolution: <strong>320x240</strong></p>
            <p style={{ margin: "4px 0" }}>Audio tracks: <strong>{stream?.getAudioTracks().length ?? 0}</strong></p>
            <p style={{ margin: "4px 0" }}>Video tracks: <strong>{stream?.getVideoTracks().length ?? 0}</strong></p>
          </div>
        </div>
      </div>

      {/* Hook 1: Speech Sensing Panel */}
      <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px 0" }}>2. `useSpeechSensing` (Silero VAD + 2-Tier Pause Detection)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <div>Hook Status: <strong>{speechSensing.status}</strong></div>
          <div>Speech State: <strong style={{ color: speechSensing.speechState === "speaking" ? "#2b8a3e" : speechSensing.speechState === "paused" ? "#e67700" : speechSensing.speechState === "timed_out" ? "#c92a2a" : "#495057" }}>{speechSensing.speechState.toUpperCase()}</strong></div>
          <div>Speech Probability: <strong>{(speechSensing.speechProb * 100).toFixed(1)}%</strong> (threshold: 65%)</div>
          <div>Live RMS Level: <strong>{speechSensing.rms.toFixed(4)}</strong> (gate: {speechSensing.minRmsThreshold}) {speechSensing.rms >= speechSensing.minRmsThreshold ? "🔊 Over gate" : "🔇 Below gate"}</div>
          <div>VAD Frame Latency: <strong>{speechSensing.lastVADLatencyMs}ms (avg: {speechSensing.avgVADLatencyMs}ms)</strong></div>
          <div>Noise Suppression: <strong>Enabled in getUserMedia</strong></div>
        </div>

        {/* Live Probability and RMS Bars */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Speech Probability:</div>
            <div style={{ background: "#e9ecef", height: 10, borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, speechSensing.speechProb * 100))}%`,
                  background: speechSensing.speechProb >= 0.65 ? "#40c057" : "#fab005",
                  transition: "width 0.05s ease-out",
                }}
              />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 2 }}>Audio Amplitude (RMS):</div>
            <div style={{ background: "#e9ecef", height: 10, borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, (speechSensing.rms / 0.1) * 100))}%`,
                  background: speechSensing.rms >= speechSensing.minRmsThreshold ? "#228be6" : "#868e96",
                  transition: "width 0.05s ease-out",
                }}
              />
            </div>
          </div>
        </div>

        {/* Event Log */}
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 4px 0" }}>Speech Events Log (Recent 20):</h3>
        <div style={{ background: "#1e1e1e", color: "#d4d4d4", padding: 10, borderRadius: 6, fontSize: 12, maxHeight: 150, overflowY: "auto", fontFamily: "monospace" }}>
          {speechEvents.length === 0 ? (
            <span style={{ color: "#777" }}>No events yet. Speak into the microphone and pause...</span>
          ) : (
            speechEvents.map((ev, idx) => (
              <div key={idx} style={{ margin: "2px 0", color: ev.type === "SPEECH_START" ? "#69db7c" : ev.type === "SPEECH_END" ? "#ffa94d" : ev.type === "PAUSE_DETECTED" ? "#ffd43b" : "#ff8787" }}>
                [{new Date(ev.timestamp).toLocaleTimeString()}] {ev.type}
                {ev.pauseDurationMs !== undefined ? ` (pause duration: ${ev.pauseDurationMs.toFixed(0)}ms)` : ""}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Hook 2: Face Sensing Panel */}
      <div style={{ background: "#f8f9fa", border: "1px solid #e9ecef", borderRadius: 8, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>3. `useFaceSensing` (MediaPipe FaceLandmarker)</h2>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, marginRight: 8 }}>Delegate:</label>
            <select
              value={delegateChoice}
              onChange={(e) => setDelegateChoice(e.target.value as "GPU" | "CPU")}
              style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
            >
              <option value="GPU">GPU (Primary)</option>
              <option value="CPU">CPU (Fallback)</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <div>Hook Status: <strong>{faceSensing.status}</strong></div>
          <div>Active Delegate: <strong>{faceSensing.activeDelegate || "none"}</strong></div>
          <div>Achieved FPS: <strong>{faceSensing.fps} fps</strong></div>
          <div>Avg Frame Processing: <strong>{faceSensing.avgFrameTimeMs}ms</strong></div>
          <div>Face Detected: <strong>{faceSensing.latestEvent?.faceDetected ? "✅ YES" : "❌ NO"}</strong></div>
          <div>Gaze at Screen: <strong>{faceSensing.latestEvent?.approxLookingAtScreen ? "✅ Looking at screen" : "⚠️ Looking away / off-center"}</strong></div>
        </div>

        {/* Live Blendshapes */}
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Live Extracted Blendshapes:</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>jawOpen:</span>
                <strong>{faceSensing.latestEvent?.jawOpen.toFixed(3) ?? "0.000"}</strong>
              </div>
              <div style={{ background: "#e9ecef", height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(faceSensing.latestEvent?.jawOpen ?? 0) * 100}%`, background: "#339af0" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>mouthClose:</span>
                <strong>{faceSensing.latestEvent?.mouthClose.toFixed(3) ?? "0.000"}</strong>
              </div>
              <div style={{ background: "#e9ecef", height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(faceSensing.latestEvent?.mouthClose ?? 0) * 100}%`, background: "#51cf66" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>eyeBlinkLeft:</span>
                <strong>{faceSensing.latestEvent?.eyeBlinkLeft.toFixed(3) ?? "0.000"}</strong>
              </div>
              <div style={{ background: "#e9ecef", height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(faceSensing.latestEvent?.eyeBlinkLeft ?? 0) * 100}%`, background: "#cc5de8" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span>eyeBlinkRight:</span>
                <strong>{faceSensing.latestEvent?.eyeBlinkRight.toFixed(3) ?? "0.000"}</strong>
              </div>
              <div style={{ background: "#e9ecef", height: 8, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(faceSensing.latestEvent?.eyeBlinkRight ?? 0) * 100}%`, background: "#cc5de8" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
