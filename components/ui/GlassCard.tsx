import * as React from "react";

interface GlassCardProps {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}

export function GlassCard({ className = "", children, hover = true }: GlassCardProps) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        hover
          ? "hover:border-accent/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_20px_color-mix(in_srgb,var(--accent)_8%,transparent)]"
          : ""
      } ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        // Top-edge highlight simulates light refracting on the glass rim
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </div>
  );
}
