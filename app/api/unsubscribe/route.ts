import config from "@payload-config";
import { getPayload } from "payload";

import { verifyUnsubscribe } from "@/src/lib/marketing/unsubscribe";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Adds the signed email to the promo opt-out list.
 *
 * Two callers: the /unsubscribe page's button (JSON body {e, t}), and mail
 * apps' one-click unsubscribe (RFC 8058), which POSTs to the URL in the
 * List-Unsubscribe header with e/t in the query string. POST only — a GET
 * could be fired by link scanners.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let e: unknown = url.searchParams.get("e");
  let t: unknown = url.searchParams.get("t");

  if (!e || !t) {
    try {
      const body = (await request.json()) as { e?: unknown; t?: unknown };
      e = body.e;
      t = body.t;
    } catch {
      // fall through to the invalid-link answer
    }
  }

  const email = verifyUnsubscribe(e, t);
  if (!email) {
    return Response.json({ success: false, message: "That unsubscribe link isn't valid." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "email-opt-outs",
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    });
    if (existing.docs.length === 0) {
      await payload.create({ collection: "email-opt-outs", data: { email, source: "link" } });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    return Response.json(
      { success: false, message: "Something went wrong. Reply \"unsubscribe\" to the email instead." },
      { status: 500 },
    );
  }
}
