import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aakansha Singh · UX/UI Designer",
  description: "I make complicated things feel simple. Tip the bag to see my work.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8DCCB" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1A22" },
  ],
};

// Applies the saved theme and calm choice before first paint, so nothing flashes.
const bootScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var c=localStorage.getItem("calm");var r=window.matchMedia("(prefers-reduced-motion: reduce)").matches;document.documentElement.dataset.calm=String(c==="on"||(c!=="off"&&r));}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${caveat.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
