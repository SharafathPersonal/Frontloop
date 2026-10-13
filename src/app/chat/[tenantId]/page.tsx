import { redirect } from 'next/navigation';

/** Short alias for the web front desk; the canonical chat lives under the tenant's hub. */
export default async function ChatAliasPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  redirect(`/d/${encodeURIComponent(tenantId)}/chat`);
}
