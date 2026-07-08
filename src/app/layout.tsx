import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "True Attendly Broadcast | Editorial WhatsApp Marketing Platform",
  description: "Transform passive buyers into lifetime patrons. Launch high-converting AI-polished marketing updates, manage dynamic CSV/Excel registries, and process credit-driven WhatsApp pipelines with sub-second global execution and zero monthly fees.",
  keywords: ["WhatsApp Marketing Software", "B2B Retail SaaS", "AI Message Polisher", "Bulk WhatsApp Broadcast", "Pay as you send Marketing", "Excel Contact Sync"],
  metadataBase: new URL('https://broadcast.trueattendly.online'),
  openGraph: {
    title: "True Attendly Broadcast",
    description: "The Professional WhatsApp Marketing Platform for High-Retention Retail.",
    url: "https://broadcast.trueattendly.online",
    siteName: "True Attendly Broadcast",
    images: [{ url: "/images/logo-dark.png", width: 800, height: 600 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'True Attendly Broadcast',
    description: 'The Editorial WhatsApp Marketing Platform for High-Retention Retail.',
  },
  icons: {
    icon: '/images/logo-dark.png',
  },
};

import { OfflineBanner } from '@/components/ui/OfflineBanner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
