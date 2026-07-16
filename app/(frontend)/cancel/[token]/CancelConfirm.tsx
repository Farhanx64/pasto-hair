"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

type State = "idle" | "confirming" | "working" | "done" | "error";

/**
 * Two-step confirm, then POST.
 *
 * Never a link: mail clients and security scanners prefetch GET URLs, so a
 * cancel-on-GET would fire the moment the confirmation email was scanned and
 * silently bin the booking.
 */
export function CancelConfirm({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string>("");

  async function cancel() {
    setState("working");
    setError("");

    try {
      const res = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setState("done");
        return;
      }

      setError(data.message ?? "We couldn't cancel that. Please call us.");
      setState("error");
    } catch {
      setError("Network problem — please try again, or call us.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0f0f12] p-5 text-center"
      >
        <p className="font-[family-name:var(--font-oswald)] text-lg uppercase tracking-[0.05em] text-[#e8dcc4]">
          Cancelled
        </p>
        <p className="mt-2 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]">
          That&rsquo;s sorted — your appointment is cancelled and we&rsquo;ve let the shop know.
          No need to do anything else.
        </p>
        <a
          href="/booking"
          className="mt-5 inline-block font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-[#bb86fc]"
        >
          Book another time
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {state === "error" && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] p-4 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#ededed]"
        >
          {error}
        </p>
      )}

      {state === "confirming" ? (
        <>
          <p className="mb-4 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]">
            This can&rsquo;t be undone — you&rsquo;d need to book again, and the time may go to
            someone else.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              className="flex-1 !border-[rgba(248,113,113,0.4)] !text-[#f87171] hover:!border-[#f87171] hover:!text-[#f87171]"
              disabled={state !== "confirming"}
              onClick={cancel}
            >
              Yes, cancel it
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => setState("idle")}
            >
              Keep it
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="secondary"
          size="md"
          className="w-full !border-[rgba(248,113,113,0.4)] !text-[#f87171] hover:!border-[#f87171]"
          disabled={state === "working"}
          onClick={() => setState("confirming")}
        >
          {state === "working" ? "Cancelling…" : "Cancel this appointment"}
        </Button>
      )}
    </div>
  );
}
