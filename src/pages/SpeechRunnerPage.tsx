import React, { useMemo } from "react";
import { useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { SpeechGameShell } from "../components/practice/SpeechGameShell";
import { PerfOverlay } from "../components/practice/PerfOverlay";
import { useTier } from "../lib/TierContext";

const VALID_BUCKETS = ["th_sound", "v_w_mix"] as const;
type ValidBucket = (typeof VALID_BUCKETS)[number];

export const SpeechRunnerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isFeatureLocked } = useTier();

  // Tier access check: Quick Practice is free/unlocked by default, but verify against tier permissions
  const isLocked = isFeatureLocked ? isFeatureLocked("quick_practice") : false;
  if (isLocked) {
    return <Navigate to="/practice" replace />;
  }

  const rawBucket = searchParams.get("bucket");
  const selectedBucket: ValidBucket = useMemo(() => {
    if (rawBucket && (VALID_BUCKETS as readonly string[]).includes(rawBucket)) {
      return rawBucket as ValidBucket;
    }
    return "th_sound";
  }, [rawBucket]);

  const handleClose = () => {
    navigate("/practice");
  };

  return (
    <div
      className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 md:p-8"
      style={{ contain: "layout paint" }}
    >
      {/* Live Measurement HUD Probe Overlay (?perf=1 only) */}
      <PerfOverlay />

      <div className="w-full max-w-4xl" style={{ contain: "layout paint" }}>
        <SpeechGameShell
          onClose={handleClose}
          initialBucket={selectedBucket}
        />
      </div>
    </div>
  );
};
