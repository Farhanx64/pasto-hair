import Link from "next/link";

import { verifyUnsubscribe } from "@/src/lib/marketing/unsubscribe";

import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Unsubscribe — Pasto Hair",
  robots: { index: false, follow: false },
};

type Args = {
  // Async in this Next version — must be awaited before use.
  searchParams: Promise<{ e?: string; t?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Args) {
  const { e, t } = await searchParams;
  const email = verifyUnsubscribe(e, t);

  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-24">
      <div className="w-full max-w-[440px] rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-8 text-center backdrop-blur-[12px]">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl uppercase tracking-[0.05em] text-foreground">
          {email ? "Unsubscribe" : "Link not valid"}
        </h1>
        <p className="mt-3 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98] wrap-anywhere">
          {email ? (
            <>
              Stop promo emails to <span className="text-foreground">{email}</span>? You&rsquo;ll still
              get confirmations for appointments you book.
            </>
          ) : (
            <>This link is incomplete. Reply &ldquo;unsubscribe&rdquo; to the email and we&rsquo;ll take you off the list.</>
          )}
        </p>
        {email && e && t ? (
          <UnsubscribeConfirm e={e} t={t} />
        ) : (
          <Link
            href="/"
            className="mt-7 inline-block font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-accent"
          >
            Back to site
          </Link>
        )}
      </div>
    </main>
  );
}
