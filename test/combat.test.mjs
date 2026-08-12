import test from "node:test";
import assert from "node:assert/strict";
import { createWeaponState, tickWeapon, tryFire, startReload, finishReload, damageAtDistance } from "../src/game/combat.js";
import { createMovementState, stepMovement, cameraMotion, MOVEMENT } from "../src/game/movement.js";
import { createSpring, impulseSpring, stepSpring } from "../src/game/presentation.js";

test("weapon cadence, ammo and deterministic recoil are enforced", () => {
  let weapon = createWeaponState();
  const first = tryFire(weapon, 77); weapon = first.state;
  assert.equal(weapon.ammo, 29); assert.ok(first.event);
  assert.equal(tryFire(weapon, 77).event, null);
  weapon = tickWeapon(weapon, 1 / 12);
  const second = tryFire(weapon, 77);
  assert.ok(second.event); assert.notEqual(first.event.yaw, second.event.yaw);
  assert.equal(tryFire(createWeaponState(), 77).event.yaw, first.event.yaw);
});

test("reload conserves ammunition and range falloff/headshots apply", () => {
  let weapon = { ...createWeaponState(), ammo: 3, reserve: 10 };
  weapon = startReload(weapon); assert.ok(weapon.reload > 1);
  assert.equal(finishReload(weapon).ammo, 3);
  weapon = finishReload({ ...weapon, reload: 0 });
  assert.deepEqual([weapon.ammo, weapon.reserve], [13, 0]);
  assert.ok(damageAtDistance("viper", 0, "head") > damageAtDistance("viper", 0));
  assert.ok(damageAtDistance("viper", 42) < damageAtDistance("viper", 0));
});

test("movement reaches bounded sprint speed and supports buffered/coyote jump", () => {
  let state = createMovementState();
  for (let i = 0; i < 180; i++) state = stepMovement(state, { z: 1, sprint: true, grounded: true }, 1 / 60);
  assert.ok(Math.abs(state.velocity.z - MOVEMENT.sprint) < 0.01);
  state = stepMovement({ ...state, grounded: false, coyote: 0.05 }, { jumpPressed: true, grounded: false }, 1 / 60);
  assert.equal(state.velocity.y, MOVEMENT.jump);
  assert.ok(Object.values(cameraMotion(state)).every(Number.isFinite));
});

test("procedural recoil spring remains stable through a frame hitch and settles", () => {
  const spring = createSpring(); impulseSpring(spring, 2);
  stepSpring(spring, 0.18);
  assert.ok(Number.isFinite(spring.value)); assert.ok(Math.abs(spring.value) < 1);
  for (let i = 0; i < 300; i++) stepSpring(spring, 1 / 60);
  assert.ok(Math.abs(spring.value) < 1e-6);
});
