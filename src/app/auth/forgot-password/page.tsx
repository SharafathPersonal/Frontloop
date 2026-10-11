import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const metadata: Metadata = {
  title: 'Password Recovery | FrontLoop',
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <Link href="/" aria-label="FrontLoop home" className="inline-flex items-center mb-6">
            <BrandLogo size="lg" priority />
          </Link>
          <h1 className="serif-headline text-2xl text-[#0F172A] mb-2">Password Recovery</h1>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8 text-center space-y-4">
          <p className="text-sm text-[#0F172A] leading-relaxed">
            Password reset by email is coming soon.
          </p>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Contact the FrontLoop team at{' '}
            <a href="mailto:support@frontloop.online" className="text-[#0F172A] underline underline-offset-2">
              support@frontloop.online
            </a>{' '}
            from your registered email address to reset your password.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="text-xs tracking-[0.15em] text-[#64748B] hover:text-[#0AAF76] transition-colors uppercase"
          >
            ← Back to sign in
          </Link>
        </div>

      </div>
    </main>
  );
}
