import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    let pathname = decodeURIComponent(requestUrl.pathname);
    pathname = pathname === "/" ? "/index.html" : pathname;

    let filePath = resolve(root, `.${pathname}`);
    const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;

    if (filePath !== root && !filePath.startsWith(rootPrefix)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const fileStats = await stat(filePath);

    if (fileStats.isDirectory()) {
      filePath = resolve(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Cache-Control": "no-cache",
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Random class caller is running at http://127.0.0.1:${port}`);
});
