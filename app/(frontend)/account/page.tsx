import type { Metadata } from "next";
import Link from "next/link";
import config from "@payload-config";
import { getPayload } from "payload";

import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Ambient } from "@/components/ui/Ambient";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { findBookingsForEmail, getCurrentCustomer } from "@/src/lib/account/server";
import { nyLocalToISO } from "@/src/lib/calendar/index";
import type { Booking, Customer } from "@/payload-types";

import { ProfileForm, SignInForm, SignOutButton } from "./AccountForms";

// Force the full Node.js runtime (never edge) — required on cPanel/Passenger.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account — Pasto Hair",
  robots: { index: false, follow: false },
};

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

// Request-time clock, kept out of the component body (react-hooks/purity).
const now = () => Date.now();

function addonIdsOf(booking: Booking): string[] {
  return (booking.addons ?? []).map((a) => a.addon).filter(Boolean) as string[];
}

/** Same prefill deep link as the "Book this again" link in confirmation emails. */
function rebookHref(booking: Booking, customer: Customer): string {
  const params = new URLSearchParams({
    service: booking.service,
    name: customer.name || booking.customerName,
    email: customer.email,
    phone: customer.phone || booking.customerPhone,
  });
  const addonIds = addonIdsOf(booking);
  if (addonIds.length > 0) params.set("addons", addonIds.join(","));
  return `/booking?${params.toString()}`;
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer();

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative overflow-hidden mb-14">
            <Ambient className="-top-40 -left-28" color="violet" size={560} />
            <div className="relative max-w-xl">
              <span className="eyebrow mb-5">Your account</span>
              <h1
                className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed] mt-4 mb-5"
                style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1.05 }}
              >
                {customer ? "Account" : "Sign in"}
              </h1>
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] leading-relaxed">
                {customer
                  ? "Your appointments and details, in one place."
                  : "See your upcoming appointments, cancel or rebook in a tap. You don't need an account to book."}
              </p>
            </div>
          </div>

          {customer ? <SignedIn customer={customer} /> : <SignedOut />}
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}

function SignedOut() {
  return (
    <div className="max-w-[440px]">
      <GlassCard className="p-6 sm:p-8" hover={false}>
        <SignInForm />
      </GlassCard>
    </div>
  );
}

/**
 * Splits the customer's bookings into upcoming (live, not yet started — the
 * ones that can still be cancelled) and past (everything else, including
 * cancellations), with service/add-on ids resolved to names.
 */
async function loadBookings(email: string, now: number) {
  const bookings = await findBookingsForEmail(email);

  // Bookings store service/add-on ids; show names.
  const payload = await getPayload({ config });
  const [servicesResult, addonsResult] = await Promise.all([
    payload.find({ collection: "services", limit: 200, depth: 0 }),
    payload.find({ collection: "addons", limit: 200, depth: 0 }),
  ]);
  const serviceNames = new Map(servicesResult.docs.map((s) => [String(s.id), s.name]));
  const addonNames = new Map(addonsResult.docs.map((a) => [String(a.id), a.name]));

  const startMs = (b: Booking) => new Date(nyLocalToISO(b.localDate, b.localStartTime)).getTime();
  const isLive = (b: Booking) => b.status === "confirmed" || b.status === "pending";

  const upcoming = bookings
    .filter((b) => isLive(b) && startMs(b) >= now)
    .sort((a, b) => startMs(a) - startMs(b));
  const past = bookings
    .filter((b) => !upcoming.includes(b) && b.status !== "failed")
    .sort((a, b) => startMs(b) - startMs(a));

  const describe = (b: Booking) => {
    const addons = addonIdsOf(b).map((id) => addonNames.get(id) ?? id);
    const service = serviceNames.get(b.service) ?? b.service;
    return addons.length > 0 ? `${service} + ${addons.join(", ")}` : service;
  };

  return { upcoming, past, latest: bookings[0], describe };
}

async function SignedIn({ customer }: { customer: Customer }) {
  const { upcoming, past, latest, describe } = await loadBookings(customer.email, now());

  return (
    <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
      <div className="flex flex-col gap-12">
        <section>
          <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl font-semibold uppercase tracking-widest text-[#ededed] mb-6">
            Upcoming
          </h2>
          {upcoming.length === 0 ? (
            <GlassCard className="px-6 py-8" hover={false}>
              <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mb-5">
                Nothing on the books yet.
              </p>
              <Link href="/booking" className="inline-block rounded-full">
                <Button variant="primary" size="sm">Book Now</Button>
              </Link>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  description={describe(b)}
                  cancelHref={b.cancelToken ? `/cancel/${encodeURIComponent(b.cancelToken)}` : undefined}
                  rebookHref={rebookHref(b, customer)}
                />
              ))}
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-oswald)] text-xl sm:text-2xl font-semibold uppercase tracking-widest text-[#ededed] mb-6">
              Past
            </h2>
            <div className="flex flex-col gap-3">
              {past.map((b) => (
                <BookingRow
                  key={b.id}
                  booking={b}
                  description={describe(b)}
                  rebookHref={rebookHref(b, customer)}
                  muted
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="mt-12 lg:mt-0 lg:sticky lg:top-24 self-start flex flex-col gap-4">
        <GlassCard className="px-5 py-6" hover={false}>
          <h2 className="font-[family-name:var(--font-oswald)] text-sm font-semibold uppercase tracking-widest text-[#8a8f98] mb-1">
            Your details
          </h2>
          <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed] mb-5 break-all">
            {customer.email}
          </p>
          <ProfileForm
            initialName={customer.name || latest?.customerName || ""}
            initialPhone={customer.phone || latest?.customerPhone || ""}
          />
          <p className="mt-4 font-[family-name:var(--font-montserrat)] text-xs leading-5 text-[#8a8f98]">
            Used to fill in the booking form for you.
          </p>
        </GlassCard>
        <div className="flex justify-start">
          <SignOutButton />
        </div>
      </aside>
    </div>
  );
}

function BookingRow({
  booking,
  description,
  cancelHref,
  rebookHref,
  muted,
}: {
  booking: Booking;
  description: string;
  cancelHref?: string;
  rebookHref: string;
  muted?: boolean;
}) {
  const cancelled = booking.status === "cancelled";
  return (
    <GlassCard className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6" hover={false}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h3
            className={`font-[family-name:var(--font-oswald)] text-lg font-semibold uppercase tracking-wide ${
              muted ? "text-[#ededed]/80" : "text-[#e8dcc4]"
            } ${cancelled ? "line-through decoration-[#f87171]" : ""}`}
          >
            {formatDateLong(booking.localDate)}
          </h3>
          {cancelled && (
            <span className="font-[family-name:var(--font-montserrat)] text-[11px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full text-[#f87171] bg-[rgba(248,113,113,0.08)]">
              Cancelled
            </span>
          )}
        </div>
        <p className="font-[family-name:var(--font-montserrat)] text-sm font-semibold text-[#ededed] mt-0.5">
          {formatTime(booking.localStartTime)} – {formatTime(booking.localEndTime)} ET
        </p>
        <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] mt-0.5">
          {description} · ${booking.totalPrice}
        </p>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0">
        <Link
          href={rebookHref}
          className="font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-[#bb86fc] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
        >
          Book again
        </Link>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-[#f87171] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
          >
            Cancel
          </Link>
        )}
      </div>
    </GlassCard>
  );
}
