import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#141414',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'LogicLens — Python & C Dry-Run Visualizer',
  description:
    'Adaptive Python and C Code Dry-Run Visualizer and Memory Inspector.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LogicLens',
  },
  icons: {
    icon: [
      { url: '/icon-192.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'LogicLens',
    description:
      'Adaptive Python and C Code Dry-Run Visualizer and Memory Inspector.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LogicLens',
    description:
      'Adaptive Python and C Code Dry-Run Visualizer and Memory Inspector.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${monoFont.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0E0E0E] text-white font-sans antialiased selection:bg-white selection:text-[#141414]"
      >
        {children}
      </body>
    </html>
  );
}
