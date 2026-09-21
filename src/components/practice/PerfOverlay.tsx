import React, { useEffect, useState } from "react";
import { perfProbe, PerfReport } from "../../lib/perfProbe";
import { Activity, Copy, Check } from "lucide-react";

export const PerfOverlay: React.FC = () => {
  const [report, setReport] = useState<PerfReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!perfProbe.isEnabled()) return;
    // Set initial report
    setReport(perfProbe.generateReport());
    const unsub = perfProbe.subscribe((newReport) => {
      setReport(newReport);
    });
    return unsub;
  }, []);

  if (!perfProbe.isEnabled() || !report) return null;

  const handleCopy = () => {
    const fullReport = perfProbe.generateReport();
    navigator.clipboard.writeText(JSON.stringify(fullReport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { metrics, metadata } = report;

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-950/90 border border-emerald-500/40 rounded-xl p-3 text-[11px] font-mono text-emerald-300 shadow-2xl backdrop-blur-md max-w-xs space-y-2 pointer-events-auto select-none">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 gap-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
          <Activity className="w-3.5 h-3.5" />
          <span>PERF PROBE (?perf=1{metadata.label ? `, ${metadata.label}` : ""})</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded text-[10px] transition-colors border border-emerald-500/30"
          title="Copy Report JSON to Clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy JSON"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
        <div>
          <span className="text-white/40">FPS (p50/p5):</span>{" "}
          <span className="font-bold text-white">
            {metrics.fps_rAF.p50} / {metrics.fps_rAF.p5}
          </span>
        </div>
        <div>
          <span className="text-white/40">Renders/s:</span>{" "}
          <span className="font-bold text-amber-300">{metrics.rendersPerSecond}</span>
        </div>
        <div>
          <span className="text-white/40">MP Infer (p50):</span>{" "}
          <span className="font-bold text-white">{metrics.mediapipe_inference_ms.p50}ms</span>
        </div>
        <div>
          <span className="text-white/40">MP Infer (p95):</span>{" "}
          <span className="font-bold text-white">{metrics.mediapipe_inference_ms.p95}ms</span>
        </div>
        <div>
          <span className="text-white/40">VAD Frame (p50):</span>{" "}
          <span className="font-bold text-white">{metrics.vad_frame_ms.p50}ms</span>
        </div>
        <div>
          <span className="text-white/40">Phaser Update:</span>{" "}
          <span className="font-bold text-white">{metrics.phaser_update_ms.p50}ms</span>
        </div>
        <div>
          <span className="text-white/40">Encode WAV:</span>{" "}
          <span className="font-bold text-white">{metrics.encodeWAV_ms.p50}ms</span>
        </div>
        <div>
          <span className="text-white/40">Verdict RTT:</span>{" "}
          <span className="font-bold text-white">{metrics.verdict_rtt_ms.p50}ms</span>
        </div>
        <div className="col-span-2 pt-1 border-t border-white/5">
          <span className="text-white/40">LongTasks (5s):</span>{" "}
          <span className="font-bold text-rose-400">
            {metrics.longTasksWindow?.count ?? 0} ({metrics.longTasksWindow?.totalMs.toFixed(0) ?? 0}ms tot)
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-white/40">LoAF (5s):</span>{" "}
          <span className="font-bold text-indigo-300">
            {metrics.longAnimationFrameWindow?.count ?? 0} ({metrics.longAnimationFrameWindow?.totalMs.toFixed(0) ?? 0}ms tot)
          </span>
        </div>
        <div className="col-span-2 text-[9px] text-white/40 truncate">
          MP: {metadata.mediaPipeDelegate || "?"} | Renderer: {metadata.phaserRenderer || "?"} | Cores: {metadata.hardwareConcurrency} | DPR: {metadata.devicePixelRatio}
        </div>
      </div>
    </div>
  );
};
