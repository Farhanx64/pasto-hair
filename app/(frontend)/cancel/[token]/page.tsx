import config from "@payload-config";
import { getPayload } from "payload";

import { nyLocalToISO } from "@/src/lib/calendar/index";

import { CancelConfirm } from "./CancelConfirm";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cancellation links must never be indexed or prefetched into existence.
export const metadata = {
  title: "Cancel appointment — Pasto Hair",
  robots: { index: false, follow: false },
};

type Args = {
  // Async in this Next version — must be awaited before use.
  params: Promise<{ token: string }>;
};

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-5 py-24">
      <div className="w-full max-w-[440px]">{children}</div>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-8 text-center backdrop-blur-[12px]">
        <h1 className="font-[family-name:var(--font-oswald)] text-2xl uppercase tracking-[0.05em] text-[#ededed]">
          {title}
        </h1>
        <p className="mt-3 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]">
          {body}
        </p>
        <a
          href="/"
          className="mt-7 inline-block font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-[#bb86fc]"
        >
          Back to site
        </a>
      </div>
    </Shell>
  );
}

export default async function CancelPage({ params }: Args) {
  const { token } = await params;

  const payload = await getPayload({ config });

  const found = await payload.find({
    collection: "bookings",
    where: { cancelToken: { equals: token } },
    limit: 1,
  });

  const booking = found.docs[0];

  if (!booking) {
    return (
      <Message
        title="Link not valid"
        body="This cancellation link doesn't match a booking. It may have already been used, or the address may have been mistyped. Give us a call and we'll sort it."
      />
    );
  }

  if (booking.status === "cancelled") {
    return (
      <Message
        title="Already cancelled"
        body={`Your ${formatDateLong(booking.localDate)} appointment has been cancelled. Nothing more to do — that time is back on the books.`}
      />
    );
  }

  const bookingSettings = await payload.findGlobal({ slug: "booking-settings" });
  const cutoffMinutes = bookingSettings.cancelCutoffMinutes ?? 90;

  // Mirror of the server-side cutoff in /api/cancel. Presentation only — the
  // route enforces it for real. nyLocalToISO is used rather than parsing the
  // date directly, because a bare `new Date("2026-07-23T20:15:00")` resolves in
  // the *server's* timezone, not New York's.
  const startMs = new Date(
    nyLocalToISO(booking.localDate, booking.localStartTime),
  ).getTime();
  const tooLate = Date.now() >= startMs - cutoffMinutes * 60 * 1000;

  const addons = (booking.addons ?? [])
    .map((a: { addon?: string | null }) => a.addon)
    .filter(Boolean) as string[];

  return (
    <Shell>
      <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-8 backdrop-blur-[12px]">
        <p className="font-[family-name:var(--font-oswald)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f87171]">
          Cancel appointment
        </p>

        <h1 className="mt-3 font-[family-name:var(--font-oswald)] text-3xl font-semibold tracking-[0.02em] text-[#e8dcc4]">
          {formatDateLong(booking.localDate)}
        </h1>
        <p className="mt-1.5 font-[family-name:var(--font-montserrat)] text-base font-semibold text-[#ededed]">
          {formatTime(booking.localStartTime)} – {formatTime(booking.localEndTime)} ET
        </p>

        <div className="mt-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0f0f12] p-5">
          <dl className="space-y-2.5 font-[family-name:var(--font-montserrat)] text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#8a8f98]">Service</dt>
              <dd className="text-right font-medium text-[#ededed]">
                {booking.service}
                {addons.length > 0 && (
                  <span className="text-[#8a8f98]"> + {addons.join(", ")}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8a8f98]">Booked for</dt>
              <dd className="text-right font-medium text-[#ededed]">{booking.customerName}</dd>
            </div>
          </dl>
        </div>

        {tooLate ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] p-4 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#ededed]"
          >
            It&rsquo;s too close to your appointment to cancel online. Please give us a call
            and we&rsquo;ll take care of it.
          </p>
        ) : (
          <CancelConfirm token={token} />
        )}
      </div>
    </Shell>
  );
}
