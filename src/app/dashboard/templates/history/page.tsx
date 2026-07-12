'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { MessageTemplate, TemplateStatus, TemplateCategory } from '@/types/broadcast';
import {
  ArrowLeft, Search, Filter, RefreshCw,
  Image as ImageIcon, X, AlertCircle, CheckCircle2, Loader2, Calendar, FileText
} from 'lucide-react';

const STATUS_FILTERS: { label: string; value: TemplateStatus | 'all' }[] = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Rejected', value: 'REJECTED' },
];

const CATEGORY_FILTERS: { label: string; value: TemplateCategory | 'all' }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Utility', value: 'UTILITY' },
];

const PAGE_SIZE = 10;

export default function TemplateHistoryPage() {
  const [allTemplates, setAllTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch templates function
  const fetchTemplates = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setAllTemplates(data as MessageTemplate[]);
      }
    } catch (err: any) {
      console.error('Error fetching template history:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and Realtime setup
  useEffect(() => {
    let channel: any;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchTemplates();

      // Realtime listener to reflect status updates immediately (e.g. from webhooks)
      channel = supabase
        .channel(`message-templates-history:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'message_templates', filter: `shop_id=eq.${user.id}` },
          () => {
            fetchTemplates();
          }
        )
        .subscribe();
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchTemplates]);

  // Filtered and searched list
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      const matchesSearch = t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.body_text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [allTemplates, searchQuery, statusFilter, categoryFilter]);

  // Paginated list
  const paginatedTemplates = useMemo(() => {
    return filteredTemplates.slice(0, visibleCount);
  }, [filteredTemplates, visibleCount]);

  // Intersection observer for Infinite Scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && visibleCount < filteredTemplates.length) {
        setVisibleCount((prev) => prev + PAGE_SIZE);
      }
    },
    [filteredTemplates.length, visibleCount]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [handleObserver]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // First sync with Meta
      await fetch('/api/templates/sync');
    } catch (err) {
      console.error('Failed to sync templates from Meta:', err);
    }
    // Then re-fetch from local database
    await fetchTemplates();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0 pb-12">
      {/* Back & Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center gap-2 text-xs text-[#8B8378] hover:text-[#3E3B36] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Templates
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="serif-headline text-2xl text-[#3E3B36]">Template History Ledger</h1>
            <p className="text-sm text-[#8B8378]">Audit trail of WhatsApp template submission reviews and statuses.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="self-start md:self-auto p-2.5 rounded-lg border border-[#E8E3DA] hover:bg-[#F5F1EA] text-[#3E3B36] transition-colors flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-medium cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl p-4 flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={16} />
          <input
            type="text"
            placeholder="Search templates by name or content..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-xs"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={14} />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as TemplateStatus | 'all');
                setVisibleCount(PAGE_SIZE);
              }}
              className="pl-9 pr-6 py-2 rounded-lg border border-[#E8E3DA] bg-white text-[#3E3B36] text-xs focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] appearance-none"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8378]" size={14} />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as TemplateCategory | 'all');
                setVisibleCount(PAGE_SIZE);
              }}
              className="pl-9 pr-6 py-2 rounded-lg border border-[#E8E3DA] bg-white text-[#3E3B36] text-xs focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] appearance-none"
            >
              {CATEGORY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Directory Table */}
      <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[#8B8378] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#C4A896]" />
            <p className="text-xs">Loading historical ledger records...</p>
          </div>
        ) : paginatedTemplates.length === 0 ? (
          <div className="p-12 text-center text-[#8B8378]">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-xs">No matching template logs found.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F1EA] text-[#8B8378] text-[10px] tracking-[0.1em] uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Preview</th>
                  <th className="px-6 py-4">Template Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {paginatedTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-[#F9F7F4] transition-colors">
                    {/* Media Thumbnail */}
                    <td className="px-6 py-4">
                      {template.header_type === 'IMAGE' && template.image_url ? (
                        <div
                          onClick={() => setZoomedImage(template.image_url!)}
                          className="relative w-12 h-12 rounded bg-white border border-[#E8E3DA] overflow-hidden group cursor-zoom-in transition-transform hover:scale-105"
                        >
                          <img
                            src={template.image_url}
                            alt={template.template_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-[#3E3B36]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ImageIcon size={14} className="text-white" />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-[#8B8378] font-normal italic">Text-Only</span>
                      )}
                    </td>

                    {/* Template Name & Body snippet */}
                    <td className="px-6 py-4 max-w-xs md:max-w-md">
                      <div className="font-semibold text-[#3E3B36] text-xs mb-1">{template.template_name}</div>
                      <div className="text-xs text-[#8B8378] line-clamp-2 leading-relaxed bg-[#F9F7F4]/50 p-2 rounded border border-[#E8E3DA]/40 font-mono">
                        {template.body_text}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 text-xs font-medium text-[#3E3B36]">{template.category}</td>

                    {/* Language */}
                    <td className="px-6 py-4 text-xs text-[#8B8378]">en_US</td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {template.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 tracking-[0.1em] uppercase">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      ) : template.status === 'REJECTED' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 tracking-[0.1em] uppercase">
                            <AlertCircle size={12} /> Rejected
                          </span>
                          {template.rejection_reason && (
                            <p className="text-[10px] text-red-500 mt-1 max-w-[180px] leading-tight">
                              {template.rejection_reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 tracking-[0.1em] uppercase">
                          <Loader2 size={12} className="animate-spin" /> Pending
                        </span>
                      )}
                    </td>

                    {/* Submitted Date */}
                    <td className="px-6 py-4 text-xs text-[#8B8378] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(template.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Infinite Scroll Anchor */}
      {filteredTemplates.length > visibleCount && (
        <div ref={observerTarget} className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#C4A896]" />
        </div>
      )}

      {/* 100% Mobile Responsive Media Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E3B36]/80 backdrop-blur-md p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-2 shadow-2xl max-w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - high contrast, easily clickable */}
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-4 right-4 bg-[#3E3B36] hover:bg-black text-white rounded-full p-2.5 shadow-md transition-colors z-10 cursor-pointer flex items-center justify-center"
              title="Close Image View"
            >
              <X size={18} />
            </button>

            {/* Image display */}
            <img
              src={zoomedImage}
              alt="Zoomed template media preview"
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
