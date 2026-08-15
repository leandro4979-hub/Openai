import test from "node:test";
import assert from "node:assert/strict";
import { createHudModel } from "../src/experience/hud.js";
import { LocalSnapshotStream } from "../src/experience/ghost-network.js";
import { evaluateQuality } from "../src/experience/quality-gates.js";

test("HUD model clamps unsafe values and exposes urgent prompts", () => {
  const hud = createHudModel({ health: -4, magazine: 0, reserve: 30, objectiveDistance: 12.6 }, { hudScale: 9 });
  assert.equal(hud.health, 0);
  assert.equal(hud.healthTone, "critical");
  assert.equal(hud.reloadPrompt, true);
  assert.equal(hud.objectiveDistance, 13);
  assert.equal(hud.settings.hudScale, 1.5);
});

test("local ghost snapshots interpolate and survive deterministic round-trip", () => {
  const stream = new LocalSnapshotStream({ tickRate: 20 });
  stream.record({ tick: 0, position: { x: 0 }, action: "run" });
  stream.record({ tick: 2, position: { x: 10 }, yaw: 2, action: "fire" });
  const middle = stream.sample(1);
  assert.deepEqual(middle.position, { x: 5, y: 0, z: 0 });
  assert.equal(middle.yaw, 1);
  assert.deepEqual(LocalSnapshotStream.deserialize(stream.serialize()).snapshots, stream.snapshots);
  assert.throws(() => stream.record({ tick: 2 }), /increase/);
});

test("quality harness reports individual performance and gameplay gates", () => {
  const pass = evaluateQuality({ frameTimes: Array(120).fill(16), shotsFired: 10, shotsHit: 4, criticalDefects: 0 });
  assert.equal(pass.passed, true);
  const fail = evaluateQuality({ frameTimes: [16, 16, 50, 60], shotsFired: 10, shotsHit: 0, criticalDefects: 1 });
  assert.equal(fail.passed, false);
  assert.deepEqual(fail.checks, { fps: false, p95Frame: false, longFrames: true, accuracy: false, criticalDefects: false });
});
