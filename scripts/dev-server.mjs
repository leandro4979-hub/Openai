import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = 4173;
const types = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

createServer((request, response) => {
  const pathname = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const relativePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]/, "");
  const path = join(process.cwd(), relativePath);

  const stream = createReadStream(path);
  stream.on("open", () => {
    response.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
    stream.pipe(response);
  });
  stream.on("error", () => {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });
}).listen(port, () => {
  console.log(`Blacksite Relay is running at http://localhost:${port}`);
});
