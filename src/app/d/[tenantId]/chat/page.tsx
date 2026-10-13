import type { Metadata } from 'next';
import { getPublicTenant } from '@/server/repos/public-tenant';
import { readGuestSession } from '@/server/auth/guest-session';
import { getWebChatHistory } from '@/server/web-chat';
import { OfflineDesk } from '@/components/front-desk/offline-desk';
import WebChatInterface from './web-chat-interface';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ tenantId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getPublicTenant((await params).tenantId);
  return {
    title: tenant ? `Chat with ${tenant.name} | Front Desk` : 'Front Desk Offline | FrontLoop',
    robots: { index: false, follow: false },
  };
}

export default async function WebChatPage({ params }: Props) {
  const tenant = await getPublicTenant((await params).tenantId);
  if (!tenant || !tenant.live) return <OfflineDesk whatsappNumber={tenant?.whatsappNumber} />;

  // An existing guest session resumes server-side: no loading flash, no client token handling.
  const session = await readGuestSession(tenant.id);
  const history = session ? await getWebChatHistory(session) : null;

  return (
    <WebChatInterface
      tenant={{ id: tenant.id, name: tenant.name, timezone: tenant.timezone, whatsappNumber: tenant.whatsappNumber }}
      initialSession={session && history ? { name: session.name, ...history } : null}
    />
  );
}
