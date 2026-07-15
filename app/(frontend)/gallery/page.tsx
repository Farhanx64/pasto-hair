import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Ambient } from "@/components/ui/Ambient";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getPayload } from "payload";
import config from "@payload-config";
import type { GalleryItem, Media } from "@/payload-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery — Pasto Hair",
  description:
    "Gallery of cuts, fades, and styles by Pasto Hair. Premium barbershop in New York.",
};

async function getGalleryItems() {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "gallery-items",
      where: { active: { equals: true } },
      sort: "sortOrder",
      limit: 100,
    });
    return result.docs;
  } catch {
    return [] as GalleryItem[];
  }
}

/** Only tiles with a populated media object (and a usable url) can render. */
function hasImage(item: GalleryItem): item is GalleryItem & { image: Media } {
  return (
    !!item.image &&
    typeof item.image === "object" &&
    typeof item.image.url === "string"
  );
}

export default async function GalleryPage() {
  const items = await getGalleryItems();
  const tiles = items.filter(hasImage);

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="relative overflow-hidden flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <Ambient
          className="top-[-8%] left-[-10%] opacity-80"
          color="violet"
          size={620}
        />

        <div className="relative max-w-[1200px] mx-auto">
          {/* ── Header (left-aligned) ── */}
          <header className="mb-14 max-w-2xl">
            <span className="eyebrow mb-4">The work</span>
            <h1
              className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mt-4 mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.1 }}
            >
              GALLERY
            </h1>
            <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] leading-relaxed">
              Fades, tapers, and clean line-ups from the chair. A closer look at
              the cuts we send back out the door.
            </p>
          </header>

          {tiles.length === 0 ? (
            /* ── Empty state ── */
            <Reveal>
              <GlassCard
                className="max-w-xl p-10 sm:p-12 flex flex-col items-start gap-5"
                hover={false}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(187,134,252,0.1)",
                    border: "1px solid rgba(187,134,252,0.2)",
                  }}
                >
                  <Scissors size={26} color="#bb86fc" strokeWidth={1.5} />
                </div>
                <h2 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-wide text-[#ededed]">
                  Being curated
                </h2>
                <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] leading-relaxed">
                  The gallery is being curated. Fresh cuts from the shop land
                  here soon.
                </p>
                <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] leading-relaxed">
                  In the meantime, catch the latest work on Instagram — the link
                  lives in the footer below.
                </p>
                <Link
                  href="/booking"
                  className="mt-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)] rounded-full"
                >
                  <Button variant="secondary" size="md">
                    Book a Cut
                  </Button>
                </Link>
              </GlassCard>
            </Reveal>
          ) : (
            /* ── Masonry grid ── */
            <div className="columns-2 lg:columns-3 gap-x-4">
              {tiles.map((item, i) => (
                <Reveal
                  key={item.id}
                  className="break-inside-avoid mb-4"
                  delay={Math.min(i * 0.06, 0.24)}
                >
                  <GalleryTile item={item} />
                </Reveal>
              ))}
            </div>
          )}

          {/* ── CTA ── */}
          <div className="mt-16 flex justify-center">
            <Link
              href="/booking"
              className="focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)] rounded-full"
            >
              <Button variant="primary" size="lg">
                Book Your Cut
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}

function GalleryTile({ item }: { item: GalleryItem & { image: Media } }) {
  const media = item.image;
  const alt = media.alt ?? item.title ?? "";
  const tags: string[] = (item.styleTags ?? [])
    .map((t: { tag?: string | null }) => t.tag)
    .filter(
      (tag: string | null | undefined): tag is string =>
        typeof tag === "string" && tag.length > 0,
    );
  const hasOverlay = Boolean(item.caption) || tags.length > 0;

  return (
    <figure
      className="group relative overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url ?? ""}
        alt={alt}
        width={media.width ?? undefined}
        height={media.height ?? undefined}
        loading="lazy"
        decoding="async"
        className="block w-full h-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      {/* Before / After badge — square, champagne on translucent champagne */}
      {item.type === "before-after" && (
        <span
          className="absolute top-3 left-3 rounded-[3px] px-2 py-1 font-[family-name:var(--font-montserrat)] text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ background: "rgba(232,220,196,0.08)", color: "#e8dcc4" }}
        >
          Before / After
        </span>
      )}

      {/* Caption + tags overlay — revealed on hover */}
      {hasOverlay && (
        <figcaption
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
          style={{
            background:
              "linear-gradient(to top, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.55) 45%, transparent 100%)",
          }}
        >
          {item.caption && (
            <p className="font-[family-name:var(--font-montserrat)] text-sm font-medium text-[#ededed]">
              {item.caption}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {tags.map((tag, i) => (
                <span
                  key={`${tag}-${i}`}
                  className="font-[family-name:var(--font-montserrat)] text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a8f98]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </figcaption>
      )}
    </figure>
  );
}
