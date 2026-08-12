export class PerformanceGovernor {
  constructor({ sampleSize = 90, targetMs = 16.67 } = {}) {
    this.samples = new Float32Array(sampleSize); this.cursor = 0; this.count = 0;
    this.targetMs = targetMs; this.quality = 2; this.lastAdjustment = 0;
  }
  sample(frameMs, now = performance.now()) {
    this.samples[this.cursor] = frameMs; this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.samples.length, this.count + 1);
    if (this.count === this.samples.length && now - this.lastAdjustment > 1500) {
      const p95 = this.percentile(0.95);
      if (p95 > this.targetMs * 1.3) this.quality = Math.max(0, this.quality - 1);
      else if (p95 < this.targetMs * 0.82) this.quality = Math.min(2, this.quality + 1);
      this.lastAdjustment = now;
    }
    return this.settings();
  }
  percentile(fraction) {
    if (!this.count) return 0;
    const sorted = Array.from(this.samples.slice(0, this.count)).sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];
  }
  settings() {
    return [
      { rayScale: 0.42, particles: 0.35, shadows: false },
      { rayScale: 0.68, particles: 0.65, shadows: false },
      { rayScale: 1, particles: 1, shadows: true },
    ][this.quality];
  }
  snapshot() { return { averageMs: this.count ? Array.from(this.samples.slice(0, this.count)).reduce((a, b) => a + b, 0) / this.count : 0, p95Ms: this.percentile(0.95), quality: this.quality }; }
}
