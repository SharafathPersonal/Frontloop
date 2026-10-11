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
  Send,
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
}

export default function LeadConversationClient({
  lead: initialLead,
  messages,
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
    setStatus(newStatus);
    setIsUpdatingStatus(true);
    await updateLeadStatusAction(lead.id, newStatus);
    setIsUpdatingStatus(false);
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
      <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-4">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B8378] hover:text-[#3E3B36] uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={14} /> Back to Leads
        </Link>

        {/* Human Takeover Switch */}
        <button
          onClick={handleToggleBot}
          disabled={isTogglingBot}
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
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 shadow-sm flex flex-col h-[650px]">
          <div className="flex items-center justify-between border-b border-[#E8E3DA] pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#E8E3DA] flex items-center justify-center font-bold text-xs text-[#3E3B36]">
                {(lead.name || lead.profileName || 'C').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-[#3E3B36]">
                  {lead.name || lead.profileName || 'Customer'}
                </h2>
                <p className="text-[11px] text-[#8B8378] font-mono">+{lead.phone}</p>
              </div>
            </div>

            <span className="text-[10px] text-[#8B8378] font-mono uppercase bg-[#F5F1EA] px-2 py-0.5 rounded">
              {messages.length} Messages
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-[#8B8378] italic text-center py-20">
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
                          ? 'bg-[#F5F1EA] text-[#3E3B36] rounded-tl-none border border-[#E8E3DA]'
                          : isBot
                            ? 'bg-[#3E3B36] text-[#F5F1EA] rounded-tr-none'
                            : 'bg-[#C4A896] text-[#3E3B36] rounded-tr-none font-medium'
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

                    <span className="text-[9px] text-[#8B8378] mt-1 px-1">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleTimeString([], {
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
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3B36] border-b border-[#E8E3DA] pb-2">
              Lead Intelligence
            </h3>

            <div className="space-y-1">
              <span className="text-[10px] text-[#8B8378] uppercase font-bold">Pipeline Stage</span>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                disabled={isUpdatingStatus}
                className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-lg px-2.5 py-1.5 text-xs text-[#3E3B36] font-semibold capitalize focus:outline-none focus:border-[#C4A896]"
              >
                <option value="new">New Inquiry</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#8B8378] uppercase font-bold">Inferred Intent</span>
              <p className="text-xs font-bold capitalize text-[#3E3B36] bg-[#F5F1EA] p-2 rounded-lg">
                {lead.intent || 'enquiry'}
              </p>
            </div>

            {lead.requirement && (
              <div className="space-y-1">
                <span className="text-[10px] text-[#8B8378] uppercase font-bold">Extracted Requirement</span>
                <p className="text-xs text-[#3E3B36] bg-[#F5F1EA]/50 p-2 rounded-lg border border-[#E8E3DA]">
                  {lead.requirement}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] text-[#8B8378] uppercase font-bold">Phone Number</span>
              <p className="text-xs font-mono text-[#3E3B36] flex items-center gap-1.5">
                <Phone size={12} className="text-[#C4A896]" /> +{lead.phone}
              </p>
            </div>

            {lead.lastInboundAt && (
              <div className="space-y-1">
                <span className="text-[10px] text-[#8B8378] uppercase font-bold">Last Customer Contact</span>
                <p className="text-xs text-[#8B8378] flex items-center gap-1.5">
                  <Clock size={12} />
                  {new Date(lead.lastInboundAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Internal Staff Notes */}
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3B36]">
              Staff Internal Notes
            </h3>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. Discussed package pricing on phone; follow up on Tuesday at 4 PM..."
              className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl p-2.5 text-xs text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
            />

            <button
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="flex items-center justify-center gap-1.5 w-full bg-[#3E3B36] text-[#F5F1EA] py-2 rounded-lg text-xs font-semibold hover:bg-[#2B2925] transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              {isSavingNotes ? 'Saving Notes...' : 'Save Notes'}
            </button>

            {savedNoteSuccess && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 justify-center">
                <CheckCircle size={13} /> Notes saved successfully!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

