import config from "@payload-config";
import { getPayload } from "payload";

import { deleteCalendarEvent, nyLocalToISO } from "@/src/lib/calendar/index";
import { sendCancellationNotice } from "@/src/lib/notifications/index";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer-initiated cancellation, reached from the link in the confirmation
 * email. Authenticated only by the booking's cancelToken — a random UUID, not
 * the row id, because the id is trivially enumerable and a guessable link would
 * let anyone clear the calendar.
 *
 * POST only, deliberately. Mail clients and link scanners prefetch GET links;
 * a GET that cancels would fire the moment the email was scanned.
 */
export async function POST(request: Request) {
  let body: { token?: unknown };

  try {
    body = (await request.json()) as { token?: unknown };
  } catch {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });

    const found = await payload.find({
      collection: "bookings",
      where: { cancelToken: { equals: token } },
      limit: 1,
    });

    const booking = found.docs[0];
    if (!booking) {
      // Same generic answer as a bad token — never reveal whether a token exists.
      return Response.json(
        { success: false, message: "This cancellation link is not valid." },
        { status: 404 },
      );
    }

    // Idempotent: cancelling twice is a success, not an error.
    if (booking.status === "cancelled") {
      return Response.json({ success: true, alreadyCancelled: true });
    }

    // Enforce the cutoff server-side. The page hides the button inside the
    // window, but the button is not the security boundary.
    const bookingSettings = await payload.findGlobal({ slug: "booking-settings" });
    const cutoffMinutes = bookingSettings.cancelCutoffMinutes ?? 90;
    const startMs = new Date(nyLocalToISO(booking.localDate, booking.localStartTime)).getTime();

    if (Date.now() >= startMs - cutoffMinutes * 60 * 1000) {
      return Response.json(
        {
          success: false,
          tooLate: true,
          message: "It's too close to your appointment to cancel online. Please call us.",
        },
        { status: 409 },
      );
    }

    // Free the slot first. Availability comes from the calendar, so if this
    // fails we must NOT mark the booking cancelled — that would leave a slot
    // blocked by an event for an appointment everyone believes is gone.
    if (booking.calendarEventId) {
      const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";
      try {
        await deleteCalendarEvent(calendarId, booking.calendarEventId);
      } catch (err) {
        console.error("[cancel] Calendar event deletion failed:", err);
        return Response.json(
          {
            success: false,
            message: "We couldn't cancel that just now. Please try again, or call us.",
          },
          { status: 503 },
        );
      }
    }

    await payload.update({
      collection: "bookings",
      id: booking.id,
      data: { status: "cancelled" },
    });

    // Non-blocking: the cancellation already succeeded.
    sendCancellationNotice({
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      service: booking.service,
      localDate: booking.localDate,
      localStartTime: booking.localStartTime,
      localEndTime: booking.localEndTime,
      totalPrice: booking.totalPrice,
    }).catch((err) => {
      console.error("[cancel] Owner cancellation notice failed (non-fatal):", err);
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("[cancel] Unexpected error:", err);
    return Response.json(
      { success: false, message: "Something went wrong. Please try again, or call us." },
      { status: 500 },
    );
  }
}
