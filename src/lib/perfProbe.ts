/**
 * Performance Measurement Probe for Speech Runner
 * 
 * Enabled strictly when `?perf=1` is present in the URL search params.
 * When disabled, all probe functions are zero-overhead no-ops.
 */

export interface MetricSummary {
  p50: number;
  p95: number;
  max: number;
  count: number;
}

export interface ScriptAttribution {
  sourceURL: string;
  functionName: string;
  durationMs: number;
  invoker: string;
}

export interface PerfReport {
  timestamp: string;
  metadata: {
    hardwareConcurrency: number;
    devicePixelRatio: number;
    mediaPipeDelegate: string | null;
    ortWasmProxy: boolean | null;
    phaserRenderer: string | null;
    label: string | null;
  };
  metrics: {
    mediapipe_inference_ms: MetricSummary;
    vad_frame_ms: MetricSummary;
    phaser_update_ms: MetricSummary;
    encodeWAV_ms: MetricSummary;
    verdict_rtt_ms: MetricSummary;
    fps_rAF: { p50: number; p5: number; current: number };
    rendersPerSecond: number;
    longTasksWindow: {
      count: number;
      totalMs: number;
      maxMs: number;
    };
    longTasksCumulative: {
      count: number;
      totalMs: number;
      maxMs: number;
    };
    longAnimationFrameWindow: {
      count: number;
      totalMs: number;
      maxMs: number;
      topScripts: ScriptAttribution[];
    };
  };
}

class RollingBuffer {
  private buffer: number[];
  private maxSize: number;

  constructor(maxSize = 120) {
    this.maxSize = maxSize;
    this.buffer = [];
  }

  push(val: number) {
    if (this.buffer.length >= this.maxSize) {
      this.buffer.shift();
    }
    this.buffer.push(val);
  }

  getSummary(): MetricSummary {
    if (this.buffer.length === 0) {
      return { p50: 0, p95: 0, max: 0, count: 0 };
    }
    const sorted = [...this.buffer].sort((a, b) => a - b);
    const count = sorted.length;
    const p50 = sorted[Math.floor(count * 0.50)] ?? 0;
    const p95 = sorted[Math.floor(count * 0.95)] ?? sorted[count - 1] ?? 0;
    const max = sorted[count - 1] ?? 0;
    return {
      p50: Number(p50.toFixed(2)),
      p95: Number(p95.toFixed(2)),
      max: Number(max.toFixed(2)),
      count,
    };
  }

  getValues(): number[] {
    return this.buffer;
  }
}

class PerfProbeManager {
  private enabled: boolean = false;
  private label: string | null = null;
  private hasLoggedInit: boolean = false;

  // Metadata
  private mediaPipeDelegate: string | null = null;
  private ortWasmProxy: boolean | null = null;
  private phaserRenderer: string | null = null;

  // Metric rolling buffers
  private mediapipeBuf = new RollingBuffer(120);
  private vadBuf = new RollingBuffer(120);
  private phaserUpdateBuf = new RollingBuffer(120);
  private encodeWavBuf = new RollingBuffer(60);
  private verdictRttBuf = new RollingBuffer(60);
  private fpsDeltaBuf = new RollingBuffer(120);

  // Cumulative long tasks
  private longTaskCountCum: number = 0;
  private longTaskTotalMsCum: number = 0;
  private longTaskMaxMsCum: number = 0;

  // Per 5s window long tasks
  private windowLongTaskCount: number = 0;
  private windowLongTaskTotalMs: number = 0;
  private windowLongTaskMaxMs: number = 0;
  private lastReportedWindowLongTasks = { count: 0, totalMs: 0, maxMs: 0 };

  // Per 5s window LoAF (Long Animation Frame)
  private windowLoafCount: number = 0;
  private windowLoafTotalMs: number = 0;
  private windowLoafMaxMs: number = 0;
  private windowScriptMap = new Map<string, { sourceURL: string; functionName: string; invoker: string; durationMs: number }>();
  private lastReportedWindowLoaf: { count: number; totalMs: number; maxMs: number; topScripts: ScriptAttribution[] } = {
    count: 0,
    totalMs: 0,
    maxMs: 0,
    topScripts: [],
  };

  private longTaskObserver: PerformanceObserver | null = null;
  private loafObserver: PerformanceObserver | null = null;

  // Render counting
  private renderCountInterval: number = 0;
  private currentRendersPerSec: number = 0;

  // rAF FPS tracking
  private lastRafTimestamp: number = 0;
  private rafId: number | null = null;

  // Periodic console logging
  private logIntervalId: any = null;
  private listeners: Set<(report: PerfReport) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      this.enabled = params.get("perf") === "1";
      this.label = params.get("label") || null;

