"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Navbar() {
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
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)] rounded-lg"
        >
          <Image
            src="/logo.png"
            alt="Pasto Hair"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
          <span
            className="font-[family-name:var(--font-oswald)] text-xl font-semibold uppercase tracking-widest text-[#ededed]"
          >
            Pasto Hair
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink href="/pricing" onClick={close}>Pricing</NavLink>
          <NavLink href="/gallery" onClick={close}>Gallery</NavLink>
          <Link href="/booking" onClick={close}>
            <Button variant="primary" size="sm">Book Now</Button>
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer text-[#ededed] hover:text-[#bb86fc] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)]"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <div
        className="md:hidden absolute top-16 left-0 right-0 overflow-hidden"
        style={{
          maxHeight: mobileOpen ? "320px" : "0px",
          transition: "max-height 300ms cubic-bezier(0.16, 1, 0.3, 1)",
          background: "rgba(10,10,12,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: mobileOpen ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <nav className="flex flex-col gap-1 p-4">
          <MobileNavLink href="/pricing" onClick={close}>Pricing</MobileNavLink>
          <MobileNavLink href="/gallery" onClick={close}>Gallery</MobileNavLink>
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
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="font-[family-name:var(--font-montserrat)] text-sm font-medium text-[#8a8f98] hover:text-[#ededed] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[rgba(187,134,252,0.5)] rounded"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="font-[family-name:var(--font-montserrat)] text-base font-medium text-[#ededed] hover:text-[#bb86fc] transition-colors duration-150 px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.04)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
    >
      {children}
    </Link>
  );
}
