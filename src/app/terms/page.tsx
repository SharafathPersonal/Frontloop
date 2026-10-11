import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-20 px-6 sm:px-12 md:px-24">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <Link href="/" aria-label="FrontLoop home" className="inline-flex mb-8"><BrandLogo size="sm" /></Link>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#0F172A] mb-4">Terms and Conditions</h1>
        </div>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Clause 1: Account Terms</h2>
          <p className="text-[#475569] leading-relaxed">
            Merchants are completely legally responsible for acquiring explicit opt-in permissions from customer contact lists prior to broadcast.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Clause 2: Credit Lifecycle</h2>
          <p className="text-[#475569] leading-relaxed">
            Credits operate on prepaid metrics and carry zero expiration locks.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-[#0F172A]">Clause 3: Suspensions</h2>
          <p className="text-[#475569] leading-relaxed">
            System admins retain active authority to trigger &apos;is_blocked&apos; flags on spam compliance breaches.
          </p>
        </section>
      </div>
    </div>
  );
}
