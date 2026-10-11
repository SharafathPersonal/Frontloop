import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Clock,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  const liveDemoWhatsAppNumber = '919876543210';
  const liveDemoUrl = `https://wa.me/${liveDemoWhatsAppNumber}?text=${encodeURIComponent(
    'Hi True Attendly, I want to test your 24/7 AI Receptionist demo for my clinic/business.',
  )}`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#3E3B36] flex flex-col font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E8E3DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-sm tracking-wider">
              TA
            </div>
            <span className="font-bold text-base tracking-tight text-[#3E3B36]">
              True Attendly
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wider uppercase text-[#8B8378]">
            <a href="#benefits" className="hover:text-[#3E3B36] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#3E3B36] transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-[#3E3B36] transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-[#8B8378] hover:text-[#3E3B36] px-3 py-1.5 transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#3E3B36] text-[#F5F1EA] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#2B2925] transition-all shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-[#F5F1EA] border border-[#E8E3DA] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#8B8378] uppercase tracking-wider mb-6">
          <Sparkles size={12} className="text-[#C4A896]" />
          Purpose-Built for Clinics, Institutes, Salons &amp; Local SMBs
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#3E3B36] max-w-4xl mx-auto leading-[1.15]">
          24/7 AI Receptionist &amp; Lead Qualifier for{' '}
          <span className="text-[#B39380] underline decoration-[#E8E3DA] underline-offset-8">
            WhatsApp
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-[#8B8378] max-w-2xl mx-auto mt-6 leading-relaxed">
          Never miss patient appointments or student inquiries after hours. Instant bilingual responses, zero reception desk overload, and automated qualified lead capture.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <a
            href={liveDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
          >
            <MessageSquare size={16} />
            Try Live WhatsApp Demo
          </a>

          <Link
            href="/auth/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#3E3B36] text-[#F5F1EA] px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-[#2B2925] transition-all"
          >
            Start Free Trial <ArrowRight size={15} />
          </Link>
        </div>

        {/* Live Conversation Teaser Card */}
        <div className="mt-14 max-w-2xl mx-auto bg-white border border-[#E8E3DA] rounded-2xl shadow-xl shadow-stone-200/50 p-4 sm:p-6 text-left">
          <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div>
                <p className="text-xs font-bold text-[#3E3B36]">Indiranagar Dental &amp; Smile Care</p>
                <p className="text-[10px] text-emerald-600 font-medium">● Online 24/7 • Official WhatsApp Cloud</p>
              </div>
            </div>
            <span className="text-[10px] text-[#8B8378] font-mono">Simulated WhatsApp Flow</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex justify-end">
              <div className="bg-[#E8E3DA]/60 text-[#3E3B36] rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%]">
                Hi! Do you have slots for scaling &amp; teeth cleaning tomorrow evening? Also how much does it cost?
              </div>
            </div>

            <div className="flex justify-start">
              <div className="bg-[#3E3B36] text-[#F5F1EA] rounded-2xl rounded-tl-none px-3.5 py-2.5 max-w-[85%]">
                Hello! Yes, Dr. Sharma has open consultation slots tomorrow between <strong>5:30 PM and 7:00 PM</strong>.<br /><br />
                Our Ultrasonic Teeth Cleaning &amp; Polishing is <strong>₹1,200</strong> (takes approx. 45 mins).<br /><br />
                May I know your full name so I can hold a 6:00 PM slot for you?
              </div>
            </div>

            <div className="flex justify-end">
              <div className="bg-[#E8E3DA]/60 text-[#3E3B36] rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%]">
                Rahul Verma. 6 PM works great!
              </div>
            </div>

            <div className="flex justify-start">
              <div className="bg-[#3E3B36] text-[#F5F1EA] rounded-2xl rounded-tl-none px-3.5 py-2 max-w-[85%]">
                Booked for Rahul Verma! We have logged your appointment request for tomorrow at 6:00 PM. Our clinic team has also been notified. See you tomorrow!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section id="benefits" className="py-16 bg-[#F5F1EA]/60 border-y border-[#E8E3DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3E3B36]">
              Built Specifically for Offline Front Desks
            </h2>
            <p className="text-xs sm:text-sm text-[#8B8378] mt-2">
              Transform your WhatsApp from an unread inbox into an autonomous business agent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36]">
                <Clock size={20} className="text-[#C4A896]" />
              </div>
              <h3 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider">
                Instant 24/7 Response
              </h3>
              <p className="text-xs text-[#8B8378] leading-relaxed">
                68% of inquiries arrive after 7 PM or on Sundays. The AI responds in under 3 seconds, ensuring prospective clients never call your competitors while your staff is away.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36]">
                <Bot size={20} className="text-[#C4A896]" />
              </div>
              <h3 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider">
                Bilingual &amp; Natural Tone
              </h3>
              <p className="text-xs text-[#8B8378] leading-relaxed">
                Seamlessly understands conversational English and regional phrasing (Manglish, Hinglish). Never feels like a rigid robot, speaking with warmth and clinical empathy.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 shadow-sm space-y-3">
              <div className="h-10 w-10 rounded-xl bg-[#F5F1EA] flex items-center justify-center text-[#3E3B36]">
                <Users size={20} className="text-[#C4A896]" />
              </div>
              <h3 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider">
                Automated Lead Qualification
              </h3>
              <p className="text-xs text-[#8B8378] leading-relaxed">
                Automatically extracts customer name, primary requirement, and intent (pricing, appointment, admission). Syncs directly into your dashboard with 1-click human takeover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3E3B36]">
            Three Steps to 24/7 Autopilot
          </h2>
          <p className="text-xs sm:text-sm text-[#8B8378] mt-2">
            No complex coding or phone line hardware required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-base mx-auto">
              1
            </div>
            <h3 className="text-sm font-bold text-[#3E3B36]">Connect WhatsApp Number</h3>
            <p className="text-xs text-[#8B8378]">
              Link your official WhatsApp Business Cloud API in Settings with Meta verification in minutes.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-base mx-auto">
              2
            </div>
            <h3 className="text-sm font-bold text-[#3E3B36]">Input Business Knowledge</h3>
            <p className="text-xs text-[#8B8378]">
              Add your clinic timings, service fees, doctor profiles, and FAQs in the Knowledge Base editor.
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center font-bold text-base mx-auto">
              3
            </div>
            <h3 className="text-sm font-bold text-[#3E3B36]">Watch Leads Convert</h3>
            <p className="text-xs text-[#8B8378]">
              Your AI answers queries, gathers details, and logs leads in your live pipeline with instant takeover.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-[#F5F1EA]/60 border-t border-[#E8E3DA]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3E3B36]">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xs sm:text-sm text-[#8B8378] mt-2">
              Done-for-you WhatsApp AI automation with zero hidden server maintenance fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white rounded-2xl border border-[#E8E3DA] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8378] bg-[#F5F1EA] px-2.5 py-1 rounded">
                  Starter Plan
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#3E3B36]">₹1,499</span>
                  <span className="text-xs text-[#8B8378]">/ month</span>
                </div>
                <p className="text-xs text-[#8B8378] mt-2">
                  Ideal for single-location clinics, salons, and boutique coaching centers.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#3E3B36]">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Up to 1,000 AI replies/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Full Knowledge Base &amp; Services
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Real-time Lead Dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> 1-Click Human Takeover
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> CSV Leads Export
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 block text-center bg-[#F5F1EA] text-[#3E3B36] border border-[#E8E3DA] py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#E8E3DA] transition-colors"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Growth Plan */}
            <div className="bg-white rounded-2xl border-2 border-[#3E3B36] p-6 sm:p-8 shadow-md flex flex-col justify-between relative">
              <span className="absolute -top-3 right-6 bg-[#3E3B36] text-[#F5F1EA] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                Most Popular
              </span>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8378] bg-[#F5F1EA] px-2.5 py-1 rounded">
                  Growth Plan
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#3E3B36]">₹3,499</span>
                  <span className="text-xs text-[#8B8378]">/ month</span>
                </div>
                <p className="text-xs text-[#8B8378] mt-2">
                  For busy clinics, multi-specialty centers, and growing training institutes.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#3E3B36]">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Up to 3,000 AI replies/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Priority Multi-Tier LLM routing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Unlimited Services &amp; FAQs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Automated Intent Classification
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-600" /> Priority WhatsApp Support
                  </li>
                </ul>
              </div>

              <Link
                href="/auth/register"
                className="mt-8 block text-center bg-[#3E3B36] text-[#F5F1EA] py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#2B2925] transition-colors"
              >
                Get Started with Growth
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E8E3DA] py-8 bg-[#FDFBF7] text-xs text-[#8B8378]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} True Attendly. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#3E3B36]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#3E3B36]">
              Terms of Service
            </Link>
            <Link href="/auth/login" className="hover:text-[#3E3B36]">
              Merchant Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
