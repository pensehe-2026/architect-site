const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = process.argv[2];
const port = Number(process.argv[3] || 8900);
if (!envPath || !Number.isInteger(port)) throw new Error("env path and integer port are required");

for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match) process.env[match[1]] = match[2];
}
process.env.CAD_INTAKE_ORIGIN = "http://127.0.0.1:8891/cad-intake";
process.env.CAD_SITE_ORIGIN = `http://127.0.0.1:${port}`;
process.env.CAD_ALLOW_LOCAL_INTAKE = "1";

const { handler } = require("../netlify/functions/cad-upload-ticket.js");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  if (request.url === "/.netlify/functions/cad-upload-ticket") {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of request) {
      bytes += chunk.length;
      if (bytes > 4096) {
        response.writeHead(413, { "Content-Type": "application/json" });
        response.end('{"status":"ERROR","code":"BODY_SIZE_INVALID"}');
        return;
      }
      chunks.push(chunk);
    }
    const result = await handler({
      httpMethod: request.method,
      body: Buffer.concat(chunks).toString("utf8"),
      headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key.toLowerCase(), value])),
    });
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
    return;
  }

  const urlPath = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  const relative = urlPath === "/" || urlPath === "/convert" || urlPath === "/convert/"
    ? "convert/index.html"
    : urlPath.replace(/^\//, "");
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const content = fs.readFileSync(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(JSON.stringify({ status: "READY", url: `http://127.0.0.1:${port}/convert/` }) + "\n");
});
