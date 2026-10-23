import type { Metadata } from "next";

import { PageWrapper } from "@/components/layout/PageWrapper";
import { GlassCard } from "@/components/ui/GlassCard";

import { VerifySignIn } from "./VerifySignIn";

// Sign-in links must never be indexed, and the page must not leak its URL in
// a Referer. The token itself is in the fragment, which the server never sees.
export const metadata: Metadata = {
  title: "Sign in — Pasto Hair",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerifyPage() {
  return (
    <PageWrapper className="flex flex-1 items-center justify-center px-5 py-24">
      <div className="w-full max-w-[440px]">
        <GlassCard className="p-8" hover={false}>
          <p className="font-[family-name:var(--font-oswald)] text-[11px] font-semibold uppercase tracking-[0.18em] text-accent text-center">
            Your account
          </p>
          <h1 className="mt-3 mb-6 font-[family-name:var(--font-oswald)] text-3xl font-semibold uppercase tracking-[0.04em] text-champagne text-center">
            Sign in to Pasto Hair
          </h1>
          <VerifySignIn />
        </GlassCard>
      </div>
    </PageWrapper>
  );
}
