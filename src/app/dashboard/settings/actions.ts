'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireTenant } from '@/server/auth/dal';
import { connectDB } from '@/server/db';
import { decrypt, encrypt } from '@/server/crypto';
import { linkWhatsAppNumber } from '@/server/meta-graph';
import { rateLimit } from '@/server/rate-limit';
import { forTenant } from '@/server/repos/tenant';
import { invalidateTenantCache } from '@/server/tenant-resolver';

export type SettingsActionResult = { ok: true; message: string } | { ok: false; error: string };

const metaId = (label: string) =>
  z.string().trim().regex(/^\d{10,20}$/, `${label} must be 10–20 digits`);

const WhatsAppConfigSchema = z.object({
  phoneNumberId: metaId('Phone Number ID'),
  wabaId: metaId('WhatsApp Business Account ID'),
  displayPhoneNumber: z
    .string()
    .trim()
    .regex(/^\+[\d\s()-]+$/, 'Display phone number must start with + and the country code')
    .refine((v) => /^\d{8,15}$/.test(v.replace(/\D/g, '')), 'Display phone number must have 8–15 digits'),
  // Blank means "keep the stored token"; anything else must look like a long-lived token.
  accessToken: z
    .string()
    .trim()
    .refine((v) => v === '' || v.length >= 50, 'Access token looks too short — paste the full permanent token')
    .refine((v) => !/\s/.test(v), 'Access token must not contain spaces')
    .optional()
    .default(''),
});

export type WhatsAppConfigInput = z.input<typeof WhatsAppConfigSchema>;

const digits = (v: string) => v.replace(/\D/g, '');

const revalidateSettings = () => {
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard', 'layout');
};

export async function saveWhatsAppConfigAction(input: WhatsAppConfigInput): Promise<SettingsActionResult> {
  const session = await requireTenant(['owner']);

  const parsed = WhatsAppConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { phoneNumberId, wabaId, displayPhoneNumber } = parsed.data;

  await connectDB();
  // Each attempt makes three Graph API calls with a merchant token; cap brute-force and Meta rate-limit burn.
  if (!(await rateLimit(`wa-connect:${session.tenantId}`, 10, 15 * 60))) {
    return { ok: false, error: 'Too many connection attempts. Wait 15 minutes and try again.' };
  }

  const repo = forTenant(session.tenantId);
  const stored = await repo.getWhatsAppSecret();

  let accessToken = parsed.data.accessToken;
  if (!accessToken) {
    if (!stored.accessTokenEnc) return { ok: false, error: 'Access token is required' };
    try {
      accessToken = decrypt(stored.accessTokenEnc);
    } catch {
      return { ok: false, error: 'The stored access token is unreadable. Paste a new token to reconnect.' };
    }
  }

  const link = await linkWhatsAppNumber(phoneNumberId, wabaId, accessToken);
  if (!link.ok) return { ok: false, error: link.error };

  // Meta's record is authoritative; the typed number only confirms the merchant picked the right ID.
  if (link.displayPhoneNumber && digits(link.displayPhoneNumber) !== digits(displayPhoneNumber)) {
    return {
      ok: false,
      error: `That Phone Number ID belongs to ${link.displayPhoneNumber}, not ${displayPhoneNumber}. Check which number you meant to connect.`,
    };
  }

  try {
    const saved = await repo.connectWhatsApp({
      phoneNumberId,
      wabaId,
      displayPhoneNumber: link.displayPhoneNumber || displayPhoneNumber,
      accessTokenEnc: encrypt(accessToken),
    });
    if (!saved.ok) {
      return { ok: false, error: 'This WhatsApp number is already connected to another FrontLoop account. Contact support to move it.' };
    }
  } catch (err: unknown) {
    console.error('saveWhatsAppConfigAction failed', { tenantId: session.tenantId, err: err instanceof Error ? err.message : err });
    return { ok: false, error: 'Could not save the WhatsApp connection. Please try again.' };
  }

  if (stored.phoneNumberId) invalidateTenantCache(stored.phoneNumberId);
  invalidateTenantCache(phoneNumberId);
  revalidateSettings();

  const who = link.verifiedName ? ` as ${link.verifiedName}` : '';
  return { ok: true, message: `WhatsApp connected${who}. Your AI agent is now live.` };
}

export async function disconnectWhatsAppAction(): Promise<SettingsActionResult> {
  const session = await requireTenant(['owner']);
  const repo = forTenant(session.tenantId);

  try {
    const { phoneNumberId } = await repo.getWhatsAppSecret();
    await repo.disconnectWhatsApp();
    if (phoneNumberId) invalidateTenantCache(phoneNumberId);
  } catch (err: unknown) {
    console.error('disconnectWhatsAppAction failed', { tenantId: session.tenantId, err: err instanceof Error ? err.message : err });
    return { ok: false, error: 'Could not disconnect WhatsApp. Please try again.' };
  }

  revalidateSettings();
  return { ok: true, message: 'WhatsApp disconnected. Automated replies are paused.' };
}
