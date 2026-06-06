import config from "@payload-config";
import { getPayload } from "payload";

import type { WeeklyAvailability } from "@/src/lib/booking/types";
import { generateSlots } from "@/src/lib/booking/slots";
import { getBusyBlocks } from "@/src/lib/calendar/index";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") ?? "";
  const serviceId = searchParams.get("serviceId") ?? "";
  const addonIdsParam = searchParams.get("addonIds") ?? "";

  // 1. Validate date param
  if (!dateStr || !DATE_RE.test(dateStr)) {
    return Response.json(
      { success: false, message: "Missing or invalid date parameter (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // 2. Validate serviceId param
  if (!serviceId) {
    return Response.json(
      { success: false, message: "Missing serviceId parameter" },
      { status: 400 },
    );
  }

  const addonIds = addonIdsParam
    ? addonIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  try {
    const payload = await getPayload({ config });

    // 3. Fetch service (must be active)
    let service;
    try {
      service = await payload.findByID({ collection: "services", id: serviceId });
    } catch {
      return Response.json(
        { success: false, message: "Service not found" },
        { status: 404 },
      );
    }

    if (!service.active) {
      return Response.json(
        { success: false, message: "Service is not available" },
        { status: 404 },
      );
    }

    // 4. Fetch selected addons (must all be active)
    const addons: { id: string; durationMinutes: number }[] = [];
    for (const addonId of addonIds) {
      let addon;
      try {
        addon = await payload.findByID({ collection: "addons", id: addonId });
      } catch {
        return Response.json(
          { success: false, message: `Addon not found: ${addonId}` },
          { status: 404 },
        );
      }
      if (!addon.active) {
        return Response.json(
          { success: false, message: `Addon is not available: ${addonId}` },
          { status: 404 },
        );
      }
      addons.push({ id: addon.id, durationMinutes: addon.durationMinutes });
    }

    // 5. Fetch availability rules
    const rulesResult = await payload.find({
      collection: "availability-rules",
      limit: 100,
      pagination: false,
    });

    // 6. Fetch blocked dates
    const blockedResult = await payload.find({
      collection: "blocked-dates",
      limit: 1000,
      pagination: false,
    });

    // 7. Fetch BookingSettings global
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

    // Build blocked dates array
    const blockedDates = blockedResult.docs.map((d) => d.date);

    // 8. Calculate total duration
    const addonDuration = addons.reduce((sum, a) => sum + a.durationMinutes, 0);
    const totalDurationMinutes = service.durationMinutes + addonDuration;

    // 9. Fetch busy blocks from Google Calendar
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? "";
    let busyBlocks: { start: string; end: string }[] = [];
    let availabilityUnavailable = false;

    try {
      busyBlocks = await getBusyBlocks(calendarId, dateStr);
    } catch (err) {
      console.error("[availability] Calendar fetch failed:", err);
      if (failBehavior === "closed") {
        return Response.json(
          { slots: [], availabilityUnavailable: true },
          { status: 200 },
        );
      }
      // failBehavior === "open": proceed with empty busy blocks
      availabilityUnavailable = true;
    }

    // 10. Generate slots
    const slots = generateSlots({
      dateStr,
      totalDurationMinutes,
      weeklyAvailability,
      blockedDates,
      busyBlocks,
    });

    const responseBody: { slots: string[]; availabilityUnavailable?: boolean } = { slots };
    if (availabilityUnavailable) {
      responseBody.availabilityUnavailable = true;
    }

    return Response.json(responseBody);
  } catch (err) {
    console.error("[availability] Unexpected error:", err);
    return Response.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
