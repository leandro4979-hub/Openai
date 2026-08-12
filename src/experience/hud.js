const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const DEFAULT_ACCESSIBILITY = Object.freeze({
  reducedMotion: false,
  highContrast: false,
  crosshairScale: 1,
  hudScale: 1,
});

/** Produces a normalized, render-safe HUD model from live simulation state. */
export function createHudModel(state = {}, accessibility = {}) {
  const health = clamp(Number.isFinite(state.health) ? state.health : 100, 0, 100);
  const magazine = Math.max(0, Math.trunc(state.magazine ?? 0));
  const reserve = Math.max(0, Math.trunc(state.reserve ?? 0));
  const objectiveDistance = Math.max(0, Math.round(state.objectiveDistance ?? 0));
  const settings = { ...DEFAULT_ACCESSIBILITY, ...accessibility };

  return Object.freeze({
    health,
    healthTone: health <= 25 ? "critical" : health <= 55 ? "warning" : "ready",
    ammo: `${magazine} / ${reserve}`,
    reloadPrompt: magazine === 0 && reserve > 0,
    objective: state.objective || "SECURE THE RELAY",
    objectiveDistance,
    objectiveLabel: `${state.objective || "SECURE THE RELAY"} · ${objectiveDistance}m`,
    hitMarker: Boolean(state.hitMarker),
    interaction: state.interaction ? String(state.interaction) : "",
    settings: Object.freeze({
      reducedMotion: Boolean(settings.reducedMotion),
      highContrast: Boolean(settings.highContrast),
      crosshairScale: clamp(Number(settings.crosshairScale) || 1, 0.75, 2),
      hudScale: clamp(Number(settings.hudScale) || 1, 0.8, 1.5),
    }),
  });
}

/** Minimal DOM adapter: simulation remains independent and testable. */
export function renderHud(root, model) {
  if (!root || !model) return;
  root.dataset.health = model.healthTone;
  root.dataset.contrast = model.settings.highContrast ? "high" : "standard";
  root.dataset.motion = model.settings.reducedMotion ? "reduced" : "full";
  root.style.setProperty("--hud-scale", model.settings.hudScale);
  root.style.setProperty("--crosshair-scale", model.settings.crosshairScale);

  const setText = (selector, value) => {
    const element = root.querySelector(selector);
    if (element) element.textContent = value;
  };
  setText("[data-hud-health]", String(Math.round(model.health)));
  setText("[data-hud-ammo]", model.ammo);
  setText("[data-hud-objective]", model.objectiveLabel);
  setText("[data-hud-interaction]", model.interaction);

  const reload = root.querySelector("[data-hud-reload]");
  if (reload) reload.hidden = !model.reloadPrompt;
  const marker = root.querySelector("[data-hud-hit-marker]");
  if (marker) marker.hidden = !model.hitMarker;
}

export function bindPauseMenu({ menu, resumeButton, settingsButton, onResume, onSettings }) {
  if (!menu) throw new TypeError("A pause menu element is required");
  const resume = () => {
    menu.hidden = true;
    menu.setAttribute("aria-hidden", "true");
    onResume?.();
  };
  const settings = () => onSettings?.();
  resumeButton?.addEventListener("click", resume);
  settingsButton?.addEventListener("click", settings);
  return () => {
    resumeButton?.removeEventListener("click", resume);
    settingsButton?.removeEventListener("click", settings);
  };
}
