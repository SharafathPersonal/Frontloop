import Link from 'next/link';
import { Globe, MessageCircle, QrCode } from 'lucide-react';
import { requireTenant } from '@/server/auth/dal';
import { forTenant } from '@/server/repos/tenant';
import { isSubscriptionLive } from '@/server/quota';
import { SITE_URL } from '@/lib/config';
import { QrKit } from '@/components/front-desk/qr-kit';

export const metadata = {
  title: 'Front Desk & QR Kit | FrontLoop',
};

export default async function FrontDeskQrPage() {
  const session = await requireTenant(['owner', 'staff']);
  const tenant = await forTenant(session.tenantId).getTenant();
  const hubUrl = `${SITE_URL}/d/${session.tenantId}`;
  const whatsappConnected = tenant?.whatsapp?.status === 'connected';
  const webChatLive = isSubscriptionLive(tenant?.subscription);

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
          <QrCode className="text-[#047857]" size={24} aria-hidden="true" />
          Front Desk &amp; QR Kit
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] mt-1">
          One link and QR code for every customer: they choose WhatsApp or chat right in the browser. Both channels use
          the same knowledge base and the same AI reply allowance.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
          <MessageCircle size={16} aria-hidden="true" className={whatsappConnected ? 'text-[#047857]' : 'text-[#64748B]'} />
          <span>
            <strong className="text-[#0F172A]">WhatsApp button:</strong>{' '}
            {whatsappConnected ? (
              'shown, opens a chat with your connected number.'
            ) : (
              <>
                hidden until you{' '}
                <Link href="/dashboard/settings" className="text-[#047857] underline underline-offset-2">
                  connect WhatsApp
                </Link>
                .
              </>
            )}
          </span>
        </li>
        <li className="flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
          <Globe size={16} aria-hidden="true" className={webChatLive ? 'text-[#047857]' : 'text-[#64748B]'} />
          <span>
            <strong className="text-[#0F172A]">Web chat:</strong>{' '}
            {webChatLive ? (
              'live. Web chats appear in Leads with a Web tag.'
            ) : (
              <>
                offline because your plan has ended.{' '}
                <Link href="/dashboard/settings" className="text-[#047857] underline underline-offset-2">
                  Renew in Settings
                </Link>
                .
              </>
            )}
          </span>
        </li>
      </ul>

      <QrKit businessName={tenant?.name ?? 'Front desk'} hubUrl={hubUrl} />
    </div>
  );
}
