export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0';

export const SITE_URL = 'https://frontloop.online';

/** Business contact details shown on public pages, structured data, and llms.txt. */
export const CONTACT = {
  email: 'trueattendly@gmail.com',
  phoneDisplay: '+91 9400160928',
  phoneE164: '+919400160928',
  /** Digits only with country code, as wa.me expects. */
  whatsappNumber: '919400160928',
  city: 'Calicut',
  region: 'Kerala',
  country: 'India',
  location: 'Calicut, Kerala, India',
  hours: 'Mon - Sat: 9:00 AM - 7:00 PM IST',
} as const;

export const whatsappLink = (text: string) =>
  `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(text)}`;

export const LIVE_DEMO_URL = whatsappLink('Hi FrontLoop, show me how this works');
