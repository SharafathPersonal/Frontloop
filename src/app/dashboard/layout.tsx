import { redirect } from 'next/navigation';
import { requireTenant } from '@/server/auth/dal';
import { BusinessTenant } from '@/server/models/BusinessTenant';
import DashboardShell from './dashboard-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTenant();
  const tenant = await BusinessTenant.findOne({ _id: session.tenantId })
    .select('name category whatsapp.status')
    .lean();
  if (!tenant) redirect('/auth/login');

  return (
    <DashboardShell
      tenant={{
        name: tenant.name,
        category: tenant.category,
        whatsappStatus: tenant.whatsapp?.status ?? 'disconnected',
      }}
    >
      {children}
    </DashboardShell>
  );
}
