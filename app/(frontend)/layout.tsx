import type { Metadata } from "next";
import { Oswald, Montserrat } from "next/font/google";
import "../globals.css";
import { Navbar } from "@/components/layout/Navbar";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pasto Hair — Premium Barbershop",
  description: "Built for sharp cuts and sharper presence.",
};

export default function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex flex-col flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
