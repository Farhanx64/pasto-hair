"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/gallery", label: "Gallery" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggle = () => setMobileOpen((prev) => !prev);
  const close = () => setMobileOpen(false);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 sm:px-6 lg:px-8"
      style={{
        background: "rgba(10,10,12,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          onClick={close}
          aria-label="Pasto Hair — home"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)] rounded-lg"
        >
          <Image
            src="/logo.png"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
          <span className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-widest text-[#ededed]">
            Pasto Hair
          </span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} active={pathname === href} onClick={close}>
              {label}
            </NavLink>
          ))}
          <Link href="/booking" onClick={close}>
            <Button variant="primary" size="sm">Book Now</Button>
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg cursor-pointer text-[#ededed] hover:text-[#bb86fc] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] [touch-action:manipulation]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile slide-down menu — transform+opacity (GPU-composited, no layout thrash) */}
      <div
        id="mobile-menu"
        aria-hidden={!mobileOpen}
        className="md:hidden absolute top-16 left-0 right-0 overflow-hidden"
        style={{
          background: "rgba(10,10,12,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: mobileOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
          // GPU-composited animation — no max-height/height thrash
          transform: mobileOpen ? "translateY(0)" : "translateY(-8px)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: mobileOpen
            ? "transform 280ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease"
            : "transform 200ms cubic-bezier(0.4,0,1,1), opacity 150ms ease",
          visibility: mobileOpen ? "visible" : "hidden",
        }}
      >
        <nav aria-label="Mobile navigation" className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map(({ href, label }) => (
            <MobileNavLink key={href} href={href} active={pathname === href} onClick={close}>
              {label}
            </MobileNavLink>
          ))}
          <div className="pt-2">
            <Link href="/booking" onClick={close} className="block">
              <Button variant="primary" size="md" className="w-full">Book Now</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`font-[family-name:var(--font-montserrat)] text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] rounded ${
        active ? "text-[#bb86fc]" : "text-[#8a8f98] hover:text-[#ededed]"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`font-[family-name:var(--font-montserrat)] text-base font-medium transition-colors duration-150 px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.04)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] [touch-action:manipulation] ${
        active ? "text-[#bb86fc]" : "text-[#ededed] hover:text-[#bb86fc]"
      }`}
    >
      {children}
    </Link>
  );
}
