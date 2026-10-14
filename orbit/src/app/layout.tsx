import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WebAppRoot } from "@/components/shell/WebAppRoot";

export const metadata: Metadata = {
  title: "Orbit",
  description: "Chatbots wait for you to ask. Orbit notices. Your life, organized around what matters.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0b122b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <WebAppRoot>{children}</WebAppRoot>
      </body>
    </html>
  );
}
