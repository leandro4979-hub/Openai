import { readFile } from "node:fs/promises";

const requiredFiles = ["README.md", "index.html", "action.yml", "package.json", "dist/index.js", ".github/workflows/nexus-omni-generate.yml"];
const contents = await Promise.all(
  requiredFiles.map(async (path) => [path, await readFile(path, "utf8")]),
);

for (const [path, content] of contents) {
  if (!content.trim()) throw new Error(`${path} is empty`);
}

const html = contents.find(([path]) => path === "index.html")[1];
for (const marker of ["<title>", 'id="view"', 'id="deploy"', 'src="src/game.js"']) {
  if (!html.includes(marker)) throw new Error(`index.html is missing ${marker}`);
}

JSON.parse(contents.find(([path]) => path === "package.json")[1]);

const action = contents.find(([path]) => path === "action.yml")[1];
for (const marker of ["seed:", "main: dist/index.js"]) {
  if (!action.includes(marker)) throw new Error(`action.yml is missing ${marker}`);
}

const workflow = contents.find(([path]) => path === ".github/workflows/nexus-omni-generate.yml")[1];
for (const marker of ["workflow_dispatch:", "secrets.FAL_KEY", "uses: ./"]) {
  if (!workflow.includes(marker)) throw new Error(`The generation workflow is missing ${marker}`);
}
console.log("Project checks passed.");
