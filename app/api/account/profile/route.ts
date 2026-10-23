import config from "@payload-config";
import { getPayload } from "payload";

import { findBookingsForEmail, getCurrentCustomer } from "@/src/lib/account/server";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const NAME_MAX = 100;
const PHONE_MAX = 30;

/**
 * The signed-in customer's own contact details, for prefilling the booking
 * form. Signed out is a normal answer (200, signedIn: false), not an error —
 * the booking form calls this for everyone and booking never needs an account.
 *
 * Name/phone fall back to the most recent booking's, so a customer who has
 * booked before gets a filled-in form before they've ever edited a profile.
 */
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return Response.json({ signedIn: false }, { headers: NO_STORE });
  }

  let name = customer.name ?? "";
  let phone = customer.phone ?? "";
  if (!name || !phone) {
    const latest = (await findBookingsForEmail(customer.email))[0];
    name ||= latest?.customerName ?? "";
    phone ||= latest?.customerPhone ?? "";
  }

  return Response.json(
    { signedIn: true, email: customer.email, name, phone },
    { headers: NO_STORE },
  );
}

/**
 * Update name/phone. Email is the account key and isn't editable here —
 * changing it would need the new address verified first.
 *
 * CSRF: the session cookie is SameSite=Lax, so a cross-site POST arrives
 * without it and is rejected as signed out.
 */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return Response.json({ success: false, message: "Please sign in again." }, { status: 401 });
  }

  let body: { name?: unknown; phone?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; phone?: unknown };
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (name.length > NAME_MAX || phone.length > PHONE_MAX) {
    return Response.json({ success: false, message: "That's a bit long — please shorten it." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    await payload.update({
      collection: "customers",
      id: customer.id,
      data: { name, phone },
    });
    return Response.json({ success: true, name, phone });
  } catch (err) {
    console.error("[account] Profile update failed:", err);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
