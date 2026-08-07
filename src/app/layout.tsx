import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const plexSansCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-sans-condensed",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "ArcoTime",
  description: "Zeiterfassung für Mandatsarbeit – Arcos Group",
  icons: {
    icon: "/favicon-32.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${plexSans.variable} ${plexSansCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
