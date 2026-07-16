/**
 * Seed script for Pasto Hair Payload CMS
 *
 * Run with:
 *   export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && \
 *   set -a && . ./.env && set +a && \
 *   NODE_ENV=production node --import tsx/esm scripts/seed.ts
 *
 * NODE_ENV=production prevents Payload from running pushDevSchema (which would
 * fail with "index already exists" errors on a previously-migrated database).
 */

import path from "path";
import { fileURLToPath } from "url";
import { getPayload } from "payload";
import config from "../payload.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const SERVICES = [
  {
    id: "haircut",
    name: "Haircut",
    price: 30,
    durationMinutes: 45,
    description: "Cut and style, blended to finish",
    sortOrder: 1,
  },
  {
    id: "beard",
    name: "Beard",
    price: 20,
    durationMinutes: 30,
    description: "Beard sculpt and line-up",
    sortOrder: 2,
  },
  {
    id: "face-shave",
    name: "Face Shave",
    price: 15,
    durationMinutes: 30,
    description: "Hot-towel straight-razor shave",
    sortOrder: 3,
  },
  {
    id: "skincare",
    name: "Skincare",
    price: 20,
    durationMinutes: 30,
    description: "Exfoliation and moisturization",
    sortOrder: 4,
  },
  {
    id: "perm",
    name: "Perm",
    price: 80,
    durationMinutes: 120,
    description: "Recommended for straight hair types",
    sortOrder: 5,
  },
];

const ADDONS = [
  {
    id: "addon-beard",
    name: "Beard",
    price: 20,
    durationMinutes: 30,
    description: "",
  },
  {
    id: "addon-face-shave",
    name: "Face Shave",
    price: 15,
    durationMinutes: 30,
    description: "",
  },
  {
    id: "addon-skincare",
    name: "Skincare",
    price: 20,
    durationMinutes: 30,
    description: "",
  },
];

const AVAILABILITY_RULES = [
  {
    day: "sunday" as const,
    enabled: true,
    shifts: [
      { start: "12:00", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "monday" as const,
    enabled: true,
    shifts: [
      { start: "14:30", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "tuesday" as const,
    enabled: true,
    shifts: [
      { start: "12:00", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "wednesday" as const,
    enabled: true,
    shifts: [
      { start: "14:30", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "thursday" as const,
    enabled: true,
    shifts: [
      { start: "12:00", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "friday" as const,
    enabled: true,
    shifts: [
      { start: "14:00", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
  {
    day: "saturday" as const,
    enabled: true,
    shifts: [
      { start: "12:00", end: "20:00" },
      { start: "20:00", end: "23:59" },
    ],
  },
];

// This repo is public, so the owner's real calendar address is not hardcoded.
// Set SEED_STAFF_CALENDAR_ID before seeding. Re-seeding without it would not
// match the existing staff row's calendarId and would create a duplicate.
const DEFAULT_STAFF = {
  name: "Pasto",
  calendarId: process.env.SEED_STAFF_CALENDAR_ID ?? "",
  role: "owner" as const,
  active: true,
};

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedServices(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({ collection: "services", limit: 100 });
  const existingIds = new Set(existing.docs.map((d: any) => d.id));

  for (const service of SERVICES) {
    if (existingIds.has(service.id)) {
      console.log(`  [skip] service "${service.name}" already exists`);
      continue;
    }
    await payload.create({ collection: "services", data: { ...service, active: true } });
    console.log(`  [ok]   service "${service.name}" created`);
  }
}

async function seedAddons(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({ collection: "addons", limit: 100 });
  const existingIds = new Set(existing.docs.map((d: any) => d.id));

  for (const addon of ADDONS) {
    if (existingIds.has(addon.id)) {
      console.log(`  [skip] addon "${addon.name}" already exists`);
      continue;
    }
    await payload.create({ collection: "addons", data: { ...addon, active: true } });
    console.log(`  [ok]   addon "${addon.name}" created`);
  }
}

async function seedAvailabilityRules(payload: Awaited<ReturnType<typeof getPayload>>) {
  const existing = await payload.find({ collection: "availability-rules", limit: 100 });
  const existingDays = new Set(existing.docs.map((d: any) => d.day));

  for (const rule of AVAILABILITY_RULES) {
    if (existingDays.has(rule.day)) {
      console.log(`  [skip] availability rule for "${rule.day}" already exists`);
      continue;
    }
    await payload.create({ collection: "availability-rules", data: rule as any });
    console.log(`  [ok]   availability rule for "${rule.day}" created`);
  }
}

async function seedStaff(payload: Awaited<ReturnType<typeof getPayload>>) {
  if (!DEFAULT_STAFF.calendarId) {
    console.log("  [skip] staff — set SEED_STAFF_CALENDAR_ID to seed the owner");
    return;
  }

  const existing = await payload.find({ collection: "staff", limit: 100 });
  const existingCalendarIds = new Set(existing.docs.map((d: any) => d.calendarId));

  if (existingCalendarIds.has(DEFAULT_STAFF.calendarId)) {
    console.log(`  [skip] staff member "${DEFAULT_STAFF.name}" already exists`);
    return;
  }
  await payload.create({ collection: "staff", data: DEFAULT_STAFF });
  console.log(`  [ok]   staff member "${DEFAULT_STAFF.name}" created`);
}

async function seedBusinessSettings(payload: Awaited<ReturnType<typeof getPayload>>) {
  await payload.updateGlobal({
    slug: "business-settings",
    data: {
      businessName: "Pasto Hair",
      tagline: "Built for sharp cuts and sharper presence.",
      timezone: "America/New_York",
    },
  });
  console.log("  [ok]   business settings updated");
}

async function seedBookingSettings(payload: Awaited<ReturnType<typeof getPayload>>) {
  await payload.updateGlobal({
    slug: "booking-settings",
    data: {
      slotIntervalMinutes: 15,
      eveningSurchargeStart: "20:00",
      eveningSurchargeAmount: 10,
      failBehavior: "closed",
      minLeadTimeMinutes: 0,
      maxBookingWindowDays: 90,
    },
  });
  console.log("  [ok]   booking settings updated");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config });

  console.log("\nSeeding services...");
  await seedServices(payload);

  console.log("\nSeeding add-ons...");
  await seedAddons(payload);

  console.log("\nSeeding availability rules...");
  await seedAvailabilityRules(payload);

  console.log("\nSeeding staff...");
  await seedStaff(payload);

  console.log("\nSeeding business settings...");
  await seedBusinessSettings(payload);

  console.log("\nSeeding booking settings...");
  await seedBookingSettings(payload);

  console.log("\nSeed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
