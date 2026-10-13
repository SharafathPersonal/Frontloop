'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Headset, LogOut, SendHorizontal } from 'lucide-react';
import { TenantAvatar } from '@/components/front-desk/tenant-brand';
import { Spinner } from '@/components/ui/Spinner';
import { formatClock } from '@/lib/clock';
import { normalizeIndianMobile } from '@/lib/phone';
import type { WebChatMessage } from '@/server/web-chat';

const MAX_MESSAGE_CHARS = 2000;
const MAX_TEXTAREA_PX = 128;

interface Props {
  tenant: { id: string; name: string; timezone: string; whatsappNumber: string | null };
  initialSession: { name: string; messages: WebChatMessage[]; botPaused: boolean } | null;
}

type ChatResponse = {
  customerMessage?: WebChatMessage;
  reply?: WebChatMessage | null;
  botPaused?: boolean;
  notice?: string | null;
  error?: string;
};

const PAUSED_NOTICE = 'Our team will contact you on your phone shortly.';

export default function WebChatInterface({ tenant, initialSession }: Props) {
  const [guestName, setGuestName] = useState(initialSession?.name ?? null);
  const [messages, setMessages] = useState<WebChatMessage[]>(initialSession?.messages ?? []);
  const [notice, setNotice] = useState<string | null>(initialSession?.botPaused ? PAUSED_NOTICE : null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gate, setGate] = useState({ name: '', phone: '' });
  const [gateError, setGateError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Whether the reader is at the bottom of the feed; false once they scroll up to reread.
  const pinnedRef = useRef(true);

  // Keep the newest message (or the typing indicator) in view.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
    pinnedRef.current = true;
  }, [messages.length, sending, notice]);

  // Opening the on-screen keyboard shrinks the feed (100dvh + interactive-widget);
  // without this the latest messages would slide under the keyboard.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const onScroll = () => {
      pinnedRef.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 48;
    };
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) feed.scrollTop = feed.scrollHeight;
    });
    feed.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(feed);
    return () => {
      feed.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, [guestName]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  };

  const endSession = (message: string | null) => {
    setGuestName(null);
    setMessages([]);
    setNotice(null);
    setDraft('');
    setGateError(message);
  };

  const startChat = async (e: FormEvent) => {
    e.preventDefault();
    const name = gate.name.trim();
    if (name.length < 2 || name.length > 50) return setGateError('Name must be 2 to 50 characters.');
    if (!normalizeIndianMobile(gate.phone)) return setGateError('Enter a valid 10-digit mobile number.');

    setStarting(true);
    setGateError(null);
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant.id, name, phone: gate.phone }),
    }).catch(() => null);
    const data: { name?: string; error?: string } | null = await res?.json().catch(() => null);
    setStarting(false);

    if (!res?.ok) return setGateError(data?.error ?? 'Could not start the chat. Please try again.');
    setGuestName(data?.name ?? name);
  };

  const send = async (payload: { text?: string; requestHuman?: boolean }) => {
    if (sending) return;
    setSending(true);
    setError(null);

    // Optimistic bubble; replaced by the stored message (real id and server time) on success.
    const tempId = `pending-${Date.now()}`;
    const optimisticText = payload.text ?? 'I would like to talk to a person from your team.';
    setMessages((prev) => [...prev, { id: tempId, from: 'customer', body: optimisticText, createdAt: new Date().toISOString() }]);

    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant.id, ...payload }),
    }).catch(() => null);
    const data: ChatResponse | null = await res?.json().catch(() => null);
    setSending(false);

    if (res?.status === 401) return endSession(data?.error ?? 'Your chat session has ended. Please start again.');
    if (!res?.ok || !data?.customerMessage) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (payload.text) setDraft(payload.text);
      setError(data?.error ?? 'Message not sent. Check your connection and try again.');
      return;
    }

    const { customerMessage, reply } = data;
    setMessages((prev) => [...prev.filter((m) => m.id !== tempId), customerMessage, ...(reply ? [reply] : [])]);
    if (data.notice) setNotice(data.notice);
    else if (data.botPaused) setNotice(PAUSED_NOTICE);
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (text.length > MAX_MESSAGE_CHARS) return setError('Messages can be at most 2,000 characters.');
    setDraft('');
    requestAnimationFrame(resizeTextarea);
    void send({ text });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sends, Shift+Enter adds a line. Touch keyboards keep Enter as a newline
    // (their Send button is the submit). Never send mid-IME composition (Malayalam/Hindi input).
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    submitDraft();
  };

  const endChat = async () => {
    await fetch(`/api/chat/session?tenantId=${tenant.id}`, { method: 'DELETE' }).catch(() => null);
    endSession(null);
  };

  const header = (
    <header className="shrink-0 bg-[#FFFFFF] border-b border-[#E2E8F0] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 px-2 sm:px-4 h-14">
        <Link
          href={`/d/${tenant.id}`}
          aria-label={`Back to ${tenant.name}`}
          className="p-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <TenantAvatar name={tenant.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#0F172A] truncate">{tenant.name}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-[#065F46]">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" aria-hidden="true" />
            24/7 AI Receptionist
          </p>
        </div>
        {guestName && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void send({ requestHuman: true })}
              disabled={sending || notice !== null}
              aria-label="Talk to a person"
              title="Talk to a person"
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold text-[#065F46] hover:bg-[#ECFDF5] disabled:opacity-40 transition-colors"
            >
              <Headset size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Talk to a person</span>
            </button>
            <button
              type="button"
              onClick={() => void endChat()}
              aria-label="End chat"
              title="End chat"
              className="p-2 rounded-full text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );

  if (!guestName) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#F8FAFC]">
        {header}
        <main className="flex-1 overflow-y-auto px-4 py-8">
          <form onSubmit={startChat} className="w-full max-w-sm mx-auto bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-[#0F172A]">Start a chat</h1>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Share your name and mobile number so {tenant.name} can follow up if needed.
              </p>
            </div>

            {gateError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                {gateError}
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="chat-name" className="block text-xs font-semibold text-[#0F172A]">Your name</label>
              <input
                id="chat-name"
                type="text"
                required
                minLength={2}
                maxLength={50}
                autoComplete="name"
                value={gate.name}
                onChange={(e) => setGate({ ...gate, name: e.target.value })}
                disabled={starting}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-3 text-base text-[#0F172A] outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="chat-phone" className="block text-xs font-semibold text-[#0F172A]">Mobile number</label>
              <div className="flex rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/20">
                <span className="flex items-center pl-3.5 pr-2 text-base text-[#64748B] select-none" aria-hidden="true">+91</span>
                <input
                  id="chat-phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={14}
                  aria-describedby="chat-phone-hint"
                  value={gate.phone}
                  onChange={(e) => setGate({ ...gate, phone: e.target.value })}
                  disabled={starting}
                  placeholder="98765 43210"
                  className="min-w-0 flex-1 rounded-r-xl bg-transparent py-3 pr-3.5 text-base text-[#0F172A] outline-none"
                />
              </div>
              <p id="chat-phone-hint" className="text-[11px] text-[#64748B]">10-digit Indian mobile number.</p>
            </div>

            <button
              type="submit"
              disabled={starting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white py-3.5 text-sm font-bold transition-colors disabled:opacity-60"
            >
              {starting && <Spinner tone="light" />}
              {starting ? 'Starting chat...' : 'Start chat'}
            </button>

            <p className="text-[11px] text-[#64748B] leading-relaxed">
              By continuing you agree that {tenant.name} may contact you about your inquiry. See our{' '}
              <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
            </p>

            {tenant.whatsappNumber && (
              <a
                href={`https://wa.me/${tenant.whatsappNumber}?text=Hi`}
                className="block text-center text-xs font-semibold text-[#065F46] hover:underline"
              >
                Prefer WhatsApp? Chat there instead
              </a>
            )}
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#F8FAFC]">
      {header}

      <div
        ref={feedRef}
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${tenant.name}`}
        className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-3"
      >
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-[#FFFFFF] border border-[#E2E8F0] px-3.5 py-2.5 text-sm text-[#0F172A] shadow-sm">
            Hi {guestName}! I&apos;m the AI receptionist for {tenant.name}. Ask me about services, prices or timings.
          </div>
        </div>

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                m.from === 'customer'
                  ? 'rounded-tr-md bg-[#047857] text-white'
                  : 'rounded-tl-md bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-1 text-right text-[10px] ${m.from === 'customer' ? 'text-white/80' : 'text-[#64748B]'}`}>
                <time dateTime={m.createdAt}>{formatClock(m.createdAt, tenant.timezone)}</time>
              </p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start" role="status" aria-label={`${tenant.name} is typing`}>
            <div className="rounded-2xl rounded-tl-md bg-[#FFFFFF] border border-[#E2E8F0] px-4 py-3 flex gap-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#64748B] animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-[#64748B] animate-bounce [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-[#64748B] animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {notice && (
          <p role="status" className="mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
            {notice} You can keep adding details here.
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitDraft();
        }}
        className="shrink-0 bg-[#FFFFFF] border-t border-[#E2E8F0] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {error && (
          <p role="alert" className="mb-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <label htmlFor="chat-message" className="sr-only">Message {tenant.name}</label>
          <textarea
            id="chat-message"
            ref={textareaRef}
            rows={1}
            value={draft}
            maxLength={MAX_MESSAGE_CHARS}
            onChange={(e) => {
              setDraft(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            placeholder="Type your message..."
            className="min-w-0 flex-1 resize-none rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-base leading-6 text-[#0F172A] outline-none focus:border-[#047857] focus:bg-[#FFFFFF]"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-full bg-[#047857] hover:bg-[#065F46] text-white transition-colors disabled:opacity-40"
          >
            {sending ? <Spinner tone="light" /> : <SendHorizontal size={18} aria-hidden="true" />}
          </button>
        </div>
      </form>
    </div>
  );
}
