import type { Metadata, Viewport } from "next";
import { Inter_Tight, Geist_Mono } from "next/font/google";
import "./globals.css";

// Free stand-in for Motif's Season Sans (paid). Swap the font here and nowhere else.
const sans = Inter_Tight({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

const title = "Enhcept · Drafting tomorrow's concepts, enhanced by AI";
const description =
  "Enhcept brings ConceptDrafter's BIM and engineering teams together with ENHC's AI and software. One partner for BIM, MEP, civil, plugins, software and AI, for AEC firms of every size.";

export const metadata: Metadata = {
  // Makes the OG image URL absolute. Read at build time, so set SITE_URL before `next build`.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title,
  description,
  openGraph: { type: "website", title, description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#faf7f2" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
