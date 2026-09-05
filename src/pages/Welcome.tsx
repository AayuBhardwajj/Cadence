import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CadenceButton } from "../components/ui/CadenceButton";

// ─── Feature icons ─────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

const SpeechIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
  </svg>
);

// ─── Feature badge ──────────────────────────────────────────────────────────
interface FeatureBadgeProps {
  icon: React.ReactNode;
  label: string;
  delay?: number;
  offsetUp?: boolean;
}

const FeatureBadge = ({ icon, label, delay = 0, offsetUp = false }: FeatureBadgeProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: offsetUp ? -8 : 0 }}
    transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    className="flex flex-col items-center gap-2"
  >
    <div className="h-14 w-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
      {icon}
    </div>
    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
  </motion.div>
);

// ─── Component ─────────────────────────────────────────────────────────────
export const Welcome = () => {
  const navigate = useNavigate();
  // Navigation logic unchanged
  const startAssessment = () => navigate("/pre-recording");

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="w-full max-w-xl space-y-10">

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center space-y-3"
        >
          <div className="h-14 w-14 rounded-2xl bg-brand flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5v14M7 8v8M22 10v4M2 10v4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Welcome to Cadence</h1>
            <p className="mt-1 text-base text-text-secondary">Let's discover your unique speaking style</p>
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex items-end justify-center gap-8 py-2"
        >
          <FeatureBadge icon={<MicIcon />} label="Fluency" delay={0.2} />
          <FeatureBadge icon={<SpeechIcon />} label="Pronunciation" delay={0.3} offsetUp />
          <FeatureBadge icon={<BrainIcon />} label="Word Retrieval" delay={0.4} />
        </motion.div>

        {/* Divider with label */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-text-muted uppercase tracking-wider font-medium">
              Speech analysis · 5 minutes
            </span>
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <CadenceButton
            variant="primary"
            size="lg"
            onClick={startAssessment}
            className="px-10"
          >
            Start My Assessment
          </CadenceButton>
          <p className="text-xs text-text-muted uppercase tracking-widest">
            Private &amp; Encrypted · No Pressure
          </p>
        </motion.div>

      </div>
    </div>
  );
};