      if (this.enabled) {
        console.log(
          `%c[PerfProbe] Initialized in ENABLED mode (?perf=1${this.label ? `, label=${this.label}` : ""})`,
          "color: #10b981; font-weight: bold;"
        );
        this.initObservers();
        this.startFpsTracking();
        this.startPeriodicLogger();
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getLabel(): string | null {
    return this.label;
  }

  public logInitMetadataOnce(source: string, meta: {
    mediaPipeDelegate?: string;
    ortWasmProxy?: boolean;
    phaserRenderer?: string;
  }) {
    if (!this.enabled) return;

    if (meta.mediaPipeDelegate !== undefined) this.mediaPipeDelegate = meta.mediaPipeDelegate;
    if (meta.ortWasmProxy !== undefined) this.ortWasmProxy = meta.ortWasmProxy;
    if (meta.phaserRenderer !== undefined) this.phaserRenderer = meta.phaserRenderer;

    if (!this.hasLoggedInit && this.mediaPipeDelegate && this.phaserRenderer) {
      this.hasLoggedInit = true;
      console.group("%c[PerfProbe Baseline Environment]", "color: #6366f1; font-weight: bold;");
      console.log("Label:", this.label ?? "none");
      console.log("Hardware Concurrency (cores):", navigator.hardwareConcurrency ?? "unknown");
      console.log("Device Pixel Ratio:", window.devicePixelRatio ?? 1);
      console.log("MediaPipe Actual Delegate:", this.mediaPipeDelegate);
      console.log("ONNX Runtime WASM Proxy:", this.ortWasmProxy);
      console.log("Phaser Active Renderer:", this.phaserRenderer);
      console.groupEnd();
    }
  }

  public recordMediaPipeInference(durationMs: number) {
    if (!this.enabled) return;
    this.mediapipeBuf.push(durationMs);
  }

  public recordVadFrame(durationMs: number) {
    if (!this.enabled) return;
    this.vadBuf.push(durationMs);
  }

  public recordPhaserUpdate(durationMs: number) {
    if (!this.enabled) return;
    this.phaserUpdateBuf.push(durationMs);
  }

  public recordEncodeWav(durationMs: number) {
    if (!this.enabled) return;
    this.encodeWavBuf.push(durationMs);
  }

  public recordVerdictRtt(durationMs: number) {
    if (!this.enabled) return;
    this.verdictRttBuf.push(durationMs);
  }

  public markRender() {
    if (!this.enabled) return;
    this.renderCountInterval += 1;
  }

  private initObservers() {
    if (typeof PerformanceObserver === "undefined") return;

    // LongTask observer
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTaskCountCum += 1;
          this.longTaskTotalMsCum += entry.duration;
          if (entry.duration > this.longTaskMaxMsCum) {
            this.longTaskMaxMsCum = entry.duration;
          }

          this.windowLongTaskCount += 1;
          this.windowLongTaskTotalMs += entry.duration;
          if (entry.duration > this.windowLongTaskMaxMs) {
            this.windowLongTaskMaxMs = entry.duration;
          }
        }
      });
      this.longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
      // 'longtask' observer not supported on this browser (e.g. Firefox)
    }

    // LoAF (Long Animation Frame) observer (Chrome 123+)
    try {
      this.loafObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          this.windowLoafCount += 1;
          this.windowLoafTotalMs += entry.duration;
          if (entry.duration > this.windowLoafMaxMs) {
            this.windowLoafMaxMs = entry.duration;
          }

          if (entry.scripts && Array.isArray(entry.scripts)) {
            for (const script of entry.scripts) {
              const url = script.sourceURL || "inline/unknown";
              const fn = script.sourceFunctionName || "(anonymous)";
              const inv = script.invoker || "";
              const key = `${url}::${fn}::${inv}`;
              const existing = this.windowScriptMap.get(key) || {
                sourceURL: url,
                functionName: fn,
                invoker: inv,
                durationMs: 0,
              };
              existing.durationMs += script.duration || 0;
              this.windowScriptMap.set(key, existing);
            }
          }
        }
      });
      this.loafObserver.observe({ type: "long-animation-frame", buffered: true });
    } catch {
      // LoAF not supported in this browser
    }
  }

  private startFpsTracking() {
    const loop = (timestamp: number) => {
      if (this.lastRafTimestamp > 0) {
        const delta = timestamp - this.lastRafTimestamp;
        if (delta > 0) {
          const instantFps = 1000 / delta;
          this.fpsDeltaBuf.push(instantFps);
        }
      }
      this.lastRafTimestamp = timestamp;
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private startPeriodicLogger() {
    this.logIntervalId = setInterval(() => {
      this.currentRendersPerSec = this.renderCountInterval / 5;
      this.renderCountInterval = 0;

      // Capture and reset 5s window metrics for LongTasks & LoAF
      this.lastReportedWindowLongTasks = {
        count: this.windowLongTaskCount,
        totalMs: Number(this.windowLongTaskTotalMs.toFixed(1)),
        maxMs: Number(this.windowLongTaskMaxMs.toFixed(1)),
      };
      this.windowLongTaskCount = 0;
      this.windowLongTaskTotalMs = 0;
      this.windowLongTaskMaxMs = 0;

      const scriptList = Array.from(this.windowScriptMap.values())
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5)
        .map((s) => ({
          sourceURL: s.sourceURL,
          functionName: s.functionName,
          invoker: s.invoker,
          durationMs: Number(s.durationMs.toFixed(1)),
        }));

      this.lastReportedWindowLoaf = {
        count: this.windowLoafCount,
        totalMs: Number(this.windowLoafTotalMs.toFixed(1)),
        maxMs: Number(this.windowLoafMaxMs.toFixed(1)),
        topScripts: scriptList,
      };
      this.windowLoafCount = 0;
      this.windowLoafTotalMs = 0;
      this.windowLoafMaxMs = 0;
      this.windowScriptMap.clear();

      const report = this.generateReport();
      this.listeners.forEach((cb) => cb(report));

      console.groupCollapsed(
        `%c[PerfProbe 5s Summary${this.label ? ` (${this.label})` : ""}] FPS: ${report.metrics.fps_rAF.p50} (p5: ${report.metrics.fps_rAF.p5}) | MP p50: ${report.metrics.mediapipe_inference_ms.p50}ms | VAD p50: ${report.metrics.vad_frame_ms.p50}ms | Renders/s: ${report.metrics.rendersPerSecond} | LongTasks (5s): ${report.metrics.longTasksWindow.count} | LoAF (5s): ${report.metrics.longAnimationFrameWindow.count}`,
        "color: #0284c7; font-weight: bold;"
      );
      console.table({
        mediapipe_ms: report.metrics.mediapipe_inference_ms,
        vad_frame_ms: report.metrics.vad_frame_ms,
        phaser_update_ms: report.metrics.phaser_update_ms,
        encodeWAV_ms: report.metrics.encodeWAV_ms,
        verdict_rtt_ms: report.metrics.verdict_rtt_ms,
      });
      console.log("FPS (p50 / p5):", report.metrics.fps_rAF.p50, "/", report.metrics.fps_rAF.p5);
      console.log(
        "Long Tasks (Window Count / Total / Max ms):",
        `${report.metrics.longTasksWindow.count} / ${report.metrics.longTasksWindow.totalMs}ms / ${report.metrics.longTasksWindow.maxMs}ms`
      );
      console.log(
        "LoAF (Window Count / Total / Max ms):",
        `${report.metrics.longAnimationFrameWindow.count} / ${report.metrics.longAnimationFrameWindow.totalMs}ms / ${report.metrics.longAnimationFrameWindow.maxMs}ms`
      );
      if (scriptList.length > 0) {
        console.log("Top Attributed Scripts in LoAF (5s window):");
        console.table(scriptList);
      }
      console.groupEnd();
    }, 5000);
  }

  public generateReport(): PerfReport {
    const fpsVals = this.fpsDeltaBuf.getValues();
    let fpsP50 = 0;
    let fpsP5 = 0;
    let currentFps = 0;

    if (fpsVals.length > 0) {
      const sorted = [...fpsVals].sort((a, b) => a - b);
      fpsP50 = Math.round(sorted[Math.floor(sorted.length * 0.50)] ?? 0);
      fpsP5 = Math.round(sorted[Math.floor(sorted.length * 0.05)] ?? 0);
      currentFps = Math.round(fpsVals[fpsVals.length - 1] ?? 0);
    }

    return {
      timestamp: new Date().toISOString(),
      metadata: {
        hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
        devicePixelRatio: window.devicePixelRatio ?? 1,
        mediaPipeDelegate: this.mediaPipeDelegate,
        ortWasmProxy: this.ortWasmProxy,
        phaserRenderer: this.phaserRenderer,
        label: this.label,
      },
      metrics: {
        mediapipe_inference_ms: this.mediapipeBuf.getSummary(),
        vad_frame_ms: this.vadBuf.getSummary(),
        phaser_update_ms: this.phaserUpdateBuf.getSummary(),
        encodeWAV_ms: this.encodeWavBuf.getSummary(),
        verdict_rtt_ms: this.verdictRttBuf.getSummary(),
        fps_rAF: { p50: fpsP50, p5: fpsP5, current: currentFps },
        rendersPerSecond: Number(this.currentRendersPerSec.toFixed(1)),
        longTasksWindow: this.lastReportedWindowLongTasks,
        longTasksCumulative: {
          count: this.longTaskCountCum,
          totalMs: Number(this.longTaskTotalMsCum.toFixed(1)),
          maxMs: Number(this.longTaskMaxMsCum.toFixed(1)),
        },
        longAnimationFrameWindow: this.lastReportedWindowLoaf,
      },
    };
  }

  public subscribe(cb: (report: PerfReport) => void): () => void {
    if (!this.enabled) return () => {};
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public destroy() {
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
      this.longTaskObserver = null;
    }
    if (this.loafObserver) {
      this.loafObserver.disconnect();
      this.loafObserver = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.logIntervalId) {
      clearInterval(this.logIntervalId);
      this.logIntervalId = null;
    }
    this.listeners.clear();
  }
}

export const perfProbe = new PerfProbeManager();

