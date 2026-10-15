import type { Metadata, Viewport } from 'next';
import { Caveat, IBM_Plex_Mono, Inter } from 'next/font/google';
import { Header } from '@/components/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' });
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Aakansha Singh · UX/UI Designer',
  description: "I make complicated things feel simple. Here's what I carry. Tip the bag to see my work.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E8DCCB' },
    { media: '(prefers-color-scheme: dark)', color: '#1E1A22' },
  ],
};

// Runs before first paint: applies the stored theme and calm mode so there's no flash.
const bootScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem('theme');
d.dataset.theme=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
var c=localStorage.getItem('calm');if(c==='1'||(c!=='0'&&matchMedia('(prefers-reduced-motion: reduce)').matches))d.setAttribute('data-calm','');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${inter.variable} ${caveat.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-tag focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <main id="main">
          {children}
        </main>
      </body>
    </html>
  );
}
