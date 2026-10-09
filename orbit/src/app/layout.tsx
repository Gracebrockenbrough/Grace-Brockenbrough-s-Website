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
  themeColor: "#f7f6f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OrbitProvider>
          <UIProvider>{children}</UIProvider>
        </OrbitProvider>
      </body>
    </html>
  );
}
