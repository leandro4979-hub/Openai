export const DEFAULT_QUALITY_GATES = Object.freeze({
  minimumFps: 50,
  p95FrameMs: 20,
  maximumLongFrames: 3,
  minimumAccuracy: 0.2,
  maximumCriticalDefects: 0,
});

const percentile = (values, amount) => {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(amount * sorted.length) - 1];
};

/** Evaluates captured playtest telemetry against explicit, repeatable gates. */
export function evaluateQuality(sample, gates = {}) {
  const target = { ...DEFAULT_QUALITY_GATES, ...gates };
  const frames = (sample.frameTimes || []).filter((value) => Number.isFinite(value) && value >= 0);
  const duration = frames.reduce((sum, value) => sum + value, 0);
  const fps = duration ? (frames.length * 1000) / duration : 0;
  const p95 = percentile(frames, 0.95);
  const longFrames = frames.filter((value) => value > 33.34).length;
  const shots = Math.max(0, sample.shotsFired || 0);
  const accuracy = shots ? Math.max(0, sample.shotsHit || 0) / shots : 0;
  const checks = {
    fps: fps >= target.minimumFps,
    p95Frame: p95 <= target.p95FrameMs,
    longFrames: longFrames <= target.maximumLongFrames,
    accuracy: accuracy >= target.minimumAccuracy,
    criticalDefects: (sample.criticalDefects || 0) <= target.maximumCriticalDefects,
  };
  return Object.freeze({
    passed: Object.values(checks).every(Boolean),
    checks: Object.freeze(checks),
    metrics: Object.freeze({ fps, p95FrameMs: p95, longFrames, accuracy }),
  });
}
