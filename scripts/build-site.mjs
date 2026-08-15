import { cp, mkdir, rm } from "node:fs/promises";

await rm("public", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await cp("index.html", "public/index.html");
await cp("src", "public/src", { recursive: true });
