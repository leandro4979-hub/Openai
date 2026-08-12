import test from "node:test";
import assert from "node:assert/strict";
import { createCombatArena, canOccupy, TILE } from "../src/world/arena.mjs";
import { castRay, hasLineOfSight } from "../src/world/raycaster.mjs";
import { createEnemy, damageEnemy, EnemyState, updateEnemy } from "../src/world/enemy-ai.mjs";
import { PerformanceGovernor } from "../src/world/performance.mjs";

test("arena has sealed bounds, valid spawns, and three enemies", () => {
  const arena = createCombatArena();
  assert.equal(arena.enemySpawns.length, 3);
  assert.ok(canOccupy(arena, arena.playerSpawn.x, arena.playerSpawn.z));
  for (let x = 0; x < arena.width; x++) assert.equal(arena.tiles[0][x], TILE.WALL);
});

test("DDA resolves walls and line-of-sight blockers", () => {
  const arena = createCombatArena();
  const hit = castRay(arena, 1.5, 1.5, Math.PI, 10);
  assert.equal(hit.tile, TILE.WALL); assert.ok(Math.abs(hit.distance - 0.5) < 1e-6);
  assert.equal(hasLineOfSight(arena, { x: 1.5, z: 1.5 }, { x: 8.5, z: 1.5 }), false);
});

test("enemy investigates sound, acquires visible target, fires, and dies", () => {
  const arena = createCombatArena();
  const enemy = createEnemy({ x: 3.5, z: 3.5 }, "guard-1"); enemy.yaw = 0;
  const world = { arena, player: { x: 5.5, z: 3.5 }, noise: { x: 4, z: 3.5, radius: 5, age: 0 } };
  updateEnemy(enemy, world, 0.1); assert.equal(enemy.state, EnemyState.INVESTIGATE);
  let events = []; for (let i = 0; i < 7; i++) events = events.concat(updateEnemy(enemy, world, 0.1));
  assert.equal(enemy.state, EnemyState.ENGAGE); assert.ok(events.some(event => event.type === "enemy-shot"));
  assert.equal(damageEnemy(enemy, 100), true); assert.equal(enemy.state, EnemyState.DEAD);
});

test("performance governor steps quality down under sustained p95 load", () => {
  const governor = new PerformanceGovernor({ sampleSize: 5, targetMs: 16 });
  for (let i = 0; i < 5; i++) governor.sample(30, 2000 + i);
  assert.equal(governor.quality, 1); assert.equal(governor.snapshot().p95Ms, 30);
});
