# Nexus Omni Studio

An honest, lightweight prompt workspace for shaping image, video, and chat ideas before sending them to an AI provider.

![Status](https://img.shields.io/badge/status-foundation_ready-6ee7b7)
![Node](https://img.shields.io/badge/node-20%2B-5fa04e)
![License](https://img.shields.io/badge/license-MIT-8b5cf6)

## What works today

- A responsive prompt workspace with chat, image, and video modes
- Starter prompts that can be loaded and edited
- Local prompt history stored in the browser
- Copy-to-clipboard and clear-history controls
- A reusable GitHub Action for FAL image generation
- Automated checks for JavaScript, metadata, and the static experience

The web interface does **not** pretend to generate media. It prepares prompts locally and labels provider integration as the next milestone.

## Try the workspace

No installation is required:

```bash
git clone https://github.com/leandro4979-hub/Openai.git
cd Openai
npm install
npm run dev
```

Open `http://localhost:4173`.

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
├── index.html                 # Prompt workspace
├── index.js                   # GitHub Action runtime
├── action.yml                 # Reusable action definition
├── dist/index.js              # Bundled GitHub Action runtime
├── package.json               # Local scripts and dependencies
└── .github/workflows/
    ├── ci.yml                 # Repository checks
    ├── nexus-omni-generate.yml # Manually dispatched FAL generation
    └── pages.yml              # GitHub Pages deployment
```

## Roadmap

- Add an authenticated server-side provider adapter
- Stream real job status into the workspace
- Add a generated-media gallery with provenance
- Add provider-agnostic request and response contracts

## Security

Never put API keys in `index.html`, commits, or browser storage. Use GitHub Actions secrets for workflows and server-side environment variables for a future API.

## Contributing

Open an issue describing the expected outcome and the provider or environment involved. Small, testable pull requests are preferred.

## License

[MIT](LICENSE)
