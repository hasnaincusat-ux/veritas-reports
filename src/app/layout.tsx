import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Display carries the headlines; Inter runs the UI; mono is for readings only.
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";

export const metadata: Metadata = {
  title: {
    default: `${SITE} — Know your score before it counts`,
    template: `%s · ${SITE}`,
  },
  description:
    "Independent similarity and AI-writing checks on your own drafts, usually back within ten minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
