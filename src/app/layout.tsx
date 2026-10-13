import type { Metadata, Viewport } from 'next';
import './globals.css';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { ServiceWorkerRegistrar } from '@/components/ui/ServiceWorkerRegistrar';
import { CONTACT, SITE_URL } from '@/lib/config';
import { PLAN_CONFIG } from '@/lib/plans';

const TITLE = 'FrontLoop | 24/7 AI WhatsApp Receptionist & Lead Qualifier for SMBs';
const DESCRIPTION =
  'Automate your clinic, coaching center, or business WhatsApp front desk with FrontLoop. Replies in seconds from your own knowledge base, captures leads, and hands chats to your staff. Based in Calicut, Kerala.';
const OG_IMAGE = { url: '/images/og-image.png', width: 1200, height: 630, alt: 'FrontLoop AI WhatsApp front desk' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#047857',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'FrontLoop',
  keywords: [
    'WhatsApp AI Bot Calicut',
    'AI receptionist Kerala',
    'WhatsApp CRM lead generation',
    'clinic appointment bot',
    'FrontLoop AI',
  ],
  appleWebApp: { capable: true, title: 'FrontLoop', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'FrontLoop',
    images: [OG_IMAGE],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

const planPrices = Object.values(PLAN_CONFIG).map((plan) => plan.priceINR);

const address = {
  '@type': 'PostalAddress',
  addressLocality: CONTACT.city,
  addressRegion: CONTACT.region,
  addressCountry: 'IN',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'FrontLoop',
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: CONTACT.email,
      telephone: '+91-9400160928',
      address,
      areaServed: { '@type': 'Country', name: CONTACT.country },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone: '+91-9400160928',
        email: CONTACT.email,
        areaServed: 'IN',
        availableLanguage: ['English', 'Malayalam'],
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'FrontLoop',
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      areaServed: { '@type': 'Country', name: CONTACT.country },
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'INR',
        lowPrice: Math.min(...planPrices),
        highPrice: Math.max(...planPrices),
        offerCount: planPrices.length,
      },
    },
  ],
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased overflow-x-hidden w-full max-w-full relative">
        <OfflineBanner />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
