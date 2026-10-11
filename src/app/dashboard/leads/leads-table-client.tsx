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
import type { LeadStatus } from '@/server/models/Lead';

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

  const exportUrl = `/api/leads/export${
    selectedStatus && selectedStatus !== 'all' ? `?status=${selectedStatus}` : ''
  }`;

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E3DA] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3E3B36] flex items-center gap-2">
            <Users className="text-[#C4A896]" size={24} />
            Customer Leads &amp; Conversations
          </h1>
          <p className="text-xs sm:text-sm text-[#8B8378] mt-1">
            Real-time pipeline of captured WhatsApp inquiries, extracted requirements, and live takeover controls.
          </p>
        </div>

        <a
          href={exportUrl}
          download
          className="flex items-center justify-center gap-2 bg-[#FFFFFF] border border-[#E8E3DA] text-[#3E3B36] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider hover:bg-[#F5F1EA] transition-all shadow-sm w-full sm:w-auto"
        >
          <Download size={14} className="text-[#C4A896]" />
          Export CSV
        </a>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-[#8B8378]" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number digits (e.g. 98765)..."
            className="w-full bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-xl pl-9 pr-20 py-2 text-xs sm:text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bg-[#3E3B36] text-[#F5F1EA] px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[#2B2925]"
          >
            Search
          </button>
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-[#8B8378] mr-1 hidden sm:block" />
          {(['all', 'new', 'contacted', 'converted', 'lost'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                selectedStatus === st
                  ? 'bg-[#3E3B36] text-[#F5F1EA]'
                  : 'bg-[#F5F1EA] text-[#8B8378] hover:text-[#3E3B36]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Total Count Badge */}
      <div className="text-xs text-[#8B8378] font-medium px-1">
        Showing <span className="font-bold text-[#3E3B36]">{leads.length}</span> of{' '}
        <span className="font-bold text-[#3E3B36]">{totalCount}</span> total leads
      </div>

      {/* Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E3DA] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F1EA]/60 border-b border-[#E8E3DA] text-[10px] tracking-wider uppercase text-[#8B8378]">
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
            <tbody className="divide-y divide-[#E8E3DA]">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#8B8378] italic">
                    No leads found matching current filter.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const statusStyle = STATUS_COLORS[lead.status] || STATUS_COLORS.new;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#F5F1EA]/30 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    >
                      {/* Contact */}
                      <td className="py-3.5 px-4 font-medium text-[#3E3B36]">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#E8E3DA] flex items-center justify-center text-[10px] font-bold text-[#3E3B36]">
                            {(lead.name || lead.profileName || 'L').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-xs truncate max-w-[150px]">
                              {lead.name || lead.profileName || 'Customer'}
                            </p>
                            <p className="text-[11px] text-[#8B8378] flex items-center gap-1 font-mono">
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
                        <span className="capitalize font-medium text-[#3E3B36] bg-[#F5F1EA] px-2 py-0.5 rounded text-[11px]">
                          {lead.intent || 'enquiry'}
                        </span>
                      </td>

                      {/* Requirement */}
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-[#8B8378]" title={lead.requirement}>
                        {lead.requirement || '—'}
                      </td>

                      {/* Messages */}
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-[#8B8378]">
                          <MessageSquare size={12} /> {lead.messageCount}
                        </span>
                      </td>

                      {/* Bot Control */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={(e) => handleToggleBot(e, lead.id, lead.botPaused)}
                          disabled={isTogglingId === lead.id}
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
                      <td className="py-3.5 px-4 text-[11px] text-[#8B8378] whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {lead.lastMessageAt
                            ? new Date(lead.lastMessageAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 text-[#C4A896] hover:text-[#3E3B36] font-semibold text-xs transition-colors"
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
    </div>
  );
}

