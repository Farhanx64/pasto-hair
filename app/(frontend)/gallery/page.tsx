import type { Metadata } from "next";
import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";

export const metadata: Metadata = {
  title: "Gallery — Pasto Hair",
  description:
    "Gallery of cuts, fades, and styles by Pasto Hair. Premium barbershop in New York.",
};

const PLACEHOLDER_COUNT = 6;

export default function GalleryPage() {
  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1
              className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mb-4"
              style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
            >
              GALLERY
            </h1>
            <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] max-w-md mx-auto">
              Our work speaks for itself. More photos coming soon.
            </p>
          </div>

          {/* Placeholder grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-12">
            {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
              <GlassCard
                key={i}
                className="aspect-square flex flex-col items-center justify-center gap-3"
              >
                <ImageIcon size={36} color="#8a8f98" strokeWidth={1} />
                <span className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98]/60 uppercase tracking-widest">
                  Coming soon
                </span>
              </GlassCard>
            ))}
          </div>

          {/* Note */}
          <p className="font-[family-name:var(--font-montserrat)] text-center text-sm text-[#8a8f98] mb-12">
            Follow us on Instagram for the latest cuts and styles.
          </p>

          {/* CTA */}
          <div className="text-center">
            <Link href="/booking">
              <Button variant="primary" size="lg">Book Your Cut</Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}
