import config from "@payload-config";
import { getPayload } from "payload";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    const payload = await getPayload({ config });
    const users = await payload.count({ collection: "users" });
    return Response.json({
      status: "ok",
      db: "reachable",
      runtime: "nodejs",
      node: process.version,
      users: users.totalDocs,
      ms: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
