import type { Metadata, Viewport } from "next";
import "./globals.css";
import { OrbitProvider } from "@/store/OrbitProvider";
import { UIProvider } from "@/store/UIProvider";

export const metadata: Metadata = {
  title: "ORBIT",
  description: "Chatbots wait for you to ask. ORBIT notices. Your life, organized around what matters.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1430",
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
        <OrbitProvider>
          <UIProvider>{children}</UIProvider>
        </OrbitProvider>
      </body>
    </html>
  );
}
