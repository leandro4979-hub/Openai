import { readFile } from "node:fs/promises";

const requiredFiles = ["README.md", "index.html", "action.yml", "package.json"];
const contents = await Promise.all(
  requiredFiles.map(async (path) => [path, await readFile(path, "utf8")]),
);

for (const [path, content] of contents) {
  if (!content.trim()) throw new Error(`${path} is empty`);
}

const html = contents.find(([path]) => path === "index.html")[1];
for (const marker of ["<title>", 'id="prompt"', 'id="history-list"']) {
  if (!html.includes(marker)) throw new Error(`index.html is missing ${marker}`);
}

JSON.parse(contents.find(([path]) => path === "package.json")[1]);
console.log("Project checks passed.");
