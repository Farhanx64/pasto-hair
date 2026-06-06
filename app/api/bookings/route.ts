import config from "@payload-config";
import { getPayload } from "payload";

import type { WeeklyAvailability, BookingRequest } from "@/src/lib/booking/types";
import { generateSlots } from "@/src/lib/booking/slots";
import { timeToMinutes, minutesToTime } from "@/src/lib/booking/slots";
import { calculatePrice } from "@/src/lib/booking/pricing";
import { getBusyBlocks, createCalendarEvent, findEventBySubmissionId } from "@/src/lib/calendar/index";
import { sendConfirmationEmail } from "@/src/lib/notifications/index";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: BookingRequest;

  // 1. Parse request body
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // 2. Validate required fields
  const { name, email, phone, serviceId, addonIds, notes, localDate, localStartTime, submissionId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ success: false, message: "name is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    return Response.json({ success: false, message: "A valid email address is required" }, { status: 400 });
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    return Response.json({ success: false, message: "phone is required" }, { status: 400 });
  }
  if (!serviceId || typeof serviceId !== "string") {
    return Response.json({ success: false, message: "serviceId is required" }, { status: 400 });
  }
  if (!localDate || !DATE_RE.test(localDate)) {
    return Response.json({ success: false, message: "localDate must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (!localStartTime || !TIME_RE.test(localStartTime)) {
    return Response.json({ success: false, message: "localStartTime must be in HH:MM format" }, { status: 400 });
  }
  if (!submissionId || typeof submissionId !== "string" || !submissionId.trim()) {
    return Response.json({ success: false, message: "submissionId is required" }, { status: 400 });
  }

  const normalizedAddonIds: string[] = Array.isArray(addonIds) ? addonIds.filter((id): id is string => typeof id === "string") : [];

  try {
    const payload = await getPayload({ config });

    // 3. Fetch service (must be active)
    let service;
    try {
      service = await payload.findByID({ collection: "services", id: serviceId });
    } catch {
      return Response.json({ success: false, message: "Service not found" }, { status: 400 });
    }

    if (!service.active) {
      return Response.json({ success: false, message: "Service is not available" }, { status: 400 });
    }

    // 4. Fetch addons (must all be active)
    const addons: { id: string; name: string; price: number; durationMinutes: number }[] = [];
    for (const addonId of normalizedAddonIds) {
      let addon;
      try {
        addon = await payload.findByID({ collection: "addons", id: addonId });
      } catch {
        return Response.json({ success: false, message: `Addon not found: ${addonId}` }, { status: 400 });
      }
      if (!addon.active) {
        return Response.json({ success: false, message: `Addon is not available: ${addonId}` }, { status: 400 });
      }
      addons.push({
        id: addon.id,
        name: addon.name,
        price: addon.price,
        durationMinutes: addon.durationMinutes,
      });
    }

    // 5. Fetch availability rules and blocked dates
    const rulesResult = await payload.find({
      collection: "availability-rules",
      limit: 100,
      pagination: false,
    });

    const blockedResult = await payload.find({
      collection: "blocked-dates",
      limit: 1000,
      pagination: false,
    });

    // 6. Fetch BookingSettings global
    const bookingSettings = await payload.findGlobal({ slug: "booking-settings" });
    const failBehavior = bookingSettings.failBehavior ?? "closed";

    // Build WeeklyAvailability from rules
    const defaultDay = { enabled: false, shifts: [] };
    const weeklyAvailability: WeeklyAvailability = {
      sunday: { ...defaultDay },
      monday: { ...defaultDay },
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
    };

    for (const rule of rulesResult.docs) {
      const day = rule.day as keyof WeeklyAvailability;
      weeklyAvailability[day] = {
        enabled: rule.enabled ?? false,
        shifts: (rule.shifts ?? []).map((s) => ({
          start: s.start ?? "09:00",
          end: s.end ?? "17:00",
        })),
      };
    }

    const blockedDates = blockedResult.docs.map((d) => d.date);

    // 7. Check submissionId idempotency
    const existingResult = await payload.find({
      collection: "bookings",
      where: { submissionId: { equals: submissionId } },
      limit: 1,
    });

    if (existingResult.docs.length > 0) {
      const existing = existingResult.docs[0];
      return Response.json({
        success: true,
        message: "Already booked",
        eventId: existing.calendarEventId ?? undefined,
      });
    }

    // 8. Server-side slot revalidation
    const addonDuration = addons.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalDurationMinutes = service.durationMinutes + addonDuration;

    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";
    let busyBlocks: { start: string; end: string }[] = [];

    try {
      busyBlocks = await getBusyBlocks(calendarId, localDate);
    } catch (err) {
      console.error("[bookings] Calendar fetch failed:", err);
      if (failBehavior === "closed") {
        return Response.json(
          { success: false, message: "Availability could not be confirmed. Please try again later." },
          { status: 503 },
        );
      }
      // failBehavior === "open": proceed with empty busy blocks
    }

    const validSlots = generateSlots({
      dateStr: localDate,
      totalDurationMinutes,
      weeklyAvailability,
      blockedDates,
      busyBlocks,
    });

    if (!validSlots.includes(localStartTime)) {
      return Response.json(
        { success: false, message: "The requested time slot is no longer available" },
        { status: 400 },
      );
    }

    // 9. Calculate end time
    const startMinutes = timeToMinutes(localStartTime);
    const endMinutes = startMinutes + totalDurationMinutes;
    const localEndTime = minutesToTime(endMinutes);

    // 10. Calculate price
    const priceSummary = calculatePrice(
      { id: service.id, price: service.price, durationMinutes: service.durationMinutes },
      addons.map((a) => ({ id: a.id, price: a.price, durationMinutes: a.durationMinutes })),
      localStartTime,
    );

    // 11. Check for race-condition duplicate on calendar right before creating event
    let calendarEventId: string | undefined;
    const existingEventId = await findEventBySubmissionId(calendarId, submissionId, localDate);
    if (existingEventId) {
      calendarEventId = existingEventId;
    }

    // 12. Create Google Calendar event (skip if already found or not configured)
    if (!calendarEventId) {
      try {
        calendarEventId = await createCalendarEvent({
          calendarId,
          dateStr: localDate,
          startTime: localStartTime,
          endTime: localEndTime,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          serviceName: service.name,
          addonNames: addons.map((a) => a.name),
          totalPrice: priceSummary.total,
          submissionId,
          notes,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // If calendar is simply not configured, proceed without event ID
        if (errMsg !== "Google Calendar is not configured") {
          console.error("[bookings] Calendar event creation failed:", err);
          // Don't expose internal error — still create the Payload record
        }
      }
    }

    // 13. Create Payload booking record
    const booking = await payload.create({
      collection: "bookings",
      data: {
        submissionId,
        status: "confirmed",
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        service: serviceId,
        addons: normalizedAddonIds.map((id) => ({ addon: id })),
        notes: notes ?? null,
        localDate,
        localStartTime,
        localEndTime,
        timeZone: "America/New_York",
        totalPrice: priceSummary.total,
        eveningSurcharge: priceSummary.hasEveningSurcharge,
        calendarEventId: calendarEventId ?? null,
      },
    });

    // 14. Send confirmation email (non-blocking — failure does not fail the booking)
    sendConfirmationEmail({
      customerName: name,
      customerEmail: email,
      serviceName: service.name,
      addonNames: addons.map((a) => a.name),
      localDate,
      localStartTime,
      localEndTime,
      timeZone: "America/New_York",
      totalPrice: priceSummary.total,
      hasEveningSurcharge: priceSummary.hasEveningSurcharge,
      eveningSurchargeAmount: priceSummary.eveningSurcharge,
      notes,
    }).catch((err) => {
      console.error("[bookings] Confirmation email failed (non-fatal):", err);
    });

    return Response.json({
      success: true,
      message: "Appointment booked successfully. Check your email for confirmation.",
      eventId: calendarEventId,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error("[bookings] Unexpected error:", err);
    return Response.json(
      { success: false, message: "An unexpected error occurred. Please try again." },
      { status: 500 },
    );
  }
}
