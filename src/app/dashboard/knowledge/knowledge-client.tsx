'use client';

import { useState } from 'react';
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
      captureFields?: Array<'name' | 'requirement' | 'preferred_time' | 'email'>;
    };
  } | null;
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
      slots: [{ open: '09:00', close: '18:00' }],
    };
  });
  const [weeklyHours, setWeeklyHours] = useState<DayWeekly[]>(defaultWeekly);

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
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      { name: '', description: '', priceMinor: 50000, currency: 'INR', durationMin: 30 },
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
    setIsSaving(true);
    setSaveMessage(null);

    const handoffKeywords = handoffKeywordsStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const res = await saveKnowledgeBaseAction({
      context,
      faqs,
      services,
      hours: {
        weekly: weeklyHours,
        exceptions: [],
      },
      bot: {
        persona,
        fallbackReply,
        handoffKeywords,
        languages: ['en'],
        captureFields: ['name', 'requirement'],
      },
    });

    setIsSaving(false);
    if (res.ok) {
      setSaveMessage('Knowledge Base successfully saved and synced!');
      setTimeout(() => setSaveMessage(null), 4000);
    } else {
      setSaveMessage(`Error: ${res.error}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E3DA] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3E3B36] flex items-center gap-2">
            <BookOpen className="text-[#C4A896]" size={24} />
            Business Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-[#8B8378] mt-1">
            Equip your WhatsApp AI agent with official services, operational timings, and business intelligence.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 bg-[#3E3B36] text-[#F5F1EA] px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#2B2925] transition-all disabled:opacity-50"
        >
          {isSaving ? <RotateCw className="animate-spin" size={14} /> : <Save size={14} />}
          {isSaving ? 'Saving...' : 'Save Knowledge Base'}
        </button>
      </div>

      {saveMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 ${
            saveMessage.startsWith('Error')
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <CheckCircle size={16} />
          {saveMessage}
        </div>
      )}

      {/* Grid: Context & Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Context + Bot Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Context */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[#C4A896]" />
              Business Context & Overview
            </h2>
            <p className="text-xs text-[#8B8378] mb-4">
              Write background information about your establishment, mission, policies, address, doctor/trainer credentials, or parking.
            </p>

            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={8000}
              rows={6}
              placeholder="e.g. Dr. Sharma's Dental Care is a premier cosmetic dentistry clinic located in Indiranagar, Bangalore. We specialize in painless implants, root canal treatments, and teeth whitening..."
              className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl p-3 text-xs sm:text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] resize-y"
            />
            <div className="text-right text-[10px] text-[#8B8378] mt-1 font-mono">
              {context.length} / 8,000 characters
            </div>
          </div>

          {/* Bot Persona & Fallback */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
              <Bot size={16} className="text-[#C4A896]" />
              Bot Tone & Handoff Settings
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E3B36]">AI Agent Persona</label>
              <input
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                maxLength={500}
                placeholder="e.g. Compassionate and calm clinical assistant speaking in simple, professional English."
                className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E3B36]">Fallback Reply (When Unsure)</label>
              <input
                type="text"
                value={fallbackReply}
                onChange={(e) => setFallbackReply(e.target.value)}
                maxLength={500}
                className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3E3B36]">Handoff Keywords (Comma-Separated)</label>
              <input
                type="text"
                value={handoffKeywordsStr}
                onChange={(e) => setHandoffKeywordsStr(e.target.value)}
                placeholder="human, agent, talk to doctor, receptionist"
                className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-lg px-3 py-2 text-xs sm:text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
              />
              <p className="text-[10px] text-[#8B8378]">When a customer types these words, the bot automatically pauses for human takeover.</p>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Test Sandbox */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-[#C4A896]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36]">
              Test Your Bot Sandbox
            </h2>
          </div>
          <p className="text-xs text-[#8B8378] mb-4">
            Simulate how your AI agent responds to customer questions without dispatching WhatsApp messages.
          </p>

          <div className="space-y-2 mb-4">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8B8378]">Customer Question</label>
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={3}
              className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl p-2.5 text-xs text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
            />
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating || !testPrompt.trim()}
            className="flex items-center justify-center gap-2 w-full bg-[#C4A896] text-[#3E3B36] py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#B39380] transition-colors disabled:opacity-50 mb-4"
          >
            {isSimulating ? <RotateCw className="animate-spin" size={14} /> : <Play size={14} />}
            {isSimulating ? 'Simulating...' : 'Test Bot Response'}
          </button>

          {/* Simulation Output Card */}
          <div className="flex-1 bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl p-3 text-xs overflow-y-auto min-h-[160px]">
            {simError && <p className="text-rose-600 font-semibold">{simError}</p>}
            {simOutput && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8378] block">AI Generated Reply</span>
                  <p className="text-[#3E3B36] whitespace-pre-wrap mt-1 leading-relaxed bg-white p-2.5 rounded-lg border border-[#E8E3DA]">
                    {simOutput.replyText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#E8E3DA]">
                  <div>
                    <span className="text-[#8B8378] block">Intent:</span>
                    <span className="font-semibold uppercase text-emerald-700">{simOutput.extractedIntent || 'enquiry'}</span>
                  </div>
                  <div>
                    <span className="text-[#8B8378] block">Provider:</span>
                    <span className="font-semibold uppercase text-indigo-700">{simOutput.providerUsed}</span>
                  </div>
                </div>

                {simOutput.extractedRequirement && (
                  <div className="text-[11px]">
                    <span className="text-[#8B8378] block">Extracted Need:</span>
                    <span className="text-[#3E3B36] font-medium">{simOutput.extractedRequirement}</span>
                  </div>
                )}
              </div>
            )}
            {!simOutput && !simError && !isSimulating && (
              <p className="text-[#8B8378] italic text-center py-8">
                Enter a question above and click test to preview agent answers.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Services Catalogue */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
              <Briefcase size={16} className="text-[#C4A896]" />
              Services, Treatments & Catalogue
            </h2>
            <p className="text-xs text-[#8B8378] mt-0.5">
              Specific offerings with fees and appointment durations that the AI references during booking inquiries.
            </p>
          </div>
          <button
            onClick={addService}
            className="flex items-center gap-1.5 bg-[#F5F1EA] text-[#3E3B36] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#E8E3DA] transition-colors"
          >
            <Plus size={14} /> Add Service
          </button>
        </div>

        {services.length === 0 ? (
          <p className="text-xs text-[#8B8378] italic py-3 text-center border border-dashed border-[#E8E3DA] rounded-xl">
            No services listed yet. Click &quot;Add Service&quot; to build your offerings.
          </p>
        ) : (
          <div className="space-y-3">
            {services.map((svc, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F5F1EA]/40 border border-[#E8E3DA] rounded-xl flex flex-col md:flex-row items-start md:items-center gap-3"
              >
                <div className="flex-1 w-full md:w-auto">
                  <input
                    type="text"
                    value={svc.name}
                    onChange={(e) => updateService(idx, 'name', e.target.value)}
                    placeholder="Service Name (e.g. Root Canal Treatment)"
                    className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2.5 py-1.5 text-xs text-[#3E3B36] font-medium"
                  />
                  <input
                    type="text"
                    value={svc.description || ''}
                    onChange={(e) => updateService(idx, 'description', e.target.value)}
                    placeholder="Brief description or inclusion details"
                    className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2.5 py-1.5 text-xs text-[#8B8378] mt-1.5"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="w-28">
                    <label className="text-[10px] text-[#8B8378] uppercase block">Price (₹)</label>
                    <input
                      type="number"
                      value={svc.priceMinor != null ? svc.priceMinor / 100 : ''}
                      onChange={(e) =>
                        updateService(idx, 'priceMinor', Math.round(parseFloat(e.target.value || '0') * 100))
                      }
                      placeholder="₹"
                      className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2 py-1 text-xs text-[#3E3B36]"
                    />
                  </div>

                  <div className="w-24">
                    <label className="text-[10px] text-[#8B8378] uppercase block">Duration (min)</label>
                    <input
                      type="number"
                      value={svc.durationMin ?? ''}
                      onChange={(e) => updateService(idx, 'durationMin', parseInt(e.target.value || '0', 10))}
                      placeholder="Mins"
                      className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2 py-1 text-xs text-[#3E3B36]"
                    />
                  </div>

                  <button
                    onClick={() => removeService(idx)}
                    className="text-[#8B8378] hover:text-rose-600 p-2 mt-3"
                    title="Delete service"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frequently Asked Questions (FAQs) */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
              <HelpCircle size={16} className="text-[#C4A896]" />
              Structured FAQs
            </h2>
            <p className="text-xs text-[#8B8378] mt-0.5">
              Specific Q&amp;A pairs used directly by the AI to answer recurring customer inquiries accurately.
            </p>
          </div>
          <button
            onClick={addFaq}
            className="flex items-center gap-1.5 bg-[#F5F1EA] text-[#3E3B36] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#E8E3DA] transition-colors"
          >
            <Plus size={14} /> Add FAQ
          </button>
        </div>

        {faqs.length === 0 ? (
          <p className="text-xs text-[#8B8378] italic py-3 text-center border border-dashed border-[#E8E3DA] rounded-xl">
            No FAQs added yet. Add common questions to speed up customer resolution.
          </p>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#F5F1EA]/40 border border-[#E8E3DA] rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                    placeholder="Question (e.g. Do you accept health insurance?)"
                    className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2.5 py-1.5 text-xs text-[#3E3B36] font-semibold"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[11px] text-[#8B8378] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={faq.enabled}
                        onChange={(e) => updateFaq(idx, 'enabled', e.target.checked)}
                        className="rounded"
                      />
                      Active
                    </label>
                    <button
                      onClick={() => removeFaq(idx)}
                      className="text-[#8B8378] hover:text-rose-600 p-1"
                      title="Remove FAQ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <textarea
                  value={faq.answer}
                  onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                  rows={2}
                  placeholder="Answer to this question"
                  className="w-full bg-white border border-[#E8E3DA] rounded-lg px-2.5 py-1.5 text-xs text-[#3E3B36]"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operating Hours */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#3E3B36] flex items-center gap-2">
            <Clock size={16} className="text-[#C4A896]" />
            Weekly Operating Schedule
          </h2>
          <p className="text-xs text-[#8B8378] mt-0.5">
            The AI automatically informs customers whether your business is currently open or when you reopen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {DAYS_OF_WEEK.map((dayName, idx) => {
            const dayConfig = weeklyHours.find((w) => w.day === idx) || {
              day: idx,
              closed: false,
              slots: [{ open: '09:00', close: '18:00' }],
            };
            const slot = dayConfig.slots[0] || { open: '09:00', close: '18:00' };

            const updateDay = (closed: boolean, open = slot.open, close = slot.close) => {
              const updated = weeklyHours.map((d) => {
                if (d.day === idx) {
                  return { day: idx, closed, slots: [{ open, close }] };
                }
                return d;
              });
              setWeeklyHours(updated);
            };

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs ${
                  dayConfig.closed
                    ? 'bg-[#F5F1EA]/30 border-[#E8E3DA] opacity-70'
                    : 'bg-white border-[#E8E3DA]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[#3E3B36]">{dayName}</span>
                  <label className="text-[10px] text-[#8B8378] flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dayConfig.closed}
                      onChange={(e) => updateDay(e.target.checked)}
                    />
                    Closed
                  </label>
                </div>

                {!dayConfig.closed && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <input
                      type="time"
                      value={slot.open}
                      onChange={(e) => updateDay(false, e.target.value, slot.close)}
                      className="bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded px-1.5 py-0.5"
                    />
                    <span>-</span>
                    <input
                      type="time"
                      value={slot.close}
                      onChange={(e) => updateDay(false, slot.open, e.target.value)}
                      className="bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded px-1.5 py-0.5"
                    />
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
