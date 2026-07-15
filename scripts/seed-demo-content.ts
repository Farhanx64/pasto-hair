/**
 * LOCAL DEMO content seeder for Pasto Hair — NOT for production.
 *
 * Creates obviously-placeholder testimonials and gallery items so the owner can
 * preview the redesigned homepage testimonials section and the gallery layout
 * in a browser. Everything here is clearly marked as placeholder data.
 *
 * Idempotent: re-running does not create duplicates.
 *
 * Run with (same runner as seed.ts):
 *   NODE_ENV=production node --env-file=.env --import tsx/esm scripts/seed-demo-content.ts
 */

import fs from "fs";
import os from "os";
import path from "path";
import { getPayload } from "payload";
import config from "../payload.config";

// ---------------------------------------------------------------------------
// Demo data (LOCAL preview only)
// ---------------------------------------------------------------------------

// Realistic, diverse first names. Plain, confident quotes — no clichés, no
// exclamation marks. Themes: quality of cut / evening hours / consistency.
const TESTIMONIALS = [
  {
    customerName: "Marcus",
    quote:
      "The line-up sits exactly where I ask for it every time, and the fade never looks rushed.",
    sortOrder: 1,
  },
  {
    customerName: "Priya",
    quote:
      "Being able to book after work is why this is the only place I go now. The late slots make a real difference.",
    sortOrder: 2,
  },
  {
    customerName: "Dario",
    quote:
      "Two years in and the cut holds the same standard whether it is a quiet Tuesday or a packed Saturday.",
    sortOrder: 3,
  },
];

// Six placeholder tiles. One is "before-after"; the rest are "single".
// Heights vary so the masonry layout is visible.
const GALLERY = [
  { seed: "pasto1", height: 780, sortOrder: 1, type: "single" as const },
  { seed: "pasto2", height: 1150, sortOrder: 2, type: "single" as const },
  { seed: "pasto3", height: 900, sortOrder: 3, type: "before-after" as const },
  { seed: "pasto4", height: 1050, sortOrder: 4, type: "single" as const },
  { seed: "pasto5", height: 700, sortOrder: 5, type: "single" as const },
  { seed: "pasto6", height: 1200, sortOrder: 6, type: "single" as const },
];

const DEMO_STYLE_TAG = "placeholder";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function downloadImage(url: string, destPath: string): Promise<void> {
  const res = await fetch(url); // global fetch follows picsum's redirect
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function seedTestimonials(
  payload: Awaited<ReturnType<typeof getPayload>>,
) {
  for (const t of TESTIMONIALS) {
    const existing = await payload.find({
      collection: "testimonials",
      where: { customerName: { equals: t.customerName } },
      limit: 1,
    });
    if (existing.totalDocs > 0) {
      console.log(`  [skip] testimonial "${t.customerName}" already exists`);
      continue;
    }
    await payload.create({
      collection: "testimonials",
      data: { ...t, active: true },
    });
    console.log(`  [ok]   testimonial "${t.customerName}" created`);
  }
}

async function seedGallery(
  payload: Awaited<ReturnType<typeof getPayload>>,
  tmpDir: string,
) {
  // Existing placeholder tiles are keyed by their sortOrder so re-runs skip.
  const existing = await payload.find({
    collection: "gallery-items",
    where: { title: { equals: "Placeholder" } },
    limit: 100,
  });
  const existingSortOrders = new Set(
    existing.docs.map((d) => d.sortOrder).filter((n) => n != null),
  );

  for (const g of GALLERY) {
    if (existingSortOrders.has(g.sortOrder)) {
      console.log(`  [skip] gallery placeholder #${g.sortOrder} already exists`);
      continue;
    }

    const url = `https://picsum.photos/seed/${g.seed}/900/${g.height}`;
    const filePath = path.join(tmpDir, `${g.seed}.jpg`);
    await downloadImage(url, filePath);

    const media = await payload.create({
      collection: "media",
      filePath,
      data: { alt: "Placeholder image" },
    });

    await payload.create({
      collection: "gallery-items",
      data: {
        title: "Placeholder",
        image: media.id,
        caption: "",
        styleTags: [{ tag: DEMO_STYLE_TAG }],
        type: g.type,
        sortOrder: g.sortOrder,
        active: true,
      },
    });
    console.log(
      `  [ok]   gallery placeholder #${g.sortOrder} (${g.type}) + media created`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config });

  const tmpDir = path.join(os.tmpdir(), "pasto-demo-images");
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log("\nSeeding demo testimonials...");
  await seedTestimonials(payload);

  console.log("\nSeeding demo gallery items...");
  await seedGallery(payload, tmpDir);

  console.log("\nDemo content seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
