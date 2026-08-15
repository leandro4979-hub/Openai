const copyVector = (value = {}) => ({ x: +value.x || 0, y: +value.y || 0, z: +value.z || 0 });
const lerp = (a, b, alpha) => a + (b - a) * alpha;

/**
 * Deterministic local snapshot stream for replays and test ghosts.
 * This intentionally does not imply remote multiplayer or server authority.
 */
export class LocalSnapshotStream {
  constructor({ tickRate = 20, capacity = 240 } = {}) {
    if (!Number.isFinite(tickRate) || tickRate <= 0) throw new RangeError("tickRate must be positive");
    this.tickRate = tickRate;
    this.capacity = Math.max(2, Math.trunc(capacity));
    this.snapshots = [];
  }

  record(snapshot) {
    const tick = Math.trunc(snapshot?.tick);
    if (!Number.isSafeInteger(tick) || tick < 0) throw new TypeError("snapshot tick must be a non-negative safe integer");
    const previous = this.snapshots.at(-1);
    if (previous && tick <= previous.tick) throw new RangeError("snapshot ticks must increase");
    const normalized = Object.freeze({
      tick,
      position: Object.freeze(copyVector(snapshot.position)),
      yaw: +snapshot.yaw || 0,
      pitch: +snapshot.pitch || 0,
      action: String(snapshot.action || "idle"),
    });
    this.snapshots.push(normalized);
    if (this.snapshots.length > this.capacity) this.snapshots.shift();
    return normalized;
  }

  sample(tick) {
    if (!this.snapshots.length) return null;
    const before = [...this.snapshots].reverse().find((item) => item.tick <= tick) || this.snapshots[0];
    const after = this.snapshots.find((item) => item.tick >= tick) || this.snapshots.at(-1);
    if (before === after) return before;
    const alpha = Math.max(0, Math.min(1, (tick - before.tick) / (after.tick - before.tick)));
    return {
      tick,
      position: {
        x: lerp(before.position.x, after.position.x, alpha),
        y: lerp(before.position.y, after.position.y, alpha),
        z: lerp(before.position.z, after.position.z, alpha),
      },
      yaw: lerp(before.yaw, after.yaw, alpha),
      pitch: lerp(before.pitch, after.pitch, alpha),
      action: alpha < 0.5 ? before.action : after.action,
    };
  }

  serialize() {
    return JSON.stringify({ version: 1, tickRate: this.tickRate, snapshots: this.snapshots });
  }

  static deserialize(payload) {
    const data = JSON.parse(payload);
    if (data.version !== 1 || !Array.isArray(data.snapshots)) throw new TypeError("Unsupported snapshot payload");
    const stream = new LocalSnapshotStream({ tickRate: data.tickRate, capacity: Math.max(2, data.snapshots.length) });
    for (const snapshot of data.snapshots) stream.record(snapshot);
    return stream;
  }
}
