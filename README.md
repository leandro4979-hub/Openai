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

## Run the GitHub Action

1. Add `FAL_KEY` under **Settings → Secrets and variables → Actions**.
2. Open **Actions → Nexus Omni Generate**.
3. Choose **Run workflow**, enter a prompt, and run it.
4. Open the workflow summary to view the generated image.

The action currently targets `fal-ai/flux/dev`. Provider responses are validated and failures are reported instead of returning placeholder output.

## Project map

```text
.
├── index.html                 # Prompt workspace
├── index.js                   # GitHub Action runtime
├── action.yml                 # Reusable action definition
├── main.yml                   # Workflow template/reference
├── package.json               # Local scripts and dependencies
└── .github/workflows/
    ├── ci.yml                 # Repository checks
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
