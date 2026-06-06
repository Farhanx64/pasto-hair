import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Footer() {
  return (
    <>
      <footer
        className="relative mt-auto py-16 px-4 sm:px-6 lg:px-8"
        style={{
          background: "rgba(5,5,6,0.8)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-10 text-center pb-safe">
          {/* Brand image + tagline */}
          <div className="flex flex-col items-center gap-4">
            <Image
              src="/footer-brand.png"
              alt="Pasto Hair"
              width={80}
              height={80}
              className="object-contain opacity-90"
            />
            <p className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] max-w-xs">
              Built for sharp cuts and sharper presence.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-6">
            <FooterLink href="/pricing">Pricing</FooterLink>
            <FooterLink href="/gallery">Gallery</FooterLink>
            <FooterLink href="/booking">Book Now</FooterLink>
          </nav>

          {/* Social links */}
          <div className="flex items-center gap-6">
            {/* TODO: replace with real Instagram URL */}
            <SocialLink href="https://instagram.com" label="Instagram">
              {/* Instagram icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </SocialLink>
            {/* TODO: replace with real Facebook URL */}
            <SocialLink href="https://facebook.com" label="Facebook">
              {/* Facebook icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </SocialLink>
            {/* TODO: replace with real X/Twitter URL */}
            <SocialLink href="https://x.com" label="X (Twitter)">
              <X size={20} />
            </SocialLink>
          </div>

          {/* CTA */}
          <Link href="/booking">
            <Button variant="primary" size="lg">Book Now</Button>
          </Link>

          {/* Legal */}
          <p className="font-[family-name:var(--font-montserrat)] text-xs text-[#8a8f98]/60">
            &copy; {new Date().getFullYear()} Pasto Hair. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Mobile sticky bottom bar */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3"
        style={{
          background: "rgba(10,10,12,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <Link href="/booking" className="block">
          <Button variant="primary" size="md" className="w-full">
            Book Now
          </Button>
        </Link>
      </div>
    </>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="font-[family-name:var(--font-montserrat)] text-sm text-[#8a8f98] hover:text-[#ededed] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)] rounded"
    >
      {children}
    </Link>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center w-10 h-10 rounded-full text-[#8a8f98] hover:text-[#bb86fc] transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(187,134,252,0.5)]"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {children}
    </a>
  );
}
