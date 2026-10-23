import config from "@payload-config";
import { cookies } from "next/headers";
import { getPayload } from "payload";

import {
  SESSION_COOKIE,
  findOrCreateCustomer,
  loginTokenStore,
  sessionCookieOptions,
  sessionStore,
} from "@/src/lib/account/server";
import { consumeLoginToken, createSession } from "@/src/lib/account/tokens";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of passwordless sign-in: spend the emailed token, start a session.
 *
 * POST only, deliberately — same reasoning as /api/cancel. Mail clients and
 * link scanners prefetch GET links; if opening the link signed you in, the
 * scanner would burn the single-use token (or worse, hold the session) before
 * the customer ever clicked. The emailed link lands on a page that does
 * nothing until the customer presses "Sign in".
 */
export async function POST(request: Request) {
  let body: { token?: unknown };
  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  try {
    const email = await consumeLoginToken(loginTokenStore, body.token);
    if (!email) {
      // One answer for unknown, used, expired and malformed.
      return Response.json(
        {
          success: false,
          message: "This sign-in link has expired or was already used. Request a new one.",
        },
        { status: 400 },
      );
    }

    const customer = await findOrCreateCustomer(email);

    const payload = await getPayload({ config });
    await payload.update({
      collection: "customers",
      id: customer.id,
      data: { lastLoginAt: new Date().toISOString() },
    });

    const { secret, expiresAt } = await createSession(sessionStore, String(customer.id));
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, secret, sessionCookieOptions(expiresAt));

    return Response.json({ success: true });
  } catch (err) {
    console.error("[account] Sign-in verification failed:", err);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
