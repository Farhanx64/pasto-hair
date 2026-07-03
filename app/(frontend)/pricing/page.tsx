import type { Metadata } from "next";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
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

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1
              className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mb-4"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                textDecoration: "underline",
                textDecorationColor: "#bb86fc",
                textUnderlineOffset: "0.2em",
              }}
            >
              PRICING
            </h1>
            <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] max-w-md mx-auto">
              Transparent rates for every service. Prices and durations update
              instantly in the booking flow.
            </p>
          </div>

          {/* Services */}
          <section className="mb-12">
            <h2 className="font-[family-name:var(--font-oswald)] font-semibold uppercase tracking-wide text-[15px] text-[#8a8f98] mb-4">
              Services
            </h2>
            {services.length === 0 ? (
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">
                Services coming soon.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 mb-12">
                {services.map((service) => (
                  <ServiceRow key={service.id} service={service} />
                ))}
              </div>
            )}
          </section>

          {/* Add-ons */}
          {addons.length > 0 && (
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-oswald)] font-semibold uppercase tracking-wide text-[15px] text-[#8a8f98] mb-4">
                Add-Ons
              </h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                {addons.map((addon) => (
                  <AddonRow key={addon.id} addon={addon} />
                ))}
              </div>
            </section>
          )}

          {/* Evening surcharge note */}
          <div
            className="mb-12 px-5 py-4 rounded-2xl font-[family-name:var(--font-montserrat)] text-sm text-[#ededed]"
            style={{ background: "rgba(187,134,252,0.08)", border: "1px solid rgba(187,134,252,0.25)" }}
          >
            A ${surchargeAmount} evening surcharge applies to appointments starting
            at or after {surchargeHour12}:00 {surchargeAmPm}.
          </div>

          {/* CTA */}
          <div className="text-center pt-8">
            <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] mb-6 text-lg">
              Ready to book?
            </p>
            <Link href="/booking">
              <Button variant="primary" size="lg">Book Now</Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}

function ServiceRow({ service }: { service: Service }) {
  return (
    <GlassCard className="px-6 py-5 flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-[#ededed]">
          {service.name}
        </h3>
        <span
          className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums flex-shrink-0"
          style={{ color: "#e8dcc4" }}
        >
          ${service.price}
        </span>
      </div>
      {service.description && (
        <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] leading-relaxed">
          {service.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <span className="font-[family-name:var(--font-montserrat)] text-[13px] text-[#8a8f98]">
          {service.durationMinutes} min
        </span>
        <Link href={`/booking?service=${service.id}`} className="rounded-full">
          <Button variant="secondary" size="sm">Book This</Button>
        </Link>
      </div>
    </GlassCard>
  );
}

function AddonRow({ addon }: { addon: Addon }) {
  return (
    <GlassCard className="px-5 py-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="font-[family-name:var(--font-oswald)] text-[15px] font-semibold uppercase tracking-wide text-[#ededed]">
          {addon.name}
        </h3>
        <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] mt-0.5">
          +{addon.durationMinutes} min
        </p>
      </div>
      <span
        className="font-[family-name:var(--font-montserrat)] text-base font-bold tabular-nums flex-shrink-0"
        style={{ color: "#e8dcc4" }}
      >
        +${addon.price}
      </span>
    </GlassCard>
  );
}
