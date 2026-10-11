import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'FrontLoop 24/7 AI Receptionist & Lead Qualifier for WhatsApp',
  description:
    'Autonomous B2B WhatsApp AI agent for clinics, coaching institutes, salons, and local businesses. 24/7 instant responses, bilingual patient/client qualification, and zero reception overload.',
  keywords: [
    'WhatsApp AI Agent',
    'AI Receptionist',
    'Clinic WhatsApp Automation',
    'Coaching Institute Lead Qualification',
    'WhatsApp Front Desk',
    'Local Business Lead Capture',
  ],
  metadataBase: new URL('https://frontloop.online'),
  openGraph: {
    title: 'FrontLoop 24/7 AI Receptionist & Lead Qualifier for WhatsApp',
    description:
      'Never miss a customer inquiry. Autonomous WhatsApp AI agent answering questions, pricing, and bookings around the clock.',
    url: 'https://frontloop.online',
    siteName: 'FrontLoop',
    images: [{ url: '/images/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FrontLoop WhatsApp AI Agent for SMBs',
    description: '24/7 WhatsApp AI Receptionist & Lead Qualifier for Clinics, Coaching, and Local Services.',
    images: ['/images/og-image.png'],
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
      <body suppressHydrationWarning className="antialiased overflow-x-hidden w-full max-w-full relative">
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}
