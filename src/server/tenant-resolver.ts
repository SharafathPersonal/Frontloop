import 'server-only';
import { connectDB } from '@/server/db';
import { BusinessTenant, type BusinessTenantDoc } from '@/server/models/BusinessTenant';
import { decrypt } from '@/server/crypto';

interface CachedTenant {
  id: string;
  name: string;
  slug: string;
  botEnabled: boolean;
  phoneNumberId: string;
  accessToken: string;
  subscription: {
    status: string;
    replyQuota: number;
    repliesUsed: number;
  };
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60s in-memory TTL
const tenantCache = new Map<string, CachedTenant>();

export async function getTenantByPhoneNumberId(
  phoneNumberId: string,
): Promise<CachedTenant | null> {
  const cached = tenantCache.get(phoneNumberId);
  const now = Date.now();
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached;
  }

  await connectDB();

  // BusinessTenant is NOT wrapped with tenantGuard (it is the root tenant model),
  // but we query by whatsapp.phoneNumberId. We select +whatsapp.accessTokenEnc to decrypt it.
  const tenant = await BusinessTenant.findOne({
    'whatsapp.phoneNumberId': phoneNumberId,
  })
    .select('+whatsapp.accessTokenEnc')
    .lean<
      (BusinessTenantDoc & {
        _id: unknown;
        whatsapp?: { accessTokenEnc?: string; phoneNumberId?: string };
      }) | null
    >();

  if (!tenant || !tenant.whatsapp?.phoneNumberId) {
    return null;
  }

  let decryptedToken = '';
  if (tenant.whatsapp.accessTokenEnc) {
    try {
      decryptedToken = decrypt(tenant.whatsapp.accessTokenEnc);
    } catch (err) {
      console.error(
        `Failed to decrypt WhatsApp access token for tenant ${tenant._id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const resolved: CachedTenant = {
    id: String(tenant._id),
    name: tenant.name,
    slug: tenant.slug,
    botEnabled: tenant.botEnabled ?? true,
    phoneNumberId: tenant.whatsapp.phoneNumberId,
    accessToken: decryptedToken,
    subscription: {
      status: tenant.subscription?.status ?? 'active',
      replyQuota: tenant.subscription?.replyQuota ?? 300,
      repliesUsed: tenant.subscription?.repliesUsed ?? 0,
    },
    cachedAt: now,
  };

  tenantCache.set(phoneNumberId, resolved);
  return resolved;
}

export function invalidateTenantCache(phoneNumberId: string): void {
  tenantCache.delete(phoneNumberId);
}

