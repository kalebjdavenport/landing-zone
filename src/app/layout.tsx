import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";

import { TrpcProvider } from "@/lib/trpc/provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Landing Zone | Dispatcher Weather",
  description:
    "NWS-first dispatcher weather dashboard with aviation overlays and live operational deltas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} antialiased`}>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
