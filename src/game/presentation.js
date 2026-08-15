/** A small spring used for weapon recoil and procedural viewmodel animation. */
export function createSpring(stiffness = 150, damping = 22) {
  return { value: 0, velocity: 0, target: 0, stiffness, damping };
}

export function impulseSpring(spring, impulse) { spring.velocity += impulse; }

export function stepSpring(spring, dt) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    spring.velocity += ((spring.target - spring.value) * spring.stiffness - spring.velocity * spring.damping) * h;
    spring.value += spring.velocity * h;
  }
  return spring.value;
}

export class CombatPresentation {
  constructor({ audioContext, overlay } = {}) {
    this.audio = audioContext;
    this.overlay = overlay;
    this.pitch = createSpring(190, 25);
    this.yaw = createSpring(170, 24);
    this.flash = 0;
    this.hit = null;
  }

  onShot(event) {
    impulseSpring(this.pitch, event.pitch * 85);
    impulseSpring(this.yaw, event.yaw * 85);
    this.flash = 1;
    this.playGunshot();
  }

  onHit(event) { this.hit = { ...event, elapsed: 0 }; }

  update(dt) {
    this.flash *= Math.exp(-42 * dt);
    if (this.hit) { this.hit.elapsed += dt; if (this.hit.elapsed >= this.hit.duration) this.hit = null; }
    return { recoilPitch: stepSpring(this.pitch, dt), recoilYaw: stepSpring(this.yaw, dt), muzzleFlash: this.flash, hitMarker: this.hit };
  }

  // Layered synthesized transient: instant and dependency-free, with no missing asset risk.
  playGunshot() {
    const ctx = this.audio;
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.42, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    const osc = ctx.createOscillator();
    osc.type = "sawtooth"; osc.frequency.setValueAtTime(155, now); osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1400;
    osc.connect(filter).connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + 0.17);
  }
}
