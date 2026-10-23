import config from "@payload-config";
import { getPayload } from "payload";

import { checkPromoCode, normalizePromoCode } from "@/src/lib/booking/promo";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checks one promo code for the booking form's "Apply" button. Answers for a
 * single code only — the promo-codes collection itself is admin-read-only, so
 * the codes can't be listed through Payload's REST API.
 *
 * Display only: /api/book re-checks the code when the booking is submitted.
 */
export async function POST(request: Request) {
  let body: { code?: unknown };

  try {
    body = (await request.json()) as { code?: unknown };
  } catch {
    return Response.json({ valid: false, message: "Invalid request." }, { status: 400 });
  }

  const code = normalizePromoCode(body.code);
  if (!code) {
    return Response.json({ valid: false, message: "Enter a promo code." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });

    const found = await payload.find({
      collection: "promo-codes",
      where: { code: { equals: code } },
      limit: 1,
    });

    const result = checkPromoCode(found.docs[0], new Date());
    if (!result.valid) {
      return Response.json({ valid: false, reason: result.reason, message: result.message });
    }

    return Response.json({ valid: true, ...result.promo });
  } catch (err) {
    console.error("[promo] Unexpected error:", err);
    return Response.json(
      { valid: false, message: "Couldn't check that code right now. Please try again." },
      { status: 500 },
    );
  }
}
