export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0';

/** Public demo bot number, digits only with country code (e.g. 919812345678). Empty = demo CTA hidden. */
export const DEMO_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_DEMO_WHATSAPP_NUMBER?.replace(/\D/g, '') || '';
