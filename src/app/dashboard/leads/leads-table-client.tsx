'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Download,
  Phone,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  ChevronRight,
  Clock,
  Filter,
} from 'lucide-react';
import { toggleBotPausedAction } from './actions';
import { LEAD_FILTERS, NEEDS_HUMAN_FILTER } from './filters';

interface SerializedLead {
  id: string;
  phone: string;
  name?: string;
  profileName?: string;
  requirement?: string;
  intent?: string;
  status: string;
  botPaused: boolean;
  messageCount: number;
  lastMessageAt?: string;
  createdAt?: string;
}

interface LeadsTableProps {
  initialLeads: SerializedLead[];
  totalCount: number;
  currentStatus?: string;
  currentSearch?: string;
  nextCursor: string | null;
  isPaged: boolean;
  timeZone: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  contacted: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  converted: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  lost: { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-300' },
};

export default function LeadsTableClient({
  initialLeads,
  totalCount,
  currentStatus,
  currentSearch,
  nextCursor,
  isPaged,
  timeZone,
}: LeadsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<SerializedLead[]>(initialLeads);
  const [search, setSearch] = useState(currentSearch || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus || 'all');
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  const applyFilters = (statusVal: string, searchVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (statusVal && statusVal !== 'all') {
      params.set('status', statusVal);
    } else {
      params.delete('status');
    }

    if (searchVal.trim()) {
      params.set('search', searchVal.trim());
    } else {
      params.delete('search');
    }
    params.delete('cursor'); // a new filter always starts from the first page

    router.push(`/dashboard/leads?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters(selectedStatus, search);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    applyFilters(status, search);
  };

  const handleToggleBot = async (e: React.MouseEvent, leadId: string, currentPaused: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    setIsTogglingId(leadId);
    const res = await toggleBotPausedAction(leadId, !currentPaused);
    setIsTogglingId(null);

    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, botPaused: !currentPaused } : l)),
      );
    }
  };

  const pageUrl = (cursor: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cursor) params.set('cursor', cursor);
    else params.delete('cursor');
    const qs = params.toString();
    return `/dashboard/leads${qs ? `?${qs}` : ''}`;
  };

  const exportUrl = `/api/leads/export${
    selectedStatus === NEEDS_HUMAN_FILTER
      ? '?needsHuman=1'
      : selectedStatus && selectedStatus !== 'all'
        ? `?status=${selectedStatus}`
        : ''
  }`;

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="text-[#047857]" size={24} />
            Customer Leads &amp; Conversations
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Pipeline of captured WhatsApp inquiries, extracted requirements, and human takeover controls.
          </p>
        </div>

        <a
          href={exportUrl}
          download
          className="flex items-center justify-center gap-2 bg-[#FFFFFF] border border-[#E2E8F0] text-[#0F172A] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#F8FAFC] transition-all shadow-sm w-full sm:w-auto"
        >
          <Download size={14} className="text-[#047857]" />
          Export CSV
        </a>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <label htmlFor="leads-search" className="sr-only">
            Search leads by phone number
          </label>
          <Search className="absolute left-3 top-2.5 text-[#64748B]" size={15} aria-hidden="true" />
          <input
            id="leads-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number digits (e.g. 98765)..."
            className="w-full bg-[#F8FAFC]/50 border border-[#E2E8F0] rounded-xl pl-9 pr-20 py-2 text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-[#047857]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-[#047857] text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[#065F46]"
          >
            Search
          </button>
        </form>

        {/* Status Filters */}
        <div role="group" aria-label="Filter leads by status" className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-[#64748B] mr-1 hidden sm:block" aria-hidden="true" />
          {LEAD_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={selectedStatus === value}
              onClick={() => handleStatusChange(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedStatus === value
                  ? value === NEEDS_HUMAN_FILTER
                    ? 'bg-amber-800 text-white'
                    : 'bg-[#0F172A] text-white'
                  : value === NEEDS_HUMAN_FILTER
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Total Count Badge */}
      <div className="text-xs text-[#64748B] font-medium px-1">
        Showing <span className="font-bold text-[#0F172A]">{leads.length}</span>
        {isPaged ? ' more' : ''} of <span className="font-bold text-[#0F172A]">{totalCount}</span> matching leads
      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC]/60 border-b border-[#E2E8F0] text-[10px] tracking-wider uppercase text-[#64748B]">
              <tr>
                <th className="py-3 px-4 font-bold">Contact</th>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Intent</th>
                <th className="py-3 px-4 font-bold">Requirement</th>
                <th className="py-3 px-4 font-bold">Messages</th>
                <th className="py-3 px-4 font-bold">Bot Control</th>
                <th className="py-3 px-4 font-bold">Last Activity</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B] italic">
                    {selectedStatus === NEEDS_HUMAN_FILTER
                      ? 'No chats are waiting for a human. Paused conversations appear here.'
                      : 'No leads found matching current filter.'}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#F8FAFC]/30 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    >
                      {/* Contact */}
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[10px] font-bold text-[#0F172A]">
                            {(lead.name || lead.profileName || 'L').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs truncate max-w-[150px]">
                              {lead.name || lead.profileName || 'Customer'}
                            </p>
                            <p className="text-[11px] text-[#64748B] flex items-center gap-1 font-mono">
                              <Phone size={10} /> +{lead.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {lead.status}
                        </span>
                      </td>

                      {/* Intent */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-[#0F172A] bg-[#F8FAFC] px-2 py-0.5 rounded text-[11px]">
                          {lead.intent || 'enquiry'}
                        </span>
                      </td>

                      {/* Requirement */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-[#64748B]" title={lead.requirement}>
                        {lead.requirement || '-'}
                      </td>

                      {/* Messages */}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-[#64748B]">
                          <MessageSquare size={12} /> {lead.messageCount}
                        </span>
                      </td>

                      {/* Bot Control */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => handleToggleBot(e, lead.id, lead.botPaused)}
                          disabled={isTogglingId === lead.id}
                          aria-label={
                            lead.botPaused
                              ? `Human takeover active for ${lead.name || lead.profileName || lead.phone}. Resume AI bot`
                              : `AI bot active for ${lead.name || lead.profileName || lead.phone}. Pause bot for human takeover`
                          }
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold transition-colors ${
                            lead.botPaused
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {lead.botPaused ? (
                            <>
                              <PauseCircle size={12} className="text-amber-700" /> Human Takeover
                            </>
                          ) : (
                            <>
                              <PlayCircle size={12} className="text-emerald-700" /> Bot Active
                            </>
                          )}
                        </button>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-[11px] text-[#64748B] whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {lead.lastMessageAt
                            ? new Date(lead.lastMessageAt).toLocaleString('en-IN', {
                                timeZone,
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 text-[#047857] hover:text-[#0F172A] font-semibold text-xs transition-colors"
                        >
                          View <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(isPaged || nextCursor) && (
        <div className="flex items-center justify-between text-xs font-semibold">
          {isPaged ? (
            <Link href={pageUrl(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors">
              &larr; Back to newest
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link
              href={pageUrl(nextCursor)}
              className="flex items-center gap-1 bg-[#047857] text-white px-4 py-2 rounded-lg uppercase tracking-wider hover:bg-[#065F46] transition-all"
            >
              Older leads <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
