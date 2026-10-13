import { Phone, MessageCircle, Mail } from 'lucide-react';
import { requireTenant } from '@/server/auth/dal';
import { CONTACT, whatsappLink } from '@/lib/config';

export default async function SupportPage() {
  await requireTenant();

  return (
    <div className="max-w-4xl mx-auto pb-12">

      <div className="mb-8">
        <h1 className="serif-headline text-2xl md:text-3xl text-[#0F172A]">Support</h1>
        <p className="text-sm text-[#64748B] mt-2">Direct lines to the FrontLoop team in {CONTACT.location}.</p>
      </div>

      <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 md:p-8 flex flex-col">
          <h2 className="serif-headline text-2xl text-[#0F172A] mb-3">Talk to the team</h2>
          <p className="text-sm text-[#64748B] leading-relaxed font-sans mb-8">
            Setup, WhatsApp connection, or billing question? We respond {CONTACT.hours}. Your AI front desk keeps
            replying to customers around the clock.
          </p>

          <div className="mt-auto grid sm:grid-cols-3 gap-3">
            <a
              href={`tel:${CONTACT.phoneE164}`}
              className="flex items-center justify-center gap-2 w-full py-4 border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-[#FFFFFF] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
            >
              <Phone size={14} />
              CALL {CONTACT.phoneDisplay}
            </a>
            <a
              href={whatsappLink('Hi FrontLoop, I need help with my dashboard.')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-[#0B1120] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
            >
              <MessageCircle size={14} />
              WHATSAPP HELP
            </a>
            <a
              href={`mailto:${CONTACT.email}`}
              className="flex items-center justify-center gap-2 w-full py-4 border border-[#E2E8F0] text-[#0F172A] hover:border-[#0F172A] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
            >
              <Mail size={14} />
              EMAIL US
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
