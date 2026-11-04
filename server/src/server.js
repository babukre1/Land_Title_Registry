import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Land Title Registry API listening on http://localhost:${env.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing HTTP server.`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
