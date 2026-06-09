import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";

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
