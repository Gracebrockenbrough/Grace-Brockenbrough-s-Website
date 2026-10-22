import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND.name,
  description: `${BRAND.tagline} ${BRAND.supporting}`,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#E9F1E4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
