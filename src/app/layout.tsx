import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'True Attendly Broadcast — Editorial WhatsApp Marketing Platform',
  description:
    'Transform passive buyers into lifetime patrons. Launch high-converting story updates, broadcast dynamic offers, and manage credit-driven pipelines with sub-second global execution.',
  metadataBase: new URL('https://broadcast.trueattendly.online'),
  openGraph: {
    title: 'True Attendly Broadcast',
    description: 'The Editorial WhatsApp Marketing Platform for High-Retention Retail.',
    url: 'https://broadcast.trueattendly.online',
    siteName: 'True Attendly Broadcast',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'True Attendly Broadcast',
    description: 'The Editorial WhatsApp Marketing Platform for High-Retention Retail.',
  },
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
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
