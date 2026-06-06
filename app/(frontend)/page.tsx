import Link from "next/link";
import Image from "next/image";
import { Scissors, Moon, Zap, ArrowRight, Images } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Service, BookingSetting } from "@/payload-types";

export const dynamic = "force-dynamic";

async function getHomeData() {
  try {
    const payload = await getPayload({ config });
    const [servicesResult, bookingSettings] = await Promise.all([
      payload.find({
        collection: "services",
        where: { active: { equals: true } },
        sort: "sortOrder",
        limit: 4,
      }),
      payload.findGlobal({ slug: "booking-settings" }),
    ]);
    return { services: servicesResult.docs, bookingSettings };
  } catch {
    return { services: [] as Service[], bookingSettings: null as BookingSetting | null };
  }
}

const valueProps = [
  {
    icon: Scissors,
    headline: "Premium Cuts",
    description: "Every cut is executed with precision. No shortcuts, no compromises.",
  },
  {
    icon: Moon,
    headline: "Late Appointments",
    description: "Night owl? We've got you. Book evening slots when other shops are closed.",
  },
  {
    icon: Zap,
    headline: "Clean Fades",
    description: "Signature fades blended to perfection — consistent every single time.",
  },
];

export default async function HomePage() {
  const { services, bookingSettings } = await getHomeData();

  const surchargeStart = bookingSettings?.eveningSurchargeStart ?? "20:00";
  const surchargeAmount = bookingSettings?.eveningSurchargeAmount ?? 10;
  const [surchargeH] = surchargeStart.split(":").map(Number);
  const surchargeHour12 = surchargeH === 12 ? 12 : surchargeH > 12 ? surchargeH - 12 : surchargeH;
  const surchargeAmPm = surchargeH >= 12 ? "PM" : "AM";

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      {/* ── Hero ── */}
      <section className="relative flex items-center justify-center min-h-screen text-center overflow-hidden">
        {/* Video background */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-video.webm"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          poster="/logo.png"
        />

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.70) 60%, rgba(10,10,12,0.95) 100%)",
          }}
        />

        {/* Hero content */}
        <div
          className="relative z-10 flex flex-col items-center gap-6 px-4 sm:px-6 py-safe-top"
          style={{ animation: "heroFadeIn 600ms cubic-bezier(0.16,1,0.3,1) both" }}
        >
          <Image
            src="/logo.png"
            alt="Pasto Hair logo"
            width={96}
            height={96}
            className="object-contain drop-shadow-2xl"
            priority
          />
          <h1
            className="font-[family-name:var(--font-oswald)] font-bold uppercase leading-none text-[#ededed]"
            style={{ fontSize: "clamp(3rem, 10vw, 7rem)", letterSpacing: "0.06em" }}
          >
            PASTO HAIR
          </h1>
          <p
            className="font-[family-name:var(--font-montserrat)] text-lg sm:text-xl text-[#ededed]/80 max-w-md"
          >
            Built for sharp cuts and sharper presence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link href="/booking">
              <Button variant="primary" size="lg">Book Now</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="secondary" size="lg">View Pricing</Button>
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#8a8f98]"
          aria-hidden="true"
        >
          <span className="font-[family-name:var(--font-montserrat)] text-xs uppercase tracking-widest">
            Scroll
          </span>
          <div
            className="w-px h-8"
            style={{
              background: "linear-gradient(to bottom, rgba(187,134,252,0.6), transparent)",
              animation: "scrollPulse 2s ease-in-out infinite",
            }}
          />
        </div>
      </section>

      {/* ── Value props ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <h2
            className="font-[family-name:var(--font-oswald)] text-2xl sm:text-3xl font-semibold uppercase tracking-widest text-center text-[#ededed] mb-12"
          >
            Why Pasto Hair
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {valueProps.map(({ icon: Icon, headline, description }) => (
              <GlassCard key={headline} className="p-8 flex flex-col items-center text-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(187,134,252,0.1)",
                    border: "1px solid rgba(187,134,252,0.2)",
                  }}
                >
                  <Icon size={26} color="#bb86fc" strokeWidth={1.5} />
                </div>
                <h3 className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wide text-[#ededed]">
                  {headline}
                </h3>
                <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] leading-relaxed">
                  {description}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured services ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: "rgba(5,5,6,0.4)" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <h2
                className="font-[family-name:var(--font-oswald)] text-2xl sm:text-3xl font-semibold uppercase tracking-widest text-[#ededed]"
              >
                Services
              </h2>
              <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mt-1">
                Bookings at or after {surchargeHour12}:00 {surchargeAmPm} include a ${surchargeAmount} evening rate.
              </p>
            </div>
            <Link
              href="/pricing"
              className="font-[family-name:var(--font-montserrat)] text-sm text-[#bb86fc] hover:text-[#ededed] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] rounded"
            >
              See full pricing →
            </Link>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">
                Services coming soon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {services.map((service) => (
                <GlassCard
                  key={service.id}
                  className="p-6 flex flex-col gap-4"
                >
                  <div className="flex-1">
                    <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-[#ededed]">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] mt-1 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums"
                      style={{ color: "#e8dcc4" }}
                    >
                      ${service.price}
                    </span>
                    <span
                      className="font-[family-name:var(--font-montserrat)] text-xs px-2.5 py-1 rounded-full text-[#8a8f98]"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      {service.durationMinutes} min
                    </span>
                  </div>

                  <Link
                    href={`/booking?service=${service.id}`}
                    className="flex items-center gap-1.5 font-[family-name:var(--font-montserrat)] text-sm font-medium text-[#bb86fc] hover:text-[#ededed] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] rounded"
                  >
                    Book This <ArrowRight size={14} />
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Gallery preview ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2
            className="font-[family-name:var(--font-oswald)] text-2xl sm:text-3xl font-semibold uppercase tracking-widest text-[#ededed] mb-4"
          >
            Gallery
          </h2>
          <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mb-10">
            Photos coming soon — follow us on Instagram for the latest cuts.
          </p>
          <GlassCard className="py-20 flex flex-col items-center gap-5">
            <Images size={48} color="#8a8f98" strokeWidth={1} />
            <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">Gallery coming soon</p>
            <Link href="/gallery">
              <Button variant="secondary" size="md">View Gallery</Button>
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* ── Footer ── */}
      <Footer />

      {/* Keyframe styles — CSS only, respects prefers-reduced-motion */}
      <style>{`
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
        }
      `}</style>
    </PageWrapper>
  );
}
