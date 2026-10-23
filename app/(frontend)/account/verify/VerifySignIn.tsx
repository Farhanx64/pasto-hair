"use client";

import * as React from "react";

import { Button } from "@/components/ui/Button";

type State = "ready" | "missing" | "working" | "error";

/**
 * Reads the token from the URL fragment and spends it only on a click.
 *
 * Never automatic: link scanners and mail-client previews open emailed links,
 * and some run their JavaScript. If this page signed in on load, a scanner
 * would use up the single-use link — and could be the one holding the session.
 * Scanners don't press buttons.
 */
export function VerifySignIn() {
  const [token, setToken] = React.useState<string | null>(null);
  const [state, setState] = React.useState<State>("ready");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const t = params.get("token");
    // Reading the fragment is only possible after mount — this is the
    // external-system sync effects exist for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t) setToken(t);
    else setState("missing");
    // Drop the token from the address bar / history once it's in memory.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function signIn() {
    if (!token) return;
    setState("working");
    setError("");
    try {
      const res = await fetch("/api/account/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.location.replace("/account");
        return;
      }
      setError(data.message ?? "This sign-in link didn't work. Request a new one.");
      setState("error");
    } catch {
      setError("Network problem — please try again.");
      setState("ready");
    }
  }

  if (state === "missing" || state === "error") {
    return (
      <div className="text-center">
        <p className="font-[family-name:var(--font-montserrat)] text-sm leading-6 text-[#8a8f98]">
          {state === "missing"
            ? "This sign-in link is incomplete. Open it straight from the email, or request a new one."
            : error}
        </p>
        <a
          href="/account"
          className="mt-6 inline-block font-[family-name:var(--font-montserrat)] text-xs font-semibold uppercase tracking-[0.1em] text-accent"
        >
          Request a new link
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="font-[family-name:var(--font-montserrat)] text-sm text-[#f87171] text-center">
          {error}
        </p>
      )}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={signIn}
        disabled={!token || state === "working"}
      >
        {state === "working" ? "Signing in…" : "Sign in"}
      </Button>
    </div>
  );
}
