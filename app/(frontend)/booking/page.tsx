"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Scissors,
  Plus,
  Calendar,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Footer } from "@/components/layout/Footer";
import { PageWrapper } from "@/components/layout/PageWrapper";

// ── Types ──────────────────────────────────────────────────────────────────
interface ServiceData {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string | null;
}

interface AddonData {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description?: string | null;
}

interface AvailabilityResponse {
  slots: string[];
  availabilityUnavailable?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STEPS = ["Service", "Add-ons", "Date & Time", "Your Info", "Confirm"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

const EVENING_SURCHARGE_HOUR = 20; // 8 PM
const EVENING_SURCHARGE = 10;

// ── Main component with Suspense for useSearchParams ───────────────────────
export default function BookingPage() {
  return (
    <React.Suspense fallback={null}>
      <BookingPageInner />
    </React.Suspense>
  );
}

function BookingPageInner() {
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams.get("service");

  // Data
  const [services, setServices] = React.useState<ServiceData[]>([]);
  const [addons, setAddons] = React.useState<AddonData[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);

  // Step state
  const [step, setStep] = React.useState<Step>(0);

  // Selections
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(
    preselectedServiceId ?? ""
  );
  const [selectedAddonIds, setSelectedAddonIds] = React.useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [selectedTime, setSelectedTime] = React.useState<string>("");

  // Customer info
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Availability
  const [slots, setSlots] = React.useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [availabilityUnavailable, setAvailabilityUnavailable] = React.useState(false);

  // Submission
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);
  const [confirmedBooking, setConfirmedBooking] = React.useState<{
    name: string;
    service: string;
    date: string;
    time: string;
  } | null>(null);

  // ── Load services + addons on mount ──
  React.useEffect(() => {
    async function load() {
      try {
        const [sRes, aRes] = await Promise.all([
          fetch("/api/services?where[active][equals]=true&sort=sortOrder&limit=100"),
          fetch("/api/addons?where[active][equals]=true&limit=100"),
        ]);
        const sData = await sRes.json();
        const aData = await aRes.json();
        setServices(sData.docs ?? []);
        setAddons(aData.docs ?? []);
      } catch {
        // silently fail — user can still proceed if partial
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  // ── Fetch availability when date/service/addons change ──
  React.useEffect(() => {
    if (!selectedDate || !selectedServiceId) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSelectedTime("");
    setAvailabilityUnavailable(false);

    const params = new URLSearchParams({
      date: selectedDate,
      serviceId: selectedServiceId,
    });
    selectedAddonIds.forEach((id) => params.append("addonIds", id));

    fetch(`/api/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((data: AvailabilityResponse) => {
        setSlots(data.slots ?? []);
        setAvailabilityUnavailable(data.availabilityUnavailable ?? false);
      })
      .catch(() => {
        setSlots([]);
        setAvailabilityUnavailable(true);
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedServiceId, selectedAddonIds]);

  // ── Price calculation ──
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedAddons = addons.filter((a) => selectedAddonIds.has(a.id));

  const servicePrice = selectedService?.price ?? 0;
  const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  const isSurcharge = React.useMemo(() => {
    if (!selectedTime) return false;
    const [h] = selectedTime.split(":").map(Number);
    return h >= EVENING_SURCHARGE_HOUR;
  }, [selectedTime]);

  const totalPrice = servicePrice + addonsPrice + (isSurcharge ? EVENING_SURCHARGE : 0);

  // ── Step validation ──
  const canProceed: Record<Step, boolean> = {
    0: !!selectedServiceId,
    1: true,
    2: !!selectedDate && !!selectedTime,
    3: name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0,
    4: true,
  };

  const next = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
  };
  const back = () => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      name,
      email,
      phone,
      serviceId: selectedServiceId,
      addonIds: Array.from(selectedAddonIds),
      notes,
      localDate: selectedDate,
      localStartTime: selectedTime,
      submissionId: crypto.randomUUID(),
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Server error ${res.status}`);
      }

      setConfirmedBooking({
        name,
        service: selectedService?.name ?? "",
        date: selectedDate,
        time: selectedTime,
      });
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitSuccess && confirmedBooking) {
    return (
      <PageWrapper className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <GlassCard className="max-w-md w-full p-10 text-center flex flex-col items-center gap-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(187,134,252,0.15)",
                border: "1px solid rgba(187,134,252,0.3)",
              }}
            >
              <Check size={32} color="#bb86fc" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-bold uppercase tracking-widest text-[#ededed] mb-2">
                Booking Confirmed
              </h1>
              <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98] text-sm">
                You&apos;re all set, {confirmedBooking.name}.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <ConfirmRow label="Service" value={confirmedBooking.service} />
              <ConfirmRow label="Date" value={confirmedBooking.date} />
              <ConfirmRow label="Time" value={formatTime12(confirmedBooking.time)} />
            </div>
            <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98]">
              A confirmation has been sent to {email}.
            </p>
          </GlassCard>
        </div>
        <Footer />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex flex-col min-h-screen">
      <div className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1
              className="font-[family-name:var(--font-oswald)] font-bold uppercase tracking-widest text-[#ededed]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              BOOK NOW
            </h1>
          </div>

          {/* Step indicator */}
          <div className="mb-10" role="navigation" aria-label="Booking steps">
            <div className="flex items-center gap-1 justify-center mb-3">
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <div
                    aria-label={`Step ${i + 1}: ${label}${i < step ? " (completed)" : i === step ? " (current)" : ""}`}
                    aria-current={i === step ? "step" : undefined}
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold font-[family-name:var(--font-montserrat)] transition-all duration-200 ${
                      i <= step ? "text-[#0a0a0c]" : "text-[#8a8f98] bg-[rgba(255,255,255,0.06)]"
                    }`}
                    style={
                      i <= step
                        ? { background: "linear-gradient(135deg, #bb86fc, #6d5dfc)" }
                        : undefined
                    }
                  >
                    {i < step ? <Check size={14} aria-hidden="true" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px max-w-[40px]"
                      style={{
                        background:
                          i < step
                            ? "linear-gradient(90deg, #bb86fc, #6d5dfc)"
                            : "rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] text-center">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>

          {/* Layout: mobile = single column, desktop = form + sidebar */}
          <div className="lg:grid lg:grid-cols-3 lg:gap-10">
            {/* Main form */}
            <div className="lg:col-span-2">
              {/* ── Step 0: Select service ── */}
              {step === 0 && (
                <StepSection title="Select a Service" icon={Scissors}>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-16 text-[#8a8f98]">
                      <Loader2 size={28} className="animate-spin" />
                    </div>
                  ) : services.length === 0 ? (
                    <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">
                      No services available right now.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {services.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          selected={selectedServiceId === service.id}
                          onSelect={() => setSelectedServiceId(service.id)}
                        />
                      ))}
                    </div>
                  )}
                </StepSection>
              )}

              {/* ── Step 1: Add-ons ── */}
              {step === 1 && (
                <StepSection title="Add-ons (Optional)" icon={Plus}>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-16 text-[#8a8f98]">
                      <Loader2 size={28} className="animate-spin" />
                    </div>
                  ) : addons.length === 0 ? (
                    <p className="font-[family-name:var(--font-montserrat)] text-[#8a8f98]">
                      No add-ons available right now.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {addons.map((addon) => (
                        <AddonCard
                          key={addon.id}
                          addon={addon}
                          selected={selectedAddonIds.has(addon.id)}
                          onToggle={() => {
                            setSelectedAddonIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(addon.id)) next.delete(addon.id);
                              else next.add(addon.id);
                              return next;
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </StepSection>
              )}

              {/* ── Step 2: Date + Time ── */}
              {step === 2 && (
                <StepSection title="Pick a Date & Time" icon={Calendar}>
                  {availabilityUnavailable && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}
                    >
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" color="#f87171" aria-hidden="true" />
                      <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#f87171]">
                        Availability temporarily unavailable — shown times may not reflect
                        real-time bookings.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-5">
                    <FormField label="Date" htmlFor="booking-date">
                      <input
                        id="booking-date"
                        type="date"
                        inputMode="none"
                        min={todayISO()}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          minHeight: "48px",
                          colorScheme: "dark",
                        }}
                      />
                    </FormField>

                    <FormField label="Time" htmlFor="booking-time">
                      <div className="relative">
                        <select
                          id="booking-time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                          disabled={!selectedDate || loadingSlots}
                          className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)] disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            minHeight: "48px",
                            colorScheme: "dark",
                          }}
                        >
                          {loadingSlots ? (
                            <option value="">Checking availability...</option>
                          ) : slots.length === 0 ? (
                            <option value="">
                              {selectedDate ? "No slots available" : "Select a date first"}
                            </option>
                          ) : (
                            <>
                              <option value="">Select a time</option>
                              {slots.map((slot) => (
                                <option key={slot} value={slot}>
                                  {formatTime12(slot)}
                                  {parseInt(slot.split(":")[0]) >= EVENING_SURCHARGE_HOUR
                                    ? ` (+$${EVENING_SURCHARGE} evening rate)`
                                    : ""}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        {loadingSlots ? (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Loader2 size={16} className="animate-spin text-[#8a8f98]" />
                          </div>
                        ) : (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Clock size={16} color="#8a8f98" />
                          </div>
                        )}
                      </div>
                    </FormField>
                  </div>
                </StepSection>
              )}

              {/* ── Step 3: Customer info ── */}
              {step === 3 && (
                <StepSection title="Your Info" icon={User}>
                  <div className="flex flex-col gap-5">
                    <FormField label="Full Name" htmlFor="booking-name" required>
                      <input
                        id="booking-name"
                        type="text"
                        inputMode="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base placeholder:text-[#8a8f98]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          minHeight: "48px",
                        }}
                      />
                    </FormField>

                    <FormField label="Email" htmlFor="booking-email" required>
                      <input
                        id="booking-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base placeholder:text-[#8a8f98]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          minHeight: "48px",
                        }}
                      />
                    </FormField>

                    <FormField label="Phone" htmlFor="booking-phone" required>
                      <input
                        id="booking-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base placeholder:text-[#8a8f98]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)]"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          minHeight: "48px",
                        }}
                      />
                    </FormField>

                    <FormField label="Notes (optional)" htmlFor="booking-notes">
                      <textarea
                        id="booking-notes"
                        inputMode="text"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any requests or special instructions..."
                        className="w-full rounded-xl px-4 py-3.5 text-[#ededed] font-[family-name:var(--font-montserrat)] text-base placeholder:text-[#8a8f98]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[rgba(187,134,252,0.5)] resize-none"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          minHeight: "80px",
                        }}
                      />
                    </FormField>
                  </div>
                </StepSection>
              )}

              {/* ── Step 4: Confirm ── */}
              {step === 4 && (
                <StepSection title="Confirm Booking" icon={Check}>
                  <div className="flex flex-col gap-4 mb-6">
                    <ConfirmRow label="Service" value={selectedService?.name ?? "—"} />
                    {selectedAddons.length > 0 && (
                      <ConfirmRow
                        label="Add-ons"
                        value={selectedAddons.map((a) => a.name).join(", ")}
                      />
                    )}
                    <ConfirmRow label="Date" value={selectedDate} />
                    <ConfirmRow
                      label="Time"
                      value={selectedTime ? formatTime12(selectedTime) : "—"}
                    />
                    <ConfirmRow label="Name" value={name} />
                    <ConfirmRow label="Email" value={email} />
                    <ConfirmRow label="Phone" value={phone} />
                    {notes && <ConfirmRow label="Notes" value={notes} />}
                    <div
                      className="pt-3 mt-1 border-t flex justify-between items-center"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      <span className="font-[family-name:var(--font-montserrat)] text-sm font-semibold text-[#ededed]">
                        Total
                      </span>
                      <span
                        className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums"
                        style={{ color: "#e8dcc4" }}
                      >
                        ${totalPrice}
                        {isSurcharge && (
                          <span className="font-normal text-sm text-[#8a8f98] ml-1">
                            (incl. ${EVENING_SURCHARGE} evening)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}
                    >
                      <X size={16} className="mt-0.5 flex-shrink-0" color="#f87171" aria-hidden="true" />
                      <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#f87171]">
                        {submitError}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </StepSection>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={back}
                  disabled={step === 0}
                  className="gap-1.5"
                >
                  <ChevronLeft size={18} /> Back
                </Button>

                {step < 4 && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={next}
                    disabled={!canProceed[step]}
                    className="gap-1.5"
                  >
                    {step === 3 ? "Review" : "Next"} <ChevronRight size={18} />
                  </Button>
                )}
              </div>
            </div>

            {/* ── Desktop sidebar: live summary ── */}
            <aside className="hidden lg:block">
              <GlassCard className="p-6 sticky top-24" hover={false}>
                <h3 className="font-[family-name:var(--font-oswald)] text-base font-semibold uppercase tracking-widest text-[#ededed] mb-5">
                  Summary
                </h3>
                <div className="flex flex-col gap-3">
                  <SummaryRow
                    label={selectedService?.name ?? "No service selected"}
                    value={selectedService ? `$${selectedService.price}` : "—"}
                    muted={!selectedService}
                  />
                  {selectedAddons.map((a) => (
                    <SummaryRow key={a.id} label={a.name} value={`+$${a.price}`} />
                  ))}
                  {isSurcharge && (
                    <SummaryRow label="Evening rate" value={`+$${EVENING_SURCHARGE}`} accent />
                  )}
                  {(selectedDate || selectedTime) && (
                    <div
                      className="pt-3 mt-1 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.08)" }}
                    >
                      {selectedDate && (
                        <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98]">
                          {selectedDate}
                        </p>
                      )}
                      {selectedTime && (
                        <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98]">
                          {formatTime12(selectedTime)}
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    className="pt-3 mt-1 border-t flex justify-between items-center"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <span className="font-[family-name:var(--font-montserrat)] text-sm font-semibold text-[#ededed]">
                      Total
                    </span>
                    <span
                      className="font-[family-name:var(--font-montserrat)] text-xl font-bold tabular-nums"
                      style={{ color: "#e8dcc4" }}
                    >
                      ${totalPrice}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </PageWrapper>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────
function StepSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={20} color="#bb86fc" />
        <h2 className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-wide text-[#ededed]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: ServiceData;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left w-full rounded-2xl p-5 transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)]"
      style={{
        background: selected ? "rgba(187,134,252,0.08)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: selected
          ? "1px solid rgba(187,134,252,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: selected ? "0 0 16px rgba(187,134,252,0.12)" : "none",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-[family-name:var(--font-oswald)] text-base font-semibold uppercase tracking-wide text-[#ededed]">
            {service.name}
          </p>
          {service.description && (
            <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] mt-1">
              {service.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="font-[family-name:var(--font-montserrat)] text-lg font-bold tabular-nums"
            style={{ color: "#e8dcc4" }}
          >
            ${service.price}
          </span>
          <span
            className="font-[family-name:var(--font-montserrat)] text-xs px-2 py-0.5 rounded-full text-[#8a8f98]"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {service.durationMinutes} min
          </span>
        </div>
        <div
          className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{
            background: selected ? "linear-gradient(135deg, #bb86fc, #6d5dfc)" : "transparent",
            borderColor: selected ? "#bb86fc" : "rgba(255,255,255,0.2)",
          }}
        >
          {selected && <Check size={12} color="#0a0a0c" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

function AddonCard({
  addon,
  selected,
  onToggle,
}: {
  addon: AddonData;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-left w-full rounded-2xl p-5 transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)]"
      style={{
        background: selected ? "rgba(187,134,252,0.08)" : "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: selected
          ? "1px solid rgba(187,134,252,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: selected ? "0 0 16px rgba(187,134,252,0.12)" : "none",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-[family-name:var(--font-oswald)] text-base font-semibold uppercase tracking-wide text-[#ededed]">
            {addon.name}
          </p>
          {addon.description && (
            <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98] mt-1">
              {addon.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className="font-[family-name:var(--font-montserrat)] text-lg font-bold tabular-nums"
            style={{ color: "#e8dcc4" }}
          >
            +${addon.price}
          </span>
          <span
            className="font-[family-name:var(--font-montserrat)] text-xs px-2 py-0.5 rounded-full text-[#8a8f98]"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            +{addon.durationMinutes} min
          </span>
        </div>
        <div
          className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150"
          style={{
            background: selected ? "linear-gradient(135deg, #bb86fc, #6d5dfc)" : "transparent",
            borderColor: selected ? "#bb86fc" : "rgba(255,255,255,0.2)",
            borderRadius: "4px",
          }}
        >
          {selected && <Check size={12} color="#0a0a0c" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
}

function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-[family-name:var(--font-montserrat)] text-sm font-medium text-[#ededed]"
      >
        {label}
        {required && <span className="text-[#bb86fc] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] flex-shrink-0">
        {label}
      </span>
      <span className="font-[family-name:var(--font-montserrat)] text-sm text-[#ededed] text-right">
        {value}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span
        className={`font-[family-name:var(--font-montserrat)] text-sm ${
          muted ? "text-[#8a8f98]/60" : accent ? "text-[#bb86fc]" : "text-[#8a8f98]"
        }`}
      >
        {label}
      </span>
      <span
        className={`font-[family-name:var(--font-montserrat)] text-sm font-semibold tabular-nums ${
          muted ? "text-[#8a8f98]/60" : accent ? "text-[#bb86fc]" : "text-[#ededed]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
