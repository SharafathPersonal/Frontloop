import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'True Attendly — 24/7 AI Receptionist & Lead Qualifier for WhatsApp',
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
  metadataBase: new URL('https://trueattendly.online'),
  openGraph: {
    title: 'True Attendly — 24/7 AI Receptionist & Lead Qualifier for WhatsApp',
    description:
      'Never miss a customer inquiry. Autonomous WhatsApp AI agent answering questions, pricing, and bookings around the clock.',
    url: 'https://trueattendly.online',
    siteName: 'True Attendly',
    images: [{ url: '/images/logo-dark.png', width: 800, height: 600 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'True Attendly — WhatsApp AI Agent for SMBs',
    description: '24/7 WhatsApp AI Receptionist & Lead Qualifier for Clinics, Coaching, and Local Services.',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/logo-dark.png', type: 'image/png' }
    ],
    apple: [
      { url: '/images/logo-dark.png', sizes: '180x180', type: 'image/png' }
    ]
  }
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
