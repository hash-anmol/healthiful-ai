import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Bundled (SIL Open Font License) instead of next/font/google, so builds do not depend on fetching from Google Fonts.
const plusJakarta = localFont({
  variable: "--font-plus-jakarta",
  src: "./fonts/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  style: "normal",
  display: "swap",
});

const notoDevanagari = localFont({
  variable: "--font-noto-devanagari",
  src: "./fonts/noto-sans-devanagari-devanagari-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

import ConvexClientProvider from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Healthiful",
  description: "Your AI Personal Health Companion",
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${notoDevanagari.variable} antialiased`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
