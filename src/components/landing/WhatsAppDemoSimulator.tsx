'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, ShieldCheck } from 'lucide-react';

type ChatLine = {
  from: 'customer' | 'bot';
  time: string;
  meta: string;
  body: React.ReactNode;
};

const SCRIPT: ChatLine[] = [
  {
    from: 'customer',
    time: '10:45 PM',
    meta: '✓✓',
    body: 'Hi! Nale evening dermatologist Dr. Priya available aano? Consultation fee ethraya?',
  },
  {
    from: 'bot',
    time: '10:45 PM',
    meta: 'Replied in seconds',
    body: (
      <>
        Hello! Yes, Dr. Priya (Dermatologist) has consultation slots tomorrow from <strong>5:00 PM to 8:30 PM</strong>.
        <br />
        <br />
        The consultation fee is <strong>₹600</strong>. May I have your name and a preferred time?
      </>
    ),
  },
  {
    from: 'customer',
    time: '10:46 PM',
    meta: '✓✓',
    body: 'Name is Anjali Nair. Around 6:00 PM would be perfect.',
  },
  {
    from: 'bot',
    time: '10:46 PM',
    meta: 'Lead captured to dashboard',
    body: (
      <>
        Thank you, <strong>Anjali Nair</strong>! I have noted your request for Dr. Priya tomorrow around 6:00 PM. Our
        front desk will message you in the morning to confirm the slot.
        <br />
        <br />
        📍 2nd Floor, Mavoor Road, Calicut.
      </>
    ),
  },
];

const STEP_MS = 1400;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function WhatsAppDemoSimulator() {
  // SSR renders the full conversation so crawlers and no-JS visitors see it; the client replays it.
  const [visible, setVisible] = useState(SCRIPT.length);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers: number[] = [window.setTimeout(() => setVisible(1), 0)];
    for (let i = 2; i <= SCRIPT.length; i++) {
      timers.push(window.setTimeout(() => setVisible(i), STEP_MS * (i - 1)));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [run]);

  const typing = visible < SCRIPT.length && SCRIPT[visible].from === 'bot';

  return (
    <div className="max-w-2xl mx-auto bg-white border border-[#E2E8F0] rounded-3xl shadow-xl p-4 sm:p-6 text-left relative overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-full bg-[#047857] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            AI
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5 truncate">
              Sharma Multi-Specialty Clinic
              <ShieldCheck size={13} className="text-[#047857] shrink-0" />
            </p>
            <p className="text-[10px] text-[#047857] font-medium">● Example chat • AI front desk</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-[#64748B] font-mono block">10:45 PM (after hours)</span>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="inline-flex items-center gap-1 text-[10px] text-[#047857] font-bold uppercase tracking-wider hover:underline cursor-pointer"
          >
            <RotateCcw size={10} /> Replay
          </button>
        </div>
      </div>

      <div className="space-y-3.5 text-xs leading-relaxed min-h-[300px]" aria-live="polite">
        {SCRIPT.slice(0, visible).map((line, i) =>
          line.from === 'customer' ? (
            <div key={`${run}-${i}`} className="flex justify-end chat-pop">
              <div className="bg-[#F1F5F9] text-[#0F172A] rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] border border-[#E2E8F0] shadow-sm">
                {line.body}
                <div className="text-right text-[9px] text-[#64748B] mt-1">
                  {line.time} {line.meta}
                </div>
              </div>
            </div>
          ) : (
            <div key={`${run}-${i}`} className="flex justify-start chat-pop">
              <div className="bg-[#0F172A] text-white rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] shadow-md">
                {line.body}
                <div className="text-left text-[9px] text-[#34D399] mt-1.5 font-medium">
                  {line.time} • {line.meta}
                </div>
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex justify-start" aria-label="FrontLoop is typing">
            <div className="bg-[#0F172A] rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
