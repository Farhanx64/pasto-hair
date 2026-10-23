"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { isValidEmail } from "@/src/lib/booking/validation";

const INPUT_CLASS =
  "w-full rounded-xl px-4 py-3.5 text-foreground font-[family-name:var(--font-montserrat)] text-base placeholder:text-[#8a8f98]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50";
const INPUT_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  minHeight: "48px",
};

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-[family-name:var(--font-montserrat)] text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] p-4 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-foreground"
    >
      {children}
    </p>
  );
}

// ── Sign in (request a link) ───────────────────────────────────────────────

export function SignInForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email.trim())) {
      setMessage("Enter a valid email address, like john@example.com.");
      setState("error");
      return;
    }
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/account/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState("sent");
        return;
      }
      setMessage(data.message ?? "We couldn't send that just now. Please try again.");
      setState("error");
    } catch {
      setMessage("Network problem — please try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" aria-live="polite" className="text-center">
        <p className="font-[family-name:var(--font-oswald)] text-lg uppercase tracking-[0.05em] text-champagne">
          Check your email
        </p>
        <p className="mt-2 font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]">
          If that address can receive email, a sign-in link is on its way to{" "}
          <span className="text-foreground">{email.trim()}</span>. It works once and expires in 15
          minutes.
        </p>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="mt-5 cursor-pointer font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-accent"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field label="Email" htmlFor="account-email">
        <input
          id="account-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      </Field>
      {state === "error" && <ErrorNote>{message}</ErrorNote>}
      <Button type="submit" variant="primary" size="md" className="w-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p className="font-[family-name:var(--font-montserrat)] text-xs leading-5 text-[#8a8f98] text-center">
        No password needed. New here? The same link creates your account.
      </p>
    </form>
  );
}

// ── Profile (name / phone) ─────────────────────────────────────────────────

export function ProfileForm({ initialName, initialPhone }: { initialName: string; initialPhone: string }) {
  const [name, setName] = React.useState(initialName);
  const [phone, setPhone] = React.useState(initialPhone);
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState("saved");
        return;
      }
      setMessage(data.message ?? "We couldn't save that. Please try again.");
      setState("error");
    } catch {
      setMessage("Network problem — please try again.");
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Full Name" htmlFor="account-name">
        <input
          id="account-name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setState("idle");
          }}
          placeholder="John Doe"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Phone" htmlFor="account-phone">
        <input
          id="account-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setState("idle");
          }}
          placeholder="(555) 000-0000"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      </Field>
      {state === "error" && <ErrorNote>{message}</ErrorNote>}
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" size="md" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Save details"}
        </Button>
        {state === "saved" && (
          <span role="status" className="font-[family-name:var(--font-montserrat)] text-sm text-accent">
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ── Sign out ───────────────────────────────────────────────────────────────

export function SignOutButton() {
  const router = useRouter();
  const [working, setWorking] = React.useState(false);

  async function signOut() {
    setWorking(true);
    try {
      await fetch("/api/account/sign-out", { method: "POST" });
    } finally {
      router.refresh();
      setWorking(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={signOut} disabled={working}>
      {working ? "Signing out…" : "Sign out"}
    </Button>
  );
}
