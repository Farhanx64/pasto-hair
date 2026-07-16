/**
 * Render the email templates to HTML files so they can be eyeballed without
 * sending anything. Not part of the app — a dev tool.
 *
 * Run with the react-server condition so the `server-only` guard resolves to
 * its empty module instead of throwing:
 *
 *   node --conditions=react-server --import tsx/esm scripts/preview-emails.ts
 *
 * Writes preview-customer.html / preview-owner.html to the repo root (gitignored).
 * Rendering in a browser only approximates a mail client — send a real test
 * booking before trusting it.
 */

import { writeFileSync } from "fs";
import path from "path";

import {
  buildCustomerHtml,
  buildOwnerHtml,
  buildCustomerText,
  buildOwnerText,
  buildCancellationHtml,
  type BookingConfirmationData,
} from "../src/lib/notifications/index";

// Deliberately awkward sample data: a long name, an apostrophe, two add-ons,
// the evening surcharge, and notes containing markup — so the preview also
// demonstrates that escaping holds.
const sample: BookingConfirmationData = {
  customerName: "Marcus O'Donnell",
  customerEmail: "marcus@example.com",
  customerPhone: "+1 (212) 555-0148",
  service: "Classic Taper",
  addons: ["Beard Sculpt", "Hot Towel"],
  localDate: "2026-07-23",
  localStartTime: "20:15",
  localEndTime: "21:40",
  timeZone: "America/New_York",
  totalPrice: 68,
  hasEveningSurcharge: true,
  eveningSurchargeAmount: 10,
  notes: "Going a bit shorter on the sides than last time <b>please</b>",
  calendarEventId: "abc123eventid",
  cancelToken: "8f3c1d2e-4b5a-6c7d-8e9f-0a1b2c3d4e5f",
  business: {
    name: "Pasto Hair",
    address: "1123 Broadway, New York, NY 10010",
    phone: "+1 (212) 555-0100",
    email: "hello@pasto.hair",
  },
};

const root = path.resolve(process.cwd());

writeFileSync(path.join(root, "preview-customer.html"), buildCustomerHtml(sample), "utf8");
writeFileSync(path.join(root, "preview-owner.html"), buildOwnerHtml(sample), "utf8");
writeFileSync(
  path.join(root, "preview-cancelled.html"),
  buildCancellationHtml({
    customerName: sample.customerName,
    customerEmail: sample.customerEmail,
    customerPhone: sample.customerPhone,
    service: sample.service,
    localDate: sample.localDate,
    localStartTime: sample.localStartTime,
    localEndTime: sample.localEndTime,
    totalPrice: sample.totalPrice,
  }),
  "utf8",
);

console.log("Wrote preview-customer.html, preview-owner.html, preview-cancelled.html\n");
console.log("--- customer plain-text part ---\n");
console.log(buildCustomerText(sample));
console.log("\n--- owner plain-text part ---\n");
console.log(buildOwnerText(sample));
