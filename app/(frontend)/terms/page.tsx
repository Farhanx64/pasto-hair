import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { RichText } from "@payloadcms/richtext-lexical/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Reveal } from "@/components/ui/Reveal";
import { Ambient } from "@/components/ui/Ambient";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { getPayload } from "payload";
import config from "@payload-config";
import type { BusinessSetting, Legal } from "@/payload-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service — Pasto Hair",
  description: "Booking, cancellation, and service terms for Pasto Hair.",
};

async function getTermsData() {
  try {
    const payload = await getPayload({ config });
    const [legal, business] = await Promise.all([
      payload.findGlobal({ slug: "legal" }),
      payload.findGlobal({ slug: "business-settings" }),
    ]);
    return { legal, business };
  } catch {
    return { legal: null as Legal | null, business: null as BusinessSetting | null };
  }
}

// Formatted in the shop's timezone, not the server's — a late-evening save
// would otherwise show as the next day.
function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export default async function TermsPage() {
  const { legal, business } = await getTermsData();

  const body = legal?.termsBody;
  const hasBody = !!body?.root?.children?.length;
  const contact = [
    business?.phone && { icon: Phone, label: business.phone, href: `tel:${business.phone}` },
    business?.email && { icon: Mail, label: business.email, href: `mailto:${business.email}` },
    business?.address && { icon: MapPin, label: business.address },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href?: string }[];

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[760px] mx-auto">
          {/* Header */}
          <div className="relative overflow-hidden mb-12">
            <Ambient className="-top-40 -left-28" color="violet" size={560} />
            <Reveal className="relative">
              <span className="eyebrow mb-5">The fine print</span>
              <h1
                className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mt-4 mb-5"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }}
              >
                Terms of Service
              </h1>
              {legal?.termsUpdatedAt && (
                <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98]">
                  Last updated {formatUpdated(legal.termsUpdatedAt)}
                </p>
              )}
            </Reveal>
          </div>

          {hasBody ? (
            <Reveal>
              <GlassCard className="px-6 sm:px-10 py-8 sm:py-10" hover={false}>
                <RichText data={body!} className="legal-prose" />
              </GlassCard>
            </Reveal>
          ) : (
            <GlassCard className="px-6 py-10 text-center" hover={false}>
              <p className="font-[family-name:var(--font-oswald)] text-lg uppercase tracking-wide text-[#ededed] mb-2">
                Terms coming soon
              </p>
              <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98]">
                We&apos;re putting the finishing touches on these. Questions in the meantime?
                Reach out and we&apos;ll walk you through how booking works.
              </p>
            </GlassCard>
          )}

          {/* Contact — from Business Settings, so it stays current when the terms don't */}
          {contact.length > 0 && (
            <GlassCard className="mt-4 px-6 sm:px-10 py-6" hover={false}>
              <h2 className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-widest text-[#8a8f98] mb-4">
                Get in touch
              </h2>
              <ul className="flex flex-col gap-3">
                {contact.map(({ icon: Icon, label, href }) => (
                  <li key={label} className="flex items-center gap-3">
                    <Icon size={16} className="flex-shrink-0" color="#bb86fc" aria-hidden="true" />
                    {href ? (
                      <a
                        href={href}
                        className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed] hover:text-[#bb86fc] transition-colors duration-150 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed]">
                        {label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}
