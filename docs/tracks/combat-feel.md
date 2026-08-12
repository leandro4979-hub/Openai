# Combat feel track

## Delivered artifacts

- `src/game/combat.js`: deterministic 720 RPM rifle, ammunition/reload lifecycle, distance falloff, hit zones, recoil events, and hit feedback envelopes.
- `src/game/movement.js`: frame-rate-independent acceleration, friction, sprint/crouch, coyote time, jump buffering, landing impulse, and procedural camera motion.
- `src/game/presentation.js`: hitch-resistant recoil springs, muzzle/hit presentation state, and a low-latency Web Audio gunshot transient.
- `test/combat.test.mjs`: deterministic cadence, reload, damage, locomotion, jump, camera, and spring stability coverage.

## Measurable acceptance criteria

| Gate | Target | Automated evidence |
| --- | --- | --- |
| Fire cadence | 720 RPM; no shot before 83.3 ms | cadence test |
| Reload accounting | never creates ammunition | reload conservation test |
| Locomotion | sprint converges to 7.3 m/s without overshoot | movement test |
| Input forgiveness | 90 ms coyote / 110 ms jump buffer | constants + jump test |
| Frame hitch stability | recoil remains finite and under 1 rad after 180 ms hitch | spring test |
| Replay consistency | same seed and shot index yield same recoil | cadence test |

## Integration notes

Call `tryFire` from the fixed simulation step and feed its event to `CombatPresentation.onShot`. Raycast consumers should call `damageAtDistance` and `createHitMarker`, then pass the marker to `onHit`. Apply movement velocity in world space after rotating its local X/Z components by view yaw. Web Audio must be resumed from a user gesture.

## Known defects / risks

- No viewmodel mesh or authored reload animation exists; animation is procedural recoil/camera motion only.
- The synthesized gunshot has no environmental convolution, occlusion, tails, or weapon variation.
- Movement does not own collision resolution, step-up, slopes, mantling, or stance-clearance checks; the renderer/physics integrator must supply `grounded`.
- Recoil is emitted as camera radians but aim-ray integration remains the host game's responsibility.
- Mobile touch and gamepad input mapping are outside this bounded track.
