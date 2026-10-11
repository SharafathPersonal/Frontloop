'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Phone,
  Clock,
  PauseCircle,
  PlayCircle,
  Save,
  CheckCircle,
  Bot,
  User,
  ShieldCheck,
} from 'lucide-react';
import {
  toggleBotPausedAction,
  updateLeadStatusAction,
  updateLeadNotesAction,
} from '../actions';
import type { LeadStatus } from '@/server/models/Lead';

interface SerializedMessage {
  id: string;
  direction: 'in' | 'out';
  author: 'customer' | 'bot' | 'agent';
  body?: string;
  status?: string;
  createdAt?: string;
}

interface LeadConversationProps {
  lead: {
    id: string;
    phone: string;
    name?: string;
    profileName?: string;
    requirement?: string;
    intent?: string;
    status: LeadStatus;
    botPaused: boolean;
    notes?: string;
    lastInboundAt?: string;
  };
  messages: SerializedMessage[];
  timeZone: string;
}

export default function LeadConversationClient({
  lead: initialLead,
  messages,
  timeZone,
}: LeadConversationProps) {
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState<LeadStatus>(initialLead.status);
  const [notes, setNotes] = useState(initialLead.notes || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState(false);

  const handleToggleBot = async () => {
    setIsTogglingBot(true);
    const res = await toggleBotPausedAction(lead.id, !lead.botPaused);
    setIsTogglingBot(false);
    if (res.ok) {
      setLead({ ...lead, botPaused: !lead.botPaused });
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    const previous = status;
    setStatus(newStatus);
    setIsUpdatingStatus(true);
    const res = await updateLeadStatusAction(lead.id, newStatus);
    setIsUpdatingStatus(false);
    if (!res.ok) setStatus(previous);
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const res = await updateLeadNotesAction(lead.id, notes);
    setIsSavingNotes(false);
    if (res.ok) {
      setSavedNoteSuccess(true);
      setTimeout(() => setSavedNoteSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={14} /> Back to Leads
        </Link>

        {/* Human Takeover Switch */}
        <button
          type="button"
          onClick={handleToggleBot}
          disabled={isTogglingBot}
          aria-label={lead.botPaused ? 'Human takeover active. Resume AI bot' : 'AI bot active. Pause bot for human takeover'}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            lead.botPaused
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {lead.botPaused ? (
            <>
              <PauseCircle size={15} className="text-amber-700" />
              Human Takeover Active (Bot Paused)
            </>
          ) : (
            <>
              <PlayCircle size={15} className="text-emerald-700" />
              AI Bot Active
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Message Timeline */}
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#0F172A]">
                {(lead.name || lead.profileName || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[#0F172A]">
                  {lead.name || lead.profileName || 'Customer'}
                </h2>
                <p className="text-[11px] text-[#64748B] font-mono">+{lead.phone}</p>
              </div>
            </div>

            <span className="text-[10px] text-[#64748B] font-mono uppercase bg-[#F8FAFC] px-2 py-0.5 rounded">
              {messages.length} Messages
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-[#64748B] italic text-center py-20">
                No messages logged yet in this conversation.
              </p>
            ) : (
              messages.map((m) => {
                const isCustomer = m.direction === 'in';
                const isBot = m.author === 'bot';

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                        isCustomer
                          ? 'bg-[#F8FAFC] text-[#0F172A] rounded-tl-none border border-[#E2E8F0]'
                          : isBot
                            ? 'bg-[#0F172A] text-white rounded-tr-none'
                            : 'bg-[#0AAF76] text-white rounded-tr-none font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] opacity-75 mb-1 font-bold uppercase tracking-wider">
                        {isCustomer ? (
                          <>
                            <User size={10} /> Customer
                          </>
                        ) : isBot ? (
                          <>
                            <Bot size={10} /> AI Agent
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={10} /> Human Staff
                          </>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>

                    <span className="text-[9px] text-[#64748B] mt-1 px-1">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString('en-IN', {
                            timeZone,
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Lead Details & Notes */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A] border-b border-[#E2E8F0] pb-2">
              Lead Intelligence
            </h3>

            <div className="space-y-1">
              <label htmlFor="lead-status" className="block text-[10px] text-[#64748B] uppercase font-bold">
                Pipeline Stage
              </label>
              <select
                id="lead-status"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                disabled={isUpdatingStatus}
                className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] font-semibold capitalize focus:outline-none focus:border-[#0AAF76]"
              >
                <option value="new">New Inquiry</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Inferred Intent</span>
              <p className="text-xs font-bold capitalize text-[#0F172A] bg-[#F8FAFC] p-2 rounded-lg">
                {lead.intent || 'enquiry'}
              </p>
            </div>

            {lead.requirement && (
              <div className="space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Extracted Requirement</span>
                <p className="text-xs text-[#0F172A] bg-[#F8FAFC]/50 p-2 rounded-lg border border-[#E2E8F0]">
                  {lead.requirement}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Phone Number</span>
              <p className="text-xs font-mono text-[#0F172A] flex items-center gap-1.5">
                <Phone size={12} className="text-[#0AAF76]" /> +{lead.phone}
              </p>
            </div>

            {lead.lastInboundAt && (
              <div className="space-y-1">
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Last Customer Contact</span>
                <p className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date(lead.lastInboundAt).toLocaleString('en-IN', { timeZone })}
                </p>
              </div>
            )}
          </div>

          {/* Internal Staff Notes */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              <label htmlFor="lead-notes">Staff Internal Notes</label>
            </h3>

            <textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. Discussed package pricing on phone; follow up on Tuesday at 4 PM..."
              className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl p-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#0AAF76]"
            />

            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="flex items-center justify-center gap-1.5 w-full bg-[#0AAF76] text-white py-2 rounded-lg text-xs font-semibold hover:bg-[#089163] transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              {isSavingNotes ? 'Saving Notes...' : 'Save Notes'}
            </button>

            {savedNoteSuccess && (
              <p role="status" className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-center">
                <CheckCircle size={13} /> Notes saved successfully!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

