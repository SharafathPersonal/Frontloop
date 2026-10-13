import 'server-only';
import { cache } from 'react';
import { connectDB } from '@/server/db';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import { isSubscriptionLive } from '@/server/quota';

export type PublicTenant = {
  id: string;
  name: string;
  category: string;
  timezone: string;
  /** Digits for wa.me, only when the tenant's WhatsApp number is connected. */
  whatsappNumber: string | null;
  /**
   * False when the trial or plan has lapsed. Deliberately independent of
   * `botEnabled`, which only "Disconnect WhatsApp" switches off: web chat works
   * without any WhatsApp number.
   */
  live: boolean;
};

/**
 * The only tenant fields a public page may see. Memoised per request so
 * generateMetadata and the page share one query.
 */
export const getPublicTenant = cache(async (tenantId: string): Promise<PublicTenant | null> => {
  if (!/^[a-f0-9]{24}$/.test(tenantId)) return null;
  await connectDB();
  const tenant = await BusinessTenant.findOne({ _id: tenantId })
    .select('name category timezone subscription.status subscription.currentPeriodEnd whatsapp.status whatsapp.displayPhoneNumber')
    .lean();
  if (!tenant) return null;

  const waDigits = tenant.whatsapp?.displayPhoneNumber?.replace(/\D/g, '');
  return {
    id: String(tenant._id),
    name: tenant.name,
    category: tenant.category,
    timezone: tenant.timezone || 'Asia/Kolkata',
    whatsappNumber: tenant.whatsapp?.status === 'connected' && waDigits ? waDigits : null,
    live: isSubscriptionLive(tenant.subscription),
  };
});
