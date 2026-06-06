import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Plus } from "lucide-react";
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
              Transparent pricing. No hidden fees. Just sharp cuts and honest work.
            </p>
          </div>

          {/* Evening surcharge note */}
          <GlassCard
            className="mb-12 px-6 py-4 flex items-start gap-3"
            hover={false}
          >
            <Clock size={18} className="mt-0.5 flex-shrink-0" color="#bb86fc" />
            <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed]/80">
              <span className="font-semibold text-[#bb86fc]">Evening rate:</span>{" "}
              Bookings starting at or after {surchargeHour12}:00 {surchargeAmPm} include a $
              {surchargeAmount} evening surcharge.
            </p>
          </GlassCard>

          {/* Services */}
          <section className="mb-16">
            <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl font-semibold uppercase tracking-widest text-[#ededed] mb-6">
              Services
            </h2>
            {services.length === 0 ? (
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">
                Services coming soon.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {services.map((service) => (
                  <ServiceRow key={service.id} service={service} />
                ))}
              </div>
            )}
          </section>

          {/* Add-ons */}
          {addons.length > 0 && (
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl font-semibold uppercase tracking-widest text-[#ededed] mb-6">
                Add-ons
              </h2>
              <div className="flex flex-col gap-3">
                {addons.map((addon) => (
                  <AddonRow key={addon.id} addon={addon} />
                ))}
              </div>
            </section>
          )}

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
    <GlassCard className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex-1">
        <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-[#ededed]">
          {service.name}
        </h3>
        {service.description && (
          <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mt-0.5">
            {service.description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span
          className="font-[family-name:var(--font-montserrat)] text-xs px-2.5 py-1 rounded-full text-[#8a8f98]"
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
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] rounded-full"
        >
          <Button variant="primary" size="sm">Book</Button>
        </Link>
      </div>
    </GlassCard>
  );
}

function AddonRow({ addon }: { addon: Addon }) {
  return (
    <GlassCard className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-3 flex-1">
        <div
          className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(187,134,252,0.1)", border: "1px solid rgba(187,134,252,0.2)" }}
        >
          <Plus size={12} color="#bb86fc" />
        </div>
        <div>
          <h3 className="font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide text-[#ededed]">
            {addon.name}
          </h3>
          {addon.description && (
            <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mt-0.5">
              {addon.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span
          className="font-[family-name:var(--font-montserrat)] text-xs px-2.5 py-1 rounded-full text-[#8a8f98]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          +{addon.durationMinutes} min
        </span>
        <span
          className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums w-16 text-right"
          style={{ color: "#e8dcc4" }}
        >
          +${addon.price}
        </span>
      </div>
    </GlassCard>
  );
}
