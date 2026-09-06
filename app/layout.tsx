import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Chokepoint — Least-Privilege Access Control & Tamper-Evident Audit",
  description:
    "Chokepoint is a least-privilege access-control and tamper-evident audit platform for sensitive operations — humans and AI agents. Role separation, dual-control approvals, hash-chained audit log, and live risk detection.",
  applicationName: "Chokepoint",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Chokepoint — Least-Privilege Access Control",
    description:
      "Role separation, dual-control, hash-chained tamper-evident audit log, and anomaly detection for sensitive operations and AI agents.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
