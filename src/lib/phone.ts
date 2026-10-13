/**
 * Normalises an Indian mobile number to WhatsApp-style digits (`91XXXXXXXXXX`).
 * Accepts `98765 43210`, `09876543210`, `+91 98765-43210` or `919876543210`.
 * Returns null unless it is a valid 10-digit Indian mobile (first digit 6-9).
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

/** `919876543210` -> `+91 98765 43210` for display. */
export const formatIndianMobile = (e164Digits: string) =>
  /^91\d{10}$/.test(e164Digits) ? `+91 ${e164Digits.slice(2, 7)} ${e164Digits.slice(7)}` : `+${e164Digits}`;
