import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(here, "public");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const safePath = normalize(pathname === "/" ? "/index.html" : pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  const file = join(publicDir, safePath);
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Файл не найден. Сначала создайте JSON-отчёт командой CLI и загрузите его в панели.");
  }
}).listen(4173, "127.0.0.1", () => {
  console.log("Веб-панель: http://127.0.0.1:4173");
});
