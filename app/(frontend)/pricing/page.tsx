import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Ambient } from "@/components/ui/Ambient";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Service, Addon, BookingSetting } from "@/payload-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Pasto Hair",
  description:
    "Transparent pricing for premium barbershop services. No hidden fees — just sharp cuts.",
};

async function getPricingData() {
  try {
    const payload = await getPayload({ config });
    const [servicesResult, addonsResult, bookingSettings] = await Promise.all([
      payload.find({
        collection: "services",
        where: { active: { equals: true } },
        sort: "sortOrder",
        limit: 100,
      }),
      payload.find({
        collection: "addons",
        where: { active: { equals: true } },
        limit: 100,
      }),
      payload.findGlobal({ slug: "booking-settings" }),
    ]);
    return {
      services: servicesResult.docs,
      addons: addonsResult.docs,
      bookingSettings,
    };
  } catch {
    return {
      services: [] as Service[],
      addons: [] as Addon[],
      bookingSettings: null as BookingSetting | null,
    };
  }
}

export default async function PricingPage() {
  const { services, addons, bookingSettings } = await getPricingData();

  const surchargeStart = bookingSettings?.eveningSurchargeStart ?? "20:00";
  const surchargeAmount = bookingSettings?.eveningSurchargeAmount ?? 10;
  const [surchargeH] = surchargeStart.split(":").map(Number);
  const surchargeHour12 = surchargeH === 12 ? 12 : surchargeH > 12 ? surchargeH - 12 : surchargeH;
  const surchargeAmPm = surchargeH >= 12 ? "PM" : "AM";

  const s =
    (bookingSettings as
      | (typeof bookingSettings & {
          multiServiceDiscountEnabled?: boolean | null;
          discountTier2Percent?: number | null;
          discountTier3Percent?: number | null;
        })
      | null) ?? null;
  const discountEnabled = s?.multiServiceDiscountEnabled ?? true;
  const tier2 = s?.discountTier2Percent ?? 10;
  const tier3 = s?.discountTier3Percent ?? 15;

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="relative overflow-hidden mb-14">
            <Ambient className="-top-40 -left-28" color="violet" size={560} />
            <Reveal className="relative max-w-xl">
              <span className="eyebrow mb-5">Services &amp; rates</span>
              <h1
                className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mt-4 mb-5"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }}
              >
                Pricing
              </h1>
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] leading-relaxed">
                Transparent pricing. No hidden fees. Just sharp cuts and honest work.
              </p>
            </Reveal>
          </div>

          {/* Asymmetric two-column layout */}
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
            {/* LEFT — services list */}
            <div>
              <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl font-semibold uppercase tracking-widest text-[#ededed] mb-6">
                Services
              </h2>
              {services.length === 0 ? (
                <GlassCard className="px-6 py-10 text-center" hover={false}>
                  <p className="font-[family-name:var(--font-oswald)] text-lg uppercase tracking-wide text-[#ededed] mb-2">
                    Services coming soon
                  </p>
                  <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98]">
                    Our menu is being sharpened. Check back shortly — or reach out and
                    we&apos;ll walk you through what&apos;s available.
                  </p>
                </GlassCard>
              ) : (
                <div className="flex flex-col gap-3">
                  {services.map((service, i) => (
                    <Reveal key={service.id} delay={Math.min(i * 0.05, 0.3)}>
                      <ServiceRow service={service} index={i + 1} />
                    </Reveal>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — sticky aside */}
            <aside className="mt-12 lg:mt-0 lg:sticky lg:top-24 self-start flex flex-col gap-4">
              {/* Evening-rate note */}
              <GlassCard className="px-5 py-4 flex items-start gap-3" hover={false}>
                <Clock size={18} className="mt-0.5 flex-shrink-0" color="#bb86fc" />
                <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed]/80 leading-relaxed">
                  <span className="font-semibold text-[#bb86fc]">Evening rate:</span>{" "}
                  Bookings starting at or after {surchargeHour12}:00 {surchargeAmPm} include
                  a ${surchargeAmount} evening surcharge.
                </p>
              </GlassCard>

              {/* Stack & save — multi-service discount */}
              {discountEnabled && (
                <GlassCard className="px-5 py-4 flex items-start gap-3" hover={false}>
                  <Layers size={18} className="mt-0.5 flex-shrink-0" color="#bb86fc" />
                  <div>
                    <span className="eyebrow mb-2">Stack &amp; save</span>
                    <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed]/80 leading-relaxed">
                      Book two services and take{" "}
                      <span className="font-semibold" style={{ color: "#e8dcc4" }}>
                        {tier2}%
                      </span>{" "}
                      off, three or more and take{" "}
                      <span className="font-semibold" style={{ color: "#e8dcc4" }}>
                        {tier3}%
                      </span>{" "}
                      off. The discount comes off your services before the ${surchargeAmount}{" "}
                      evening rate.
                    </p>
                  </div>
                </GlassCard>
              )}

              {/* Add-ons */}
              {addons.length > 0 && (
                <GlassCard className="px-5 py-4" hover={false}>
                  <h3 className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-widest text-[#8a8f98] mb-3">
                    Add-ons
                  </h3>
                  <ul className="flex flex-col">
                    {addons.map((addon) => (
                      <li
                        key={addon.id}
                        className="flex items-center justify-between gap-3 py-2.5 border-t first:border-t-0"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                      >
                        <span className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed] min-w-0 truncate">
                          {addon.name}
                        </span>
                        <span className="flex items-center gap-3 flex-shrink-0">
                          <span className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] tabular-nums">
                            +{addon.durationMinutes} min
                          </span>
                          <span
                            className="font-[family-name:var(--font-montserrat)] text-sm font-bold tabular-nums w-12 text-right"
                            style={{ color: "#e8dcc4" }}
                          >
                            +${addon.price}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {/* Booking card — single primary CTA */}
              <GlassCard className="px-5 py-6" hover={false}>
                <p className="font-[family-name:var(--font-oswald)] text-lg uppercase tracking-wide text-[#ededed] mb-4">
                  Walk out sharper.
                </p>
                <Link
                  href="/booking"
                  className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
                >
                  <Button variant="primary" size="lg" className="w-full">
                    Book Now
                  </Button>
                </Link>
              </GlassCard>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}

function ServiceRow({ service, index }: { service: Service; index: number }) {
  return (
    <GlassCard className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <span
          className="font-[family-name:var(--font-oswald)] text-sm tabular-nums pt-1 select-none leading-none"
          style={{ color: "rgba(232,220,196,0.45)" }}
        >
          {String(index).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-[#ededed]">
            {service.name}
          </h3>
          {service.description && (
            <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mt-0.5">
              {service.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0 pl-9 sm:pl-0">
        <span
          className="font-[family-name:var(--font-montserrat)] text-xs px-2.5 py-1 rounded-full text-[#8a8f98] tabular-nums"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {service.durationMinutes} min
        </span>
        <span
          className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums w-16 text-right"
          style={{ color: "#e8dcc4" }}
        >
          ${service.price}
        </span>
        <Link
          href={`/booking?service=${service.id}`}
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
        >
          <Button variant="secondary" size="sm">
            Book
          </Button>
        </Link>
      </div>
    </GlassCard>
  );
}
