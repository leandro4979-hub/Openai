/** Deterministic, frame-rate-independent combat simulation primitives. */
export const WEAPONS = Object.freeze({
  viper: Object.freeze({
    id: "viper", label: "VX-9 Viper", magazine: 30, reserve: 120,
    roundsPerMinute: 720, damage: 34, headMultiplier: 1.65,
    range: 42, falloff: 0.48, reloadSeconds: 1.72,
    recoil: Object.freeze({ pitch: 0.0088, yaw: 0.0035, recovery: 14 }),
  }),
});

export function createWeaponState(id = "viper") {
  const spec = WEAPONS[id];
  if (!spec) throw new Error(`Unknown weapon: ${id}`);
  return { id, ammo: spec.magazine, reserve: spec.reserve, cooldown: 0, reload: 0, shot: 0 };
}

export function tickWeapon(state, dt) {
  return { ...state, cooldown: Math.max(0, state.cooldown - dt), reload: Math.max(0, state.reload - dt) };
}

export function startReload(state) {
  const spec = WEAPONS[state.id];
  if (state.reload || state.ammo === spec.magazine || state.reserve === 0) return state;
  return { ...state, reload: spec.reloadSeconds };
}

export function finishReload(state) {
  if (state.reload > 0) return state;
  const spec = WEAPONS[state.id];
  const loaded = Math.min(spec.magazine - state.ammo, state.reserve);
  return { ...state, ammo: state.ammo + loaded, reserve: state.reserve - loaded };
}

// Tiny integer hash means recoil is reproducible in replays without Math.random.
function noise(seed) {
  let n = (seed + 0x6d2b79f5) | 0;
  n = Math.imul(n ^ (n >>> 15), n | 1);
  n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967295;
}

export function tryFire(state, seed = 1) {
  const spec = WEAPONS[state.id];
  if (state.cooldown > 0 || state.reload > 0 || state.ammo <= 0) return { state, event: null };
  const shot = state.shot + 1;
  const yaw = (noise(seed + shot) * 2 - 1) * spec.recoil.yaw;
  return {
    state: { ...state, ammo: state.ammo - 1, cooldown: 60 / spec.roundsPerMinute, shot },
    event: { type: "shot", weapon: state.id, pitch: spec.recoil.pitch, yaw, impulse: 1 },
  };
}

export function damageAtDistance(weaponId, distance, hitZone = "body") {
  const w = WEAPONS[weaponId];
  const t = Math.max(0, Math.min(1, distance / w.range));
  const base = w.damage * (1 - t * (1 - w.falloff));
  return base * (hitZone === "head" ? w.headMultiplier : 1);
}

export function createHitMarker(hitZone, lethal = false) {
  return { type: "hit", hitZone, lethal, strength: lethal ? 1 : hitZone === "head" ? 0.8 : 0.55, duration: lethal ? 0.18 : 0.11 };
}
