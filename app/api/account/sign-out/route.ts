import { cookies } from "next/headers";

import { SESSION_COOKIE, sessionStore } from "@/src/lib/account/server";
import { destroySession } from "@/src/lib/account/tokens";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ends the session server-side (the row is deleted), then clears the cookie. */
export async function POST() {
  const cookieStore = await cookies();
  try {
    await destroySession(sessionStore, cookieStore.get(SESSION_COOKIE)?.value);
  } catch (err) {
    console.error("[account] Session delete failed on sign-out:", err);
  }
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
