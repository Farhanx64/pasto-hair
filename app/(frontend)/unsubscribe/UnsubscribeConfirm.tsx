"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

type State = "idle" | "working" | "done" | "error";

/**
 * A button, never a plain link: mail scanners open GET URLs, which would
 * unsubscribe people who never clicked.
 */
export function UnsubscribeConfirm({ e, t }: { e: string; t: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function unsubscribe() {
    setState("working");
    setError("");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e, t }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState("done");
        return;
      }
      setError(data.message ?? "We couldn't do that. Reply \"unsubscribe\" to the email instead.");
      setState("error");
    } catch {
      setError("Network problem — please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-6 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0f0f12] p-5 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]"
      >
        <span className="block font-[family-name:var(--font-oswald)] text-lg uppercase tracking-[0.05em] text-champagne">
          You&rsquo;re unsubscribed
        </span>
        No more promo emails. Changed your mind? Just reply to any of our emails.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {state === "error" && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] p-4 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-foreground"
        >
          {error}
        </p>
      )}
      <Button variant="secondary" size="md" className="w-full" disabled={state === "working"} onClick={unsubscribe}>
        {state === "working" ? "Unsubscribing…" : "Unsubscribe from promos"}
      </Button>
    </div>
  );
}
