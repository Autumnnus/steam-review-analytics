import { app } from "./src/app";
import { PORT } from "./src/config";

const favicon = Bun.file("fav.png");

Bun.serve({
  fetch(req, server) {
    const pathname = new URL(req.url).pathname;
    if (pathname === "/favicon.png" || pathname === "/og-image.png") {
      return new Response(favicon, { headers: { "Content-Type": "image/png" } });
    }
    const ip = server.requestIP(req);
    if (ip?.address) {
      const headers = new Headers(req.headers);
      headers.set("x-real-ip", ip.address);
      return app.fetch(new Request(req, { headers }));
    }
    return app.fetch(req);
  },
  port: PORT,
});

console.log(`Steam Review Analytics running on http://localhost:${PORT}`);
