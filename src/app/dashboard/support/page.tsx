import { Phone, MessageCircle } from 'lucide-react';
import { requireTenant } from '@/server/auth/dal';

// TODO(phase-2): re-add the feedback/ticket form backed by MongoDB.
export default async function SupportPage() {
  await requireTenant();

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">

      <div className="mb-8">
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Founder Support</h1>
        <p className="text-sm text-[#8B8378] mt-2">Direct lines to the core founding team for critical assistance.</p>
      </div>

      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 md:p-8 flex flex-col">
          <h2 className="serif-headline text-2xl text-[#3E3B36] mb-3">24/7 Concierge Support</h2>
          <p className="text-sm text-[#8B8378] leading-relaxed font-sans mb-8">
            Have an urgent setup or billing question? Our founding team is available around the clock.
          </p>

          <div className="mt-auto grid sm:grid-cols-2 gap-3">
            <a
              href="tel:+916282560928"
              className="flex items-center justify-center gap-2 w-full py-4 border border-[#3E3B36] text-[#3E3B36] hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
            >
              <Phone size={14} />
              DIRECT VOICE LINE
            </a>
            <a
              href="https://wa.me/916282560928?text=Hello%20Sharafath,%20I%20need%20help%20with%20my%20Attendly%20Dashboard."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
            >
              <MessageCircle size={14} />
              WHATSAPP HELP
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
