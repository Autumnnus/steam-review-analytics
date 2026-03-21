import { app } from "./src/app";
import { PORT } from "./src/config";

Bun.serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Steam Review Analytics running on http://localhost:${PORT}`);
