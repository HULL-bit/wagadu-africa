import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { RegisterSW } from "@/components/RegisterSW";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wagadu Hub",
  description: "Plateforme interne de Wagadu Africa",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Wagadu Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4A2A12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${workSans.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
