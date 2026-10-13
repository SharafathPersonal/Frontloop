import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Globe, MessageCircle } from 'lucide-react';
import { getPublicTenant } from '@/server/repos/public-tenant';
import { SITE_URL } from '@/lib/config';
import { OfflineDesk } from '@/components/front-desk/offline-desk';
import { ReceptionistBadge, TenantAvatar, categoryLabel } from '@/components/front-desk/tenant-brand';
import { ShareButton } from '@/components/front-desk/share-button';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ tenantId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getPublicTenant((await params).tenantId);
  return {
    title: tenant ? `${tenant.name} | Front Desk` : 'Front Desk Offline | FrontLoop',
    description: tenant ? `Chat with ${tenant.name} on WhatsApp or the web. Answers 24/7.` : undefined,
    // Tenant-controlled names on FrontLoop's domain: keep them out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function FrontDeskHubPage({ params }: Props) {
  const tenant = await getPublicTenant((await params).tenantId);
  if (!tenant) return <OfflineDesk />;

  const hubUrl = `${SITE_URL}/d/${tenant.id}`;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-[#ECFDF5] via-[#F8FAFC] to-[#F8FAFC] text-[#0F172A] flex flex-col">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex justify-end">
          <ShareButton title={tenant.name} text={`Chat with ${tenant.name}, answered 24/7`} url={hubUrl} />
        </div>

        <section className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-8">
          <TenantAvatar name={tenant.name} />
          <div className="space-y-1.5 max-w-full">
            <h1 className="text-2xl font-bold tracking-tight break-words">{tenant.name}</h1>
            <p className="text-sm text-[#64748B]">{categoryLabel(tenant.category)}</p>
          </div>
          <ReceptionistBadge />
          <p className="text-sm text-[#475569] leading-relaxed max-w-xs">
            Ask about services, prices and timings any time. Our AI receptionist replies in seconds and our team follows
            up when you need a person.
          </p>
        </section>

        <nav aria-label="Ways to contact us" className="space-y-3">
          {tenant.whatsappNumber && (
            <a
              href={`https://wa.me/${tenant.whatsappNumber}?text=Hi`}
              className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#047857] hover:bg-[#065F46] text-white py-4 text-base font-bold shadow-md transition-colors"
            >
              <MessageCircle size={22} aria-hidden="true" />
              Chat on WhatsApp
            </a>
          )}

          {tenant.live ? (
            <Link
              href={`/d/${tenant.id}/chat`}
              className={`flex items-center gap-3 w-full rounded-2xl border-2 px-4 py-4 transition-colors ${
                tenant.whatsappNumber
                  ? 'border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#047857]'
                  : 'border-[#047857] bg-[#047857] text-white hover:bg-[#065F46]'
              }`}
            >
              <Globe size={22} aria-hidden="true" className={tenant.whatsappNumber ? 'text-[#047857]' : ''} />
              <span className="text-left">
                <span className="block text-base font-bold">Chat on Web</span>
                <span className={`block text-xs ${tenant.whatsappNumber ? 'text-[#64748B]' : 'text-white/90'}`}>
                  No WhatsApp needed. Chat right here in your browser.
                </span>
              </span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 text-xs text-[#64748B]">
              <Clock size={14} aria-hidden="true" className="shrink-0" />
              Web chat is offline right now.{tenant.whatsappNumber ? ' You can still message us on WhatsApp.' : ''}
            </p>
          )}
        </nav>

        <p className="mt-6 text-center text-[11px] text-[#64748B]">
          Powered by{' '}
          <Link href="/" className="font-semibold text-[#065F46] hover:underline">
            FrontLoop
          </Link>
        </p>
      </div>
    </main>
  );
}
