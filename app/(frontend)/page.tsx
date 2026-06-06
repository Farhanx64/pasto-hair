import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="flex flex-col gap-4">
        <p className="font-[family-name:var(--font-montserrat)] text-sm uppercase tracking-[0.3em] text-accent">
          New York
        </p>
        <h1 className="font-[family-name:var(--font-oswald)] text-5xl font-bold uppercase tracking-tight sm:text-7xl">
          Pasto Hair
        </h1>
        <p className="font-[family-name:var(--font-montserrat)] text-lg text-foreground/70">
          Built for sharp cuts and sharper presence.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/booking"
          className="rounded-full bg-accent px-8 py-3 font-[family-name:var(--font-montserrat)] font-semibold text-black transition hover:opacity-90"
        >
          Book Now
        </Link>
        <Link
          href="/pricing"
          className="rounded-full border border-foreground/20 px-8 py-3 font-[family-name:var(--font-montserrat)] font-semibold transition hover:border-accent hover:text-accent"
        >
          View Pricing
        </Link>
      </div>
      <p className="font-[family-name:var(--font-montserrat)] text-xs text-foreground/40">
        Scaffold verified · Next.js 16 + Payload + SQLite
      </p>
    </main>
  );
}
