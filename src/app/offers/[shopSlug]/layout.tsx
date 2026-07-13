import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Flash Offers | True Attendly Broadcast',
  description: 'View exclusive in-store flash offers and discounts. No app installation or sign-up required.',
};

export default function OffersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
