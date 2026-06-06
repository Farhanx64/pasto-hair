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
          ? "hover:border-[rgba(187,134,252,0.2)] hover:shadow-[0_0_20px_rgba(187,134,252,0.08)]"
          : ""
      } ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {children}
    </div>
  );
}
