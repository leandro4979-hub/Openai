# World, AI, rendering, and performance track

## Concrete artifacts

- `arena.mjs`: sealed 24×15 three-lane arena, hard/soft sightline blockers, three combat spawns, objective and extraction data.
- `raycaster.mjs`: allocation-light grid DDA, corrected wall-column renderer, texture coordinate and shared visibility query.
- `enemy-ai.mjs`: patrol/investigate/engage/dead state machine, vision cone, hearing, awareness decay, navigation collision, deterministic cadence, and damage transitions.
- `performance.mjs`: rolling frame timings, p95 reporting, and three-step ray/particle/shadow quality governor.

## Measurable acceptance criteria

- Every player/enemy spawn occupies four collision-safe corners and arena edges are sealed.
- Occluding tiles stop both rendering rays and AI sight, preventing divergent perception.
- AI needs 220 ms of continuous visibility to cross its 0.55 engagement threshold, loses awareness over time, and emits no more than one shot per 580 ms.
- Quality decreases after a full sample window with p95 frame time above 130% of target, no more than once per 1.5 seconds.
- Runtime gate: target 60 FPS, p95 ≤ 20 ms on a current desktop browser at native 1080p; instrumentation exposes evidence but hardware playtest remains required.

## Known defects / follow-up

- Navigation uses collision-aware direct steering rather than a navmesh, so guards may stall on concave corners (P2 for this compact arena).
- Enemy hit resolution is returned as `hitChance`; the authoritative combat/gameplay layer must sample it and apply player damage.
- Wall renderer intentionally draws geometry only; sprites, floor/ceiling, weapons, post-processing, and UI must be composed by integration tracks.
- Performance gate has automated governor coverage but cannot establish 1080p GPU/browser p95 without an end-to-end browser playtest.
