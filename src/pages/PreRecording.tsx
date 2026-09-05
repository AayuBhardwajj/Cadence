import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CadenceButton } from "../components/ui/CadenceButton";

// ─── Icons ──────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-success" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

const LightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const SoundIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

// ─── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg className="animate-spin w-4 h-4 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ─── Checklist item ─────────────────────────────────────────────────────────
interface ChecklistItemProps {
  label: string;
  status: "loading" | "done" | "error";
  subText?: string;
  icon: React.ReactNode;
  delay?: number;
}

const ChecklistItem = ({ label, status, subText, icon, delay = 0 }: ChecklistItemProps) => {
  const borderColor =
    status === "done" ? "border-l-success" :
    status === "error" ? "border-l-error" :
    "border-l-brand";

  const bgColor =
    status === "done" ? "bg-success/5" : "bg-surface";

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center justify-between rounded-lg border border-border border-l-4 ${borderColor} ${bgColor} px-4 py-3 transition-colors duration-300`}
    >
      <div className="flex items-center gap-3">
        <span className={status === "done" ? "text-success" : "text-text-muted"}>{icon}</span>
        <div>
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {subText && <p className="text-xs text-text-muted">{subText}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        {status === "done"    && <CheckIcon />}
        {status === "loading" && <Spinner />}
        {status === "error"   && <span className="text-xs text-error font-medium">Failed</span>}
      </div>
    </motion.div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────
export const PreRecording = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── State (unchanged logic) ──────────────────────────────────────────────
  const [permissions, setPermissions] = useState({ camera: false, mic: false });
  const [checks, setChecks] = useState({
    lighting: "checking", // checking, good, bad
    noise: "checking",    // checking, good, bad
  });

  // ── Media permission request (unchanged logic) ───────────────────────────
  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPermissions({ camera: true, mic: true });
      setTimeout(() => setChecks((prev) => ({ ...prev, lighting: "good" })), 1500);
      setTimeout(() => setChecks((prev) => ({ ...prev, noise: "good" })), 2500);
    } catch (err) {
      console.error("Error accessing media devices:", err);
    }
  };

  useEffect(() => {
    requestPermissions();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const allReady =
    permissions.camera && permissions.mic &&
    checks.lighting === "good" && checks.noise === "good";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-5xl">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center shadow-sm flex-shrink-0">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Setup Check</h1>
            <p className="text-xs text-text-secondary">Verify your camera and microphone before the assessment</p>
          </div>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-4 h-[70vh] min-h-[480px]">

          {/* Left: Video preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative bg-black rounded-2xl overflow-hidden flex items-center justify-center"
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Active camera overlay border */}
            {permissions.camera && (
              <div className="absolute inset-0 rounded-2xl border-2 border-success/30 pointer-events-none" />
            )}

            {/* Loading state */}
            {!permissions.camera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/60">
                <Spinner />
                <p className="text-sm">Accessing camera…</p>
              </div>
            )}

            {/* Status badge */}
            <div className="absolute bottom-3 left-3">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                permissions.camera
                  ? "bg-success/20 text-success border border-success/30"
                  : "bg-white/10 text-white/60 border border-white/10"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${permissions.camera ? "bg-success animate-pulse" : "bg-white/40"}`} />
                {permissions.camera ? "Camera live" : "Connecting…"}
              </span>
            </div>
          </motion.div>

          {/* Right: Checklist + CTA */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Setup Checklist
              </h2>

              <div className="space-y-3">
                <ChecklistItem
                  label="Camera Access"
                  status={permissions.camera ? "done" : "loading"}
                  icon={<CameraIcon />}
                  delay={0.25}
                />
                <ChecklistItem
                  label="Microphone Ready"
                  status={permissions.mic ? "done" : "loading"}
                  icon={<MicIcon />}
                  delay={0.35}
                />
                <ChecklistItem
                  label="Lighting Check"
                  status={
                    checks.lighting === "good" ? "done" :
                    checks.lighting === "checking" ? "loading" : "error"
                  }
                  subText="Ensure your face is clearly visible"
                  icon={<LightIcon />}
                  delay={0.45}
                />
                <ChecklistItem
                  label="Noise Check"
                  status={
                    checks.noise === "good" ? "done" :
                    checks.noise === "checking" ? "loading" : "error"
                  }
                  subText="Find a quiet environment"
                  icon={<SoundIcon />}
                  delay={0.55}
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 space-y-3">
              {!allReady && (
                <p className="text-xs text-text-muted text-center">
                  Waiting for all checks to pass…
                </p>
              )}
              <CadenceButton
                variant="primary"
                size="lg"
                fullWidth
                disabled={!allReady}
                onClick={() => navigate("/assessment")}
              >
                {allReady ? "I'm Ready — Start Assessment" : "Checking System…"}
              </CadenceButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
