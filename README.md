# Blacksite Relay

A focused, dependency-free first-person shooter vertical slice that runs directly in a modern browser.

![Status](https://img.shields.io/badge/status-playable_vertical_slice-ffb21c)
![Node](https://img.shields.io/badge/node-20%2B-5fa04e)
![License](https://img.shields.io/badge/license-MIT-8b5cf6)

## Vertical slice

- Mouse-look raycast first-person rendering in a deliberately compact three-lane arena
- Responsive sprinting, collision, recoil, automatic fire, reloads, damage falloff, and headshots
- Three perception-driven guards with patrol, investigation, engagement, and death states
- Synthesized low-latency weapon audio, procedural viewmodel motion, hit confirmation, and damage feedback
- A complete clear-and-extract mission loop with a tactical HUD and pause/deploy flow
- Local-only deterministic ghost snapshot primitives; this slice does not claim online multiplayer
- A reusable GitHub Action for FAL image generation
- Automated checks for JavaScript, metadata, and the static experience

The repository retains its reusable FAL GitHub Action, but the browser experience is now Blacksite Relay.

## Play

No installation is required:

```bash
git clone https://github.com/leandro4979-hub/Openai.git
cd Openai
npm install
npm run dev
```

Open `http://localhost:4173`, deploy, then click the view to capture the mouse. Use WASD, Shift, R, and the mouse.

## Generate an image with GitHub Actions

1. Add `FAL_KEY` under **Settings → Secrets and variables → Actions**.
2. Open **Actions → Nexus Omni Generate** and choose **Run workflow**.
3. Enter an image prompt. Optionally enter a whole-number seed to reproduce a generation request.
4. Run the workflow and open its summary to view or download the generated image.

The workflow passes the secret to the reusable action as `fal_key`; the key is never written to logs. The action targets `fal-ai/flux/dev`, validates optional seeds before calling FAL, and reports provider failures instead of returning placeholder output.

## Reuse the action

The action bundles its runtime dependencies in `dist/index.js`, so consumers do not need to run `npm install` before invoking it.

```yaml
- uses: leandro4979-hub/Openai@main
  with:
    fal_key: ${{ secrets.FAL_KEY }}
    prompt: A sunlit greenhouse filled with rare orchids
    seed: 42 # optional whole number
```

`seed` is optional. If provided, it must be a JavaScript-safe whole number (for example, `42` or `-7`); decimals and text values are rejected.

## Project map

```text
.
├── index.html                 # Full-screen game shell and tactical HUD
├── src/game.js                # Browser game loop and system integration
├── src/game/                  # Combat, movement, and presentation primitives
├── src/world/                 # Arena, AI, raycasting, and performance governor
├── src/experience/            # HUD, local ghost snapshots, and quality gates
├── index.js                   # GitHub Action runtime
├── action.yml                 # Reusable action definition
├── dist/index.js              # Bundled GitHub Action runtime
├── package.json               # Local scripts and dependencies
└── .github/workflows/
    ├── ci.yml                 # Repository checks
    ├── nexus-omni-generate.yml # Manually dispatched FAL generation
    └── pages.yml              # GitHub Pages deployment
```

## Quality evidence

Track-specific measurable gates, test evidence, independent findings, and known P2 limitations are recorded under `docs/tracks/`. Automated tests cover combat cadence, ammo conservation, movement bounds, recoil stability, arena sealing, AI transitions, raycasting, snapshot determinism, and quality-gate evaluation.

## Security

Never put API keys in `index.html`, commits, or browser storage. Use GitHub Actions secrets for workflows and server-side environment variables for a future API.

## Contributing

Open an issue describing the expected outcome and the provider or environment involved. Small, testable pull requests are preferred.

## License

[MIT](LICENSE)
