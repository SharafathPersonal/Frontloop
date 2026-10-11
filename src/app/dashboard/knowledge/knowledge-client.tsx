'use client';

import { useId, useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  Bot,
  MessageSquare,
  Sparkles,
  Clock,
  Briefcase,
  HelpCircle,
  Play,
  RotateCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { saveKnowledgeBaseAction, testBotSimulationAction } from './actions';
import type { AIPipelineOutput } from '@/server/ai-pipeline';

interface Slot {
  open: string;
  close: string;
}

interface Faq {
  question: string;
  answer: string;
  enabled: boolean;
}

interface Service {
  name: string;
  description: string;
  priceMinor?: number;
  currency: string;
  durationMin?: number;
}

interface DayWeekly {
  day: number;
  closed: boolean;
  slots: Slot[];
}

interface KnowledgeClientProps {
  initialData: {
    context?: string;
    faqs?: Faq[];
    services?: Service[];
    hours?: {
      weekly?: DayWeekly[];
    };
    bot?: {
      persona?: string;
      fallbackReply?: string;
      handoffKeywords?: string[];
      languages?: string[];
      captureFields?: Array<'name' | 'requirement' | 'preferred_time' | 'email'>;
    };
  } | null;
}

const DEFAULT_SLOT: Slot = { open: '09:00', close: '18:00' };

type SaveStatus = { kind: 'success' | 'error'; message: string };

interface FaqErrors {
  question?: string;
  answer?: string;
}

interface ServiceErrors {
  name?: string;
}

const isBlankFaq = (f: Faq) => !f.question.trim() && !f.answer.trim();

const isBlankService = (s: Service) => !s.name.trim() && !s.description.trim() && s.priceMinor == null;

/** Blank rows are dropped on save; only partially filled rows produce errors. */
function getFaqErrors(f: Faq): FaqErrors {
  if (isBlankFaq(f)) return {};
  return {
    question: f.question.trim() ? undefined : 'Question is required',
    answer: f.answer.trim() ? undefined : 'Answer is required',
  };
}

function getServiceErrors(s: Service): ServiceErrors {
  if (isBlankService(s)) return {};
  return { name: s.name.trim() ? undefined : 'Service name is required' };
}

const hasErrors = (e: FaqErrors | ServiceErrors) => Object.values(e).some(Boolean);

/** Empty or unparseable number input → undefined, so the field can be cleared. */
function parseNonNegative(raw: string, parse: (v: string) => number): number | undefined {
  if (raw.trim() === '') return undefined;
  const n = parse(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const inputBorder = (invalid: boolean) =>
  invalid ? 'border-rose-500 focus:border-rose-600' : 'border-[#E2E8F0]';

/** Returns an error message, or null when every open day has ordered, non-overlapping slots. */
function validateWeekly(weekly: DayWeekly[]): string | null {
  for (const d of weekly) {
    if (d.closed) continue;
    if (d.slots.length === 0) return `${DAYS_OF_WEEK[d.day]}: add a time slot or mark the day closed.`;
    const sorted = [...d.slots].sort((a, b) => a.open.localeCompare(b.open));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].open >= sorted[i].close) {
        return `${DAYS_OF_WEEK[d.day]}: ${sorted[i].open}–${sorted[i].close} must close after it opens (split overnight shifts across two days).`;
      }
      if (i > 0 && sorted[i].open < sorted[i - 1].close) {
        return `${DAYS_OF_WEEK[d.day]}: shifts ${sorted[i - 1].open}–${sorted[i - 1].close} and ${sorted[i].open}–${sorted[i].close} overlap.`;
      }
    }
  }
  return null;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function KnowledgeBaseClient({ initialData }: KnowledgeClientProps) {
  const uid = useId();

  // Freeform Context
  const [context, setContext] = useState(initialData?.context || '');

  // FAQs
  const [faqs, setFaqs] = useState<Faq[]>(initialData?.faqs || []);

  // Services
  const [services, setServices] = useState<Service[]>(initialData?.services || []);

  // Weekly Hours (0 to 6)
  const defaultWeekly: DayWeekly[] = DAYS_OF_WEEK.map((_, idx) => {
    const existing = initialData?.hours?.weekly?.find((w) => w.day === idx);
    if (existing) return existing;
    return {
      day: idx,
      closed: idx === 0, // Sunday closed by default
      slots: [DEFAULT_SLOT],
    };
  });
  const [weeklyHours, setWeeklyHours] = useState<DayWeekly[]>(defaultWeekly);

  const updateDay = (day: number, patch: (d: DayWeekly) => DayWeekly) =>
    setWeeklyHours((prev) => prev.map((d) => (d.day === day ? patch(d) : d)));

  // Bot Settings
  const [persona, setPersona] = useState(initialData?.bot?.persona || '');
  const [fallbackReply, setFallbackReply] = useState(
    initialData?.bot?.fallbackReply ||
      'Thanks for reaching out! Our team will get back to you shortly.',
  );
  const [handoffKeywordsStr, setHandoffKeywordsStr] = useState(
    (initialData?.bot?.handoffKeywords || ['human', 'agent', 'call me']).join(', '),
  );

  // Status & Notifications
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [showRowErrors, setShowRowErrors] = useState(false);

  const faqErrors = faqs.map(getFaqErrors);
  const serviceErrors = services.map(getServiceErrors);

  // Test Sandbox State
  const [testPrompt, setTestPrompt] = useState('Hi, what are your consultation timings and fees?');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simOutput, setSimOutput] = useState<AIPipelineOutput | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // Handlers for FAQs
  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '', enabled: true }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: keyof Faq, value: unknown) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  // Handlers for Services
  const addService = () => {
    setServices([
      ...services,
      { name: '', description: '', priceMinor: undefined, currency: 'INR', durationMin: undefined },
    ]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: keyof Service, value: unknown) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  // Save All
  const handleSave = async () => {
    if (faqErrors.some(hasErrors) || serviceErrors.some(hasErrors)) {
      setShowRowErrors(true);
      setSaveStatus({ kind: 'error', message: 'Fix the highlighted services and FAQs before saving.' });
      return;
    }

    const hoursError = validateWeekly(weeklyHours);
    if (hoursError) {
      setSaveStatus({ kind: 'error', message: hoursError });
      return;
    }

    const cleanFaqs = faqs.filter((f) => !isBlankFaq(f));
    const cleanServices = services.filter((svc) => !isBlankService(svc));

    setIsSaving(true);
    setSaveStatus(null);

    const handoffKeywords = handoffKeywordsStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const res = await saveKnowledgeBaseAction({
      context,
      faqs: cleanFaqs,
      services: cleanServices,
      hours: {
        weekly: weeklyHours.map((d) => ({
          ...d,
          slots: d.closed ? [] : [...d.slots].sort((a, b) => a.open.localeCompare(b.open)),
        })),
      },
      bot: {
        persona,
        fallbackReply,
        handoffKeywords,
        // Not editable here yet — round-trip the stored values instead of resetting them.
        languages: initialData?.bot?.languages ?? ['en'],
        captureFields: initialData?.bot?.captureFields ?? ['name', 'requirement'],
      },
    });

    setIsSaving(false);
    if (res.ok) {
      setFaqs(cleanFaqs);
      setServices(cleanServices);
      setShowRowErrors(false);
      setSaveStatus({ kind: 'success', message: 'Knowledge Base successfully saved and synced!' });
      setTimeout(() => setSaveStatus((cur) => (cur?.kind === 'success' ? null : cur)), 4000);
    } else {
      setSaveStatus({ kind: 'error', message: res.error });
    }
  };

  // Run Simulation
  const handleSimulate = async () => {
    if (!testPrompt.trim()) return;
    setIsSimulating(true);
    setSimError(null);
    setSimOutput(null);

    const res = await testBotSimulationAction(testPrompt);
    setIsSimulating(false);
    if (res.ok && res.output) {
      setSimOutput(res.output);
    } else {
      setSimError(res.error || 'Failed to simulate reply');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <BookOpen className="text-[#0AAF76]" size={24} />
            Business Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Equip your WhatsApp AI agent with official services, operational timings, and business intelligence.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-[#0AAF76] text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#089163] transition-all disabled:opacity-50"
        >
          {isSaving ? <RotateCw className="animate-spin" size={14} /> : <Save size={14} />}
          {isSaving ? 'Saving...' : 'Save Knowledge Base'}
        </button>
      </div>

      <div aria-live="polite">
        {saveStatus && (
          <div
            role={saveStatus.kind === 'error' ? 'alert' : 'status'}
            className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 ${
              saveStatus.kind === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {saveStatus.kind === 'error' ? (
              <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle size={16} className="shrink-0" aria-hidden="true" />
            )}
            {saveStatus.message}
          </div>
        )}
      </div>

      {/* Grid: Context & Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Context + Bot Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Context */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[#0AAF76]" />
              Business Context & Overview
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Write background information about your establishment, mission, policies, address, doctor/trainer credentials, or parking.
            </p>

            <textarea
              id={`${uid}-context`}
              aria-label="Business context and overview"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={8000}
              rows={6}
              placeholder="e.g. Dr. Sharma's Dental Care is a premier cosmetic dentistry clinic located in Indiranagar, Bangalore. We specialize in painless implants, root canal treatments, and teeth whitening..."
              className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl p-3 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0AAF76] resize-y"
            />
            <div className="text-right text-[10px] text-[#64748B] mt-1 font-mono">
              {context.length} / 8,000 characters
            </div>
          </div>

          {/* Bot Persona & Fallback */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
              <Bot size={16} className="text-[#0AAF76]" />
              Bot Tone & Handoff Settings
            </h2>

            <div className="space-y-1">
              <label htmlFor={`${uid}-persona`} className="text-xs font-semibold text-[#0F172A]">AI Agent Persona</label>
              <input
                id={`${uid}-persona`}
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                maxLength={500}
                placeholder="e.g. Compassionate and calm clinical assistant speaking in simple, professional English."
                className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0AAF76]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${uid}-fallback`} className="text-xs font-semibold text-[#0F172A]">Fallback Reply (When Unsure)</label>
              <input
                id={`${uid}-fallback`}
                type="text"
                value={fallbackReply}
                onChange={(e) => setFallbackReply(e.target.value)}
                maxLength={500}
                className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0AAF76]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor={`${uid}-handoff`} className="text-xs font-semibold text-[#0F172A]">Handoff Keywords (Comma-Separated)</label>
              <input
                id={`${uid}-handoff`}
                aria-describedby={`${uid}-handoff-hint`}
                type="text"
                value={handoffKeywordsStr}
                onChange={(e) => setHandoffKeywordsStr(e.target.value)}
                placeholder="human, agent, talk to doctor, receptionist"
                className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#0AAF76]"
              />
              <p id={`${uid}-handoff-hint`} className="text-[10px] text-[#64748B]">When a customer types these words, the bot automatically pauses for human takeover.</p>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Test Sandbox */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-[#0AAF76]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
              Test Your Bot Sandbox
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mb-4">
            Simulate how your AI agent responds to customer questions without dispatching WhatsApp messages.
          </p>

          <div className="space-y-2 mb-4">
            <label htmlFor={`${uid}-test-prompt`} className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">Customer Question</label>
            <textarea
              id={`${uid}-test-prompt`}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={3}
              className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0AAF76]"
            />
          </div>

          <button
            type="button"
            onClick={handleSimulate}
            disabled={isSimulating || !testPrompt.trim()}
            className="flex items-center justify-center gap-2 w-full bg-[#0AAF76] text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#089163] transition-colors disabled:opacity-50 mb-4"
          >
            {isSimulating ? <RotateCw className="animate-spin" size={14} /> : <Play size={14} />}
            {isSimulating ? 'Simulating...' : 'Test Bot Response'}
          </button>

          {/* Simulation Output Card */}
          <div
            aria-live="polite"
            aria-busy={isSimulating}
            className="flex-1 bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl p-3 text-xs overflow-y-auto min-h-[160px]"
          >
            {simError && (
              <p role="alert" className="text-rose-600 font-semibold flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                {simError}
              </p>
            )}
            {simOutput && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">AI Generated Reply</span>
                  <p className="text-[#0F172A] whitespace-pre-wrap mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-[#E2E8F0]">
                    {simOutput.replyText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B] block">Intent:</span>
                    <span className="font-semibold uppercase text-emerald-700">{simOutput.extractedIntent || 'enquiry'}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Provider:</span>
                    <span className="font-semibold uppercase text-indigo-700">{simOutput.providerUsed}</span>
                  </div>
                </div>

                {simOutput.handoff && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                    Handoff requested — on WhatsApp the bot would pause for your staff.
                  </p>
                )}

                {simOutput.extractedRequirement && (
                  <div className="text-[11px]">
                    <span className="text-[#64748B] block">Extracted Need:</span>
                    <span className="text-[#0F172A] font-medium">{simOutput.extractedRequirement}</span>
                  </div>
                )}
              </div>
            )}
            {!simOutput && !simError && !isSimulating && (
              <p className="text-[#64748B] italic text-center py-8">
                Enter a question above and click test to preview agent answers.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Services Catalogue */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
              <Briefcase size={16} className="text-[#0AAF76]" />
              Services, Treatments & Catalogue
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Specific offerings with fees and appointment durations that the AI references during booking inquiries.
            </p>
          </div>
          <button
            type="button"
            onClick={addService}
            className="flex items-center gap-1.5 bg-[#F8FAFC] text-[#0F172A] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#E2E8F0] transition-colors"
          >
            <Plus size={14} /> Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <p className="text-xs text-[#64748B] italic py-3 text-center border border-dashed border-[#E2E8F0] rounded-xl">
            No services listed yet. Click &quot;Add Service&quot; to build your offerings.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((svc, idx) => {
              const nameError = showRowErrors ? serviceErrors[idx].name : undefined;
              const fieldId = `${uid}-svc-${idx}`;
              return (
                <div
                  key={idx}
                  className="p-3 bg-[#F8FAFC]/40 border border-[#E2E8F0] rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3"
                >
                  <div className="flex-1 w-full md:w-auto">
                    <input
                      id={`${fieldId}-name`}
                      type="text"
                      value={svc.name}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      maxLength={120}
                      aria-label={`Service ${idx + 1} name`}
                      aria-invalid={nameError ? true : undefined}
                      aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
                      placeholder="Service Name (e.g. Root Canal Treatment)"
                      className={`w-full bg-white border ${inputBorder(!!nameError)} rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-medium`}
                    />
                    {nameError && (
                      <p id={`${fieldId}-name-error`} className="text-[11px] text-rose-600 font-medium mt-1">
                        {nameError}
                      </p>
                    )}
                    <input
                      id={`${fieldId}-description`}
                      type="text"
                      value={svc.description || ''}
                      onChange={(e) => updateService(idx, 'description', e.target.value)}
                      maxLength={500}
                      aria-label={`Service ${idx + 1} description`}
                      placeholder="Brief description or inclusion details"
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#64748B] mt-1.5"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="w-28">
                      <label htmlFor={`${fieldId}-price`} className="text-[10px] text-[#64748B] uppercase block">Price (₹)</label>
                      <input
                        id={`${fieldId}-price`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={svc.priceMinor != null ? svc.priceMinor / 100 : ''}
                        onChange={(e) => {
                          const rupees = parseNonNegative(e.target.value, parseFloat);
                          updateService(idx, 'priceMinor', rupees == null ? undefined : Math.round(rupees * 100));
                        }}
                        placeholder="₹"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#0F172A]"
                      />
                    </div>

                    <div className="w-24">
                      <label htmlFor={`${fieldId}-duration`} className="text-[10px] text-[#64748B] uppercase block">Duration (min)</label>
                      <input
                        id={`${fieldId}-duration`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={svc.durationMin ?? ''}
                        onChange={(e) =>
                          updateService(idx, 'durationMin', parseNonNegative(e.target.value, (v) => parseInt(v, 10)))
                        }
                        placeholder="Mins"
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#0F172A]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeService(idx)}
                      className="text-[#64748B] hover:text-rose-600 p-2 mt-3"
                      aria-label={`Delete service ${idx + 1}`}
                      title="Delete service"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Frequently Asked Questions (FAQs) */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
              <HelpCircle size={16} className="text-[#0AAF76]" />
              Structured FAQs
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Specific Q&amp;A pairs used directly by the AI to answer recurring customer inquiries accurately.
            </p>
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="flex items-center gap-1.5 bg-[#F8FAFC] text-[#0F172A] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#E2E8F0] transition-colors"
          >
            <Plus size={14} /> Add FAQ
          </button>
        </div>

        {faqs.length === 0 ? (
          <p className="text-xs text-[#64748B] italic py-3 text-center border border-dashed border-[#E2E8F0] rounded-xl">
            No FAQs added yet. Add common questions to speed up customer resolution.
          </p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const errors: FaqErrors = showRowErrors ? faqErrors[idx] : {};
              const fieldId = `${uid}-faq-${idx}`;
              return (
                <div
                  key={idx}
                  className="p-3 bg-[#F8FAFC]/40 border border-[#E2E8F0] rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-full">
                      <input
                        id={`${fieldId}-question`}
                        type="text"
                        value={faq.question}
                        onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                        maxLength={300}
                        aria-label={`FAQ ${idx + 1} question`}
                        aria-invalid={errors.question ? true : undefined}
                        aria-describedby={errors.question ? `${fieldId}-question-error` : undefined}
                        placeholder="Question (e.g. Do you accept health insurance?)"
                        className={`w-full bg-white border ${inputBorder(!!errors.question)} rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-semibold`}
                      />
                      {errors.question && (
                        <p id={`${fieldId}-question-error`} className="text-[11px] text-rose-600 font-medium mt-1">
                          {errors.question}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <label htmlFor={`${fieldId}-enabled`} className="flex items-center gap-1 text-[11px] text-[#64748B] cursor-pointer">
                        <input
                          id={`${fieldId}-enabled`}
                          type="checkbox"
                          checked={faq.enabled}
                          onChange={(e) => updateFaq(idx, 'enabled', e.target.checked)}
                          className="rounded"
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => removeFaq(idx)}
                        className="text-[#64748B] hover:text-rose-600 p-1"
                        aria-label={`Remove FAQ ${idx + 1}`}
                        title="Remove FAQ"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    id={`${fieldId}-answer`}
                    value={faq.answer}
                    onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                    rows={2}
                    maxLength={2000}
                    aria-label={`FAQ ${idx + 1} answer`}
                    aria-invalid={errors.answer ? true : undefined}
                    aria-describedby={errors.answer ? `${fieldId}-answer-error` : undefined}
                    placeholder="Answer to this question"
                    className={`w-full bg-white border ${inputBorder(!!errors.answer)} rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A]`}
                  />
                  {errors.answer && (
                    <p id={`${fieldId}-answer-error`} className="text-[11px] text-rose-600 font-medium">
                      {errors.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Operating Hours */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <Clock size={16} className="text-[#0AAF76]" />
            Weekly Operating Schedule
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            The AI automatically informs customers whether your business is currently open or when you reopen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DAYS_OF_WEEK.map((dayName, idx) => {
            const dayConfig = weeklyHours.find((w) => w.day === idx)!;

            const setSlot = (slotIdx: number, field: keyof Slot, value: string) =>
              updateDay(idx, (d) => ({
                ...d,
                slots: d.slots.map((sl, i) => (i === slotIdx ? { ...sl, [field]: value } : sl)),
              }));

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs ${
                  dayConfig.closed
                    ? 'bg-[#F8FAFC]/30 border-[#E2E8F0] opacity-70'
                    : 'bg-white border-[#E2E8F0]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#0F172A]">{dayName}</span>
                  <label htmlFor={`${uid}-day-${idx}-closed`} className="text-[10px] text-[#64748B] flex items-center gap-1 cursor-pointer">
                    <input
                      id={`${uid}-day-${idx}-closed`}
                      type="checkbox"
                      aria-label={`${dayName} closed`}
                      checked={dayConfig.closed}
                      onChange={(e) =>
                        updateDay(idx, (d) => ({
                          ...d,
                          closed: e.target.checked,
                          slots: !e.target.checked && d.slots.length === 0 ? [DEFAULT_SLOT] : d.slots,
                        }))
                      }
                    />
                    Closed
                  </label>
                </div>

                {!dayConfig.closed && (
                  <div className="space-y-1.5">
                    {dayConfig.slots.map((slot, slotIdx) => (
                      <div key={slotIdx} className="flex items-center gap-1 text-[11px]">
                        <input
                          type="time"
                          value={slot.open}
                          onChange={(e) => setSlot(slotIdx, 'open', e.target.value)}
                          aria-label={`${dayName} shift ${slotIdx + 1} opens`}
                          className="bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded px-1.5 py-0.5"
                        />
                        <span>–</span>
                        <input
                          type="time"
                          value={slot.close}
                          onChange={(e) => setSlot(slotIdx, 'close', e.target.value)}
                          aria-label={`${dayName} shift ${slotIdx + 1} closes`}
                          className="bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded px-1.5 py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateDay(idx, (d) => ({ ...d, slots: d.slots.filter((_, i) => i !== slotIdx) }))
                          }
                          aria-label={`Remove ${dayName} shift ${slotIdx + 1}`}
                          className="ml-auto text-[#64748B] hover:text-rose-600 p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {dayConfig.slots.length < 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDay(idx, (d) => {
                            const last = d.slots[d.slots.length - 1];
                            // Suggest the afternoon half of a split shift after the existing one.
                            const next = !last
                              ? DEFAULT_SLOT
                              : last.close < '16:30'
                                ? { open: '16:30', close: '20:30' }
                                : { open: last.close, close: '23:59' };
                            return { ...d, slots: [...d.slots, next] };
                          })
                        }
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#0AAF76] hover:text-[#0F172A]"
                      >
                        <Plus size={11} /> Add split shift
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
