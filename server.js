/**
 * Custom Next.js server for Phusion Passenger (cPanel "Setup Node.js App").
 *
 * Passenger sets process.env.PORT to the socket/port it manages.
 * This file must be listed as the "Application startup file" in cPanel.
 *
 * After deploy or code changes: touch tmp/restart.txt to reload the app.
 */

import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  await handle(req, res, parsedUrl);
});

server.listen(port, hostname, () => {
  console.log(`> Pasto Hair ready on http://${hostname}:${port}`);
});
