import * as React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const baseStyles =
  "inline-flex items-center justify-center cursor-pointer font-semibold uppercase tracking-wide rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 disabled:opacity-50 disabled:cursor-not-allowed select-none [touch-action:manipulation]";

const variantStyles: Record<Variant, string> = {
  primary:
    "text-background shadow-[0_0_20px_color-mix(in_srgb,var(--accent)_30%,transparent)] hover:opacity-90 hover:-translate-y-px hover:shadow-[0_0_32px_color-mix(in_srgb,var(--accent)_45%,transparent)] active:scale-[0.97] focus-visible:outline-accent/50",
  secondary:
    "bg-transparent border border-[rgba(255,255,255,0.15)] text-foreground hover:border-accent hover:text-accent active:scale-[0.97] focus-visible:outline-accent/50",
  ghost:
    "bg-transparent border-none text-foreground hover:text-accent active:scale-[0.97] focus-visible:outline-accent/50",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-5 min-h-[44px] gap-1.5",
  md: "text-sm px-7 min-h-[48px] gap-2",
  lg: "text-base px-9 min-h-[56px] gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  style,
  children,
  ...props
}: ButtonProps) {
  const gradientStyle =
    variant === "primary"
      ? {
          background: "linear-gradient(135deg, var(--accent), #6d5dfc)",
          ...style,
        }
      : style;

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={gradientStyle}
      {...props}
    >
      {children}
    </button>
  );
}
