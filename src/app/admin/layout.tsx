import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/server/auth/dal';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SignOutButton } from './sign-out-button';

export const metadata: Metadata = {
  title: 'Platform Admin | FrontLoop',
  robots: { index: false, follow: false },
};

/** Authoritative guard: the proxy only checks the JWT; this re-reads role and sessionVersion from the database. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo size="md" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#065F46] bg-[#ECFDF5] border border-[#047857]/25 px-2 py-0.5 rounded">
              Platform Admin
            </span>
          </div>
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
