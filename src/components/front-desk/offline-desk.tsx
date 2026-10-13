import Link from 'next/link';
import { MoonStar } from 'lucide-react';

/** Unknown tenant, or a tenant whose trial or plan has lapsed. Never reveals which. */
export function OfflineDesk({ whatsappNumber }: { whatsappNumber?: string | null }) {
  return (
    <main className="min-h-[100dvh] bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-[#64748B]">
          <MoonStar size={26} aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#0F172A]">Front Desk Offline</h1>
        <p className="text-sm text-[#64748B] leading-relaxed">
          This front desk is not taking chats right now. Please contact the business directly.
        </p>
        {whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=Hi`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[#047857] hover:bg-[#065F46] text-white py-3 text-sm font-bold transition-colors"
          >
            Message on WhatsApp
          </a>
        )}
        <Link href="/" className="block text-xs text-[#64748B] hover:text-[#0F172A]">
          Powered by FrontLoop
        </Link>
      </div>
    </main>
  );
}
