const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const approach = (from, to, amount) => from + (to - from) * (1 - Math.exp(-amount));

export const MOVEMENT = Object.freeze({ walk: 5.4, sprint: 7.3, crouch: 3.1, groundAccel: 18, airAccel: 3.2, friction: 13, jump: 5.25, gravity: 15.8, coyote: 0.09, buffer: 0.11 });

export function createMovementState() {
  return { velocity: { x: 0, y: 0, z: 0 }, grounded: true, crouched: false, sprinting: false, coyote: 0, jumpBuffer: 0, bob: 0, landKick: 0 };
}

/** input.x/right, input.z/forward in camera-local space. */
export function stepMovement(state, input, dt) {
  const m = MOVEMENT;
  const wasGrounded = state.grounded;
  const grounded = input.grounded ?? state.grounded;
  let coyote = grounded ? m.coyote : Math.max(0, state.coyote - dt);
  let jumpBuffer = input.jumpPressed ? m.buffer : Math.max(0, state.jumpBuffer - dt);
  const crouched = Boolean(input.crouch);
  const sprinting = Boolean(input.sprint && !crouched && (input.z ?? 0) > 0.15);
  const maxSpeed = crouched ? m.crouch : sprinting ? m.sprint : m.walk;
  const x = input.x ?? 0, z = input.z ?? 0;
  const len = Math.max(1, Math.hypot(x, z));
  const accel = grounded ? m.groundAccel : m.airAccel;
  let vx = approach(state.velocity.x, x / len * maxSpeed, accel * dt);
  let vz = approach(state.velocity.z, z / len * maxSpeed, accel * dt);
  if (grounded && Math.hypot(x, z) < 0.05) {
    vx = approach(vx, 0, m.friction * dt); vz = approach(vz, 0, m.friction * dt);
  }
  let vy = grounded ? Math.max(0, state.velocity.y) : state.velocity.y - m.gravity * dt;
  let nextGrounded = grounded;
  if (jumpBuffer > 0 && coyote > 0) {
    vy = m.jump; nextGrounded = false; jumpBuffer = 0; coyote = 0;
  }
  const speedRatio = clamp(Math.hypot(vx, vz) / m.sprint, 0, 1);
  const bob = state.bob + dt * (sprinting ? 14 : crouched ? 7 : 10) * speedRatio;
  const impact = !wasGrounded && grounded ? clamp(Math.abs(state.velocity.y) / 12, 0, 1) : 0;
  const landKick = Math.max(impact, state.landKick * Math.exp(-18 * dt));
  return { velocity: { x: vx, y: vy, z: vz }, grounded: nextGrounded, crouched, sprinting, coyote, jumpBuffer, bob, landKick };
}

export function cameraMotion(state) {
  const planar = Math.hypot(state.velocity.x, state.velocity.z);
  const amp = Math.min(1, planar / MOVEMENT.walk) * (state.crouched ? 0.008 : 0.014);
  return { x: Math.cos(state.bob * 0.5) * amp, y: Math.sin(state.bob) * amp - state.landKick * 0.045, roll: Math.cos(state.bob * 0.5) * amp * 0.45 };
}
