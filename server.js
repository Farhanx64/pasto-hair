import { createServer } from "node:http";
import { parse } from "node:url";
import { writeFileSync } from "node:fs";
import next from "next";

// Dump env at startup so we can see what Passenger provides
try {
  writeFileSync("/tmp/pasto-startup.log",
    `[${new Date().toISOString()}] PORT=${process.env.PORT} NODE_ENV=${process.env.NODE_ENV} CWD=${process.cwd()}\n`,
    { flag: "a" });
} catch (_) {}

const dev = process.env.NODE_ENV !== "production";
const portOrSocket = process.env.PORT || "3000";
const isSocket = isNaN(Number(portOrSocket));
const listenTarget = isSocket ? portOrSocket : parseInt(portOrSocket, 10);
const hostname = isSocket ? undefined : (process.env.HOST || "localhost");

const app = next({ dev, hostname, port: isSocket ? 0 : listenTarget });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  await handle(req, res, parsedUrl);
});

server.listen(listenTarget, hostname, () => {
  if (isSocket) {
    console.log(`> Pasto Hair ready on socket ${listenTarget}`);
  } else {
    console.log(`> Pasto Hair ready on http://${hostname}:${listenTarget}`);
  }
});
