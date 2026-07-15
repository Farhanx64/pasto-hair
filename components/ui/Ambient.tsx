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
  const rgb = color === "violet" ? "187,134,252" : "232,220,196";
  return (
    <div
      aria-hidden="true"
      className={`absolute pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(${rgb},0.07) 0%, rgba(${rgb},0.03) 40%, transparent 70%)`,
      }}
    />
  );
}
