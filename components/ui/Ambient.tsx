import * as React from "react";

interface AmbientProps {
  /** CSS position of the glow center, e.g. "top: -10%; left: -5%" via style */
  className?: string;
  color?: "violet" | "champagne";
  size?: number;
}

/**
 * Decorative radial glow blob. Parent must be position:relative with
 * overflow hidden if the blob should clip to the section.
 */
export function Ambient({ className = "", color = "violet", size = 520 }: AmbientProps) {
  const tone = color === "violet" ? "var(--accent)" : "var(--champagne)";
  return (
    <div
      aria-hidden="true"
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, color-mix(in srgb, ${tone} 7%, transparent) 0%, color-mix(in srgb, ${tone} 3%, transparent) 40%, transparent 70%)`,
      }}
    />
  );
}
