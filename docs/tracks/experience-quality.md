# Experience quality track: UI, local snapshots, QA, review

## Scope and artifacts

- `src/experience/hud.js`: render-safe HUD projection, accessibility scaling, low-health/reload states, a DOM adapter, and pause-menu lifecycle binding.
- `src/experience/ghost-network.js`: bounded deterministic local replay/ghost snapshots with interpolation and versioned serialization. It is deliberately **not multiplayer** and makes no server-authority claim.
- `src/experience/quality-gates.js`: automated evaluation of recorded frame time, accuracy, and critical-defect telemetry.
- `test/experience.test.mjs`: boundary, determinism, interpolation, and pass/fail gate coverage.

## Acceptance criteria

1. HUD never displays health outside 0–100, negative ammunition, or unbounded HUD/crosshair scale.
2. Empty magazines with reserve ammunition provide a reload prompt; health at or below 25 has a critical state.
3. Every recorded snapshot has a unique increasing safe-integer tick; midpoint replay position and aim interpolate deterministically.
4. No feature labels the local replay abstraction as online multiplayer.
5. A representative playtest capture passes only with mean FPS >= 50, p95 frame time <= 20 ms, at most three >33.34 ms frames, accuracy >= 20%, and zero P0/P1 defects.
6. Keyboard-operable native controls and live HUD text retain semantic DOM ownership; reduced-motion and high-contrast state are exposed as data attributes for presentation layers.

## Independent architecture review

- **Positive:** Pure state projection separates simulation from DOM rendering, allowing deterministic tests and avoiding a second game-state owner.
- **Positive:** Snapshot serialization is explicitly versioned and bounded. Invalid or reordered ticks fail loudly instead of producing corrupt playback.
- **Positive:** Quality decisions are metric-based, not claims of parity with a commercial title.
- **Concern:** The presentation entry point must supply matching `data-hud-*` nodes and CSS for contrast/motion states. This module does not silently inject inaccessible markup.
- **Concern:** Accuracy is only a smoke gate; encounter completion time, damage taken, input latency, and player-rated weapon feel still require captured playtest evidence.
- **Concern:** Local ghosts are not rollback, prediction, reconciliation, anti-cheat, matchmaking, or remote transport. Shipping multiplayer would require a separately tested authoritative architecture.

## Known defects / integration risks

- **P2:** Yaw interpolation is linear and can take the long path across the ±π wrap boundary.
- **P2:** Snapshot playback has no binary compression; long sessions should persist chunks outside the in-memory ring.
- **P2:** DOM adapter intentionally no-ops when optional elements are absent, so an integration markup typo is visible but not fatal.
- No P0/P1 defects are known within this bounded module after its automated test run.
