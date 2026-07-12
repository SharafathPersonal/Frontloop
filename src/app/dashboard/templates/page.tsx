'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageTemplate } from '@/types/broadcast';
import { Plus, X, Image as ImageIcon, MessageSquareText, Loader2, AlertCircle, CheckCircle2, Wand2, Lock, Edit, Trash2, Send } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import CustomConfirm from '@/components/ui/CustomConfirm';
import Link from 'next/link';

// Skeleton Row Component
const SkeletonRow = () => (
  <tr className="animate-pulse border-b border-[#E8E3DA]">
    <td className="px-6 py-4"><div className="h-4 bg-[#F5F1EA] rounded w-32"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-[#F5F1EA] rounded w-20"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-[#F5F1EA] rounded w-16"></div></td>
    <td className="px-6 py-4"><div className="h-6 bg-[#F5F1EA] rounded-full w-24"></div></td>
    <td className="px-6 py-4"><div className="h-4 bg-[#F5F1EA] rounded w-24"></div></td>
    <td className="px-6 py-4 text-right flex justify-end gap-2">
      <div className="h-8 bg-[#F5F1EA] rounded w-8"></div>
      <div className="h-8 bg-[#F5F1EA] rounded w-8"></div>
    </td>
  </tr>
);

export default function TemplatesPage() {
  const [mode, setMode] = useState<string | null>(null);
  const [modeLoading, setModeLoading] = useState(true);
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Form State
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [headerType, setHeaderType] = useState<'NONE' | 'IMAGE'>('NONE');
  const [bodyText, setBodyText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [isPolishing, setIsPolishing] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Premium');

  // Edit / Delete State
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const PAGE_SIZE = 10;

  const handleAIPolish = async () => {
    if (!bodyText.trim()) {
      showToast('Please write a message to polish.', 'error');
      setSubmitError('Please write a message to polish.');
      return;
    }
    
    setIsPolishing(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/ai/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_message: bodyText,
          shop_name: 'Your Shop',
          industry_type: 'Retail',
          selected_tone: selectedTone
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to polish message');
      }

      setBodyText(data.polished_message);
      showToast('Template content polished successfully by AI', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI Polishing failed.';
      setSubmitError(msg);
      showToast(msg, 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  const fetchTemplates = useCallback(async (pageNum: number) => {
    if (pageNum === 0) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const start = pageNum * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      const [{ data: shopData }, { data }] = await Promise.all([
        supabase.from('shops').select('whatsapp_mode').eq('id', user.id).maybeSingle(),
        supabase
          .from('message_templates')
          .select('*')
          .eq('shop_id', user.id)
          .order('created_at', { ascending: false })
          .range(start, end)
      ]);
      
      if (shopData && pageNum === 0) {
        setMode(shopData.whatsapp_mode || 'NONE');
        setModeLoading(false);
      }
      
      if (data) {
        setTemplates((prev) => {
          if (pageNum === 0) {
            return data as MessageTemplate[];
          } else {
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = (data as MessageTemplate[]).filter(item => !existingIds.has(item.id));
            return [...prev, ...newItems];
          }
        });
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    }
    setIsLoading(false);
    setIsFetchingNextPage(false);
  }, [showToast]);

  useEffect(() => {
    fetchTemplates(0);
  }, [fetchTemplates]);

  // Observer for Infinite Scroll
  const observer = useRef<IntersectionObserver | null>(null);
  const lastTemplateElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (isLoading || isFetchingNextPage) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchTemplates(nextPage);
            return nextPage;
          });
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingNextPage, hasMore, fetchTemplates]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      let uploadedImageUrl = editingTemplate?.image_url || null;

      if (headerType === 'IMAGE') {
        if (imageFile) {
          setImageUploading(true);
          try {
            const formData = new FormData();
            formData.append('file', imageFile);
            const uploadRes = await fetch('/api/campaigns/upload-image', {
              method: 'POST',
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || uploadData.error) {
              throw new Error(uploadData.error || 'Failed to upload header image');
            }
            uploadedImageUrl = uploadData.publicUrl;
          } finally {
            setImageUploading(false);
          }
        } else if (!uploadedImageUrl) {
          throw new Error('Please select a header image.');
        }
      }

      if (editingTemplate) {
        const res = await fetch('/api/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTemplate.id,
            category,
            header_type: headerType,
            body_text: bodyText,
            image_url: uploadedImageUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update template');
        }

        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? { ...t, ...data.data } : t))
        );
        showToast('Template updated successfully and sent for Meta approval', 'success');
      } else {
        const res = await fetch('/api/templates/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: templateName,
            category,
            header_type: headerType,
            body_text: bodyText,
            image_url: uploadedImageUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to submit template');
        }

        setTemplates((prev) => [data.data, ...prev]);
        showToast('Template submitted to Meta for approval', 'success');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setSubmitError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.template_name);
    setCategory(template.category as 'MARKETING' | 'UTILITY');
    setHeaderType(template.header_type as 'NONE' | 'IMAGE');
    setBodyText(template.body_text);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (template: MessageTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    setSubmitError('');

    try {
      const res = await fetch(`/api/templates?id=${templateToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete template');
      }

      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
      showToast('Template deleted successfully', 'success');
    } catch (err: any) {
      setSubmitError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setCategory('MARKETING');
    setHeaderType('NONE');
    setBodyText('');
    setSubmitError('');
    setImageFile(null);
    setEditingTemplate(null);
  };

  if (modeLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#C4A896]" />
      </div>
    );
  }

  if (mode === 'QR_EXPRESS') {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white border border-[#E8E3DA] rounded-xl p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-[#F5F1EA] flex items-center justify-center mx-auto mb-4">
          <Lock className="text-[#C4A896]" size={20} />
        </div>
        <h2 className="serif-headline text-lg text-[#3E3B36] mb-2">Meta API Feature Only</h2>
        <p className="text-xs text-[#8B8378] leading-relaxed mb-6">
          Message templates and Meta approvals are only available when using the Meta Official API mode.
        </p>
        <Link
          href="/dashboard/settings"
          className="btn-primary rounded-lg text-xs inline-block"
        >
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-1">Message Templates</h1>
          <p className="text-sm text-[#8B8378]">Manage and submit WhatsApp message templates for Meta approval.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/templates/history"
            className="border border-[#C4A896] hover:bg-[#F5F1EA] text-[#3E3B36] px-5 py-2.5 rounded-lg text-xs tracking-[0.1em] uppercase transition-all flex items-center gap-2 cursor-pointer font-medium"
          >
            History Ledger
          </Link>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="bg-[#3E3B36] hover:bg-[#2A2825] text-white px-5 py-2.5 rounded-lg text-xs tracking-[0.1em] uppercase transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            New Template
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F1EA] text-[#8B8378] text-[10px] tracking-[0.1em] uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Template Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Header</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created At</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </tbody>
            </table>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-[#8B8378]">
            <MessageSquareText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No templates found. Create your first template to start broadcasting.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F1EA] text-[#8B8378] text-[10px] tracking-[0.1em] uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Template Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Header</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created At</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {templates.map((template, index) => {
                  const isLastElement = index === templates.length - 1;
                  return (
                    <tr 
                      key={template.id} 
                      ref={isLastElement ? lastTemplateElementRef : undefined}
                      className="hover:bg-[#F9F7F4] transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-[#3E3B36]">{template.template_name}</td>
                      <td className="px-6 py-4 text-[#8B8378]">{template.category}</td>
                      <td className="px-6 py-4 text-[#8B8378]">
                        {template.header_type === 'IMAGE' ? (
                          <span className="flex items-center gap-1"><ImageIcon size={14} /> Image</span>
                        ) : (
                          'None'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {template.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-green-100 text-green-700 tracking-[0.1em] uppercase">
                            <CheckCircle2 size={12} /> Approved
                          </span>
                        ) : template.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700 tracking-[0.1em] uppercase">
                            <AlertCircle size={12} /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 tracking-[0.1em] uppercase">
                            <Loader2 size={12} className="animate-spin" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#8B8378]">
                        {new Date(template.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        {template.status === 'APPROVED' && (
                          <Link
                            href={`/dashboard/campaigns/create?template=${template.id}`}
                            className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors cursor-pointer"
                            title="Use in Campaign Dispatcher"
                          >
                            <Send size={14} />
                          </Link>
                        )}
                        <button
                          onClick={() => handleEditClick(template)}
                          className="p-1.5 hover:bg-[#F5F1EA] rounded text-[#8B8378] hover:text-[#3E3B36] transition-colors cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(template)}
                          className="p-1.5 hover:bg-red-50 rounded text-[#8B8378] hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {isFetchingNextPage && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E3B36]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center justify-between">
              <h2 className="serif-headline text-xl text-[#3E3B36]">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }} 
                className="text-[#8B8378] hover:text-[#3E3B36]"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <p>{submitError}</p>
                </div>
              )}
              
              <div>
                <label className="block text-[10px] tracking-[0.1em] uppercase text-[#8B8378] mb-2">Template Name</label>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9_]+"
                  placeholder="e.g. order_confirmation"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase())}
                  disabled={!!editingTemplate}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-sm disabled:opacity-60 disabled:bg-[#F5F1EA]/50"
                />
                <p className="text-[10px] text-[#8B8378] mt-1">
                  {editingTemplate ? 'Template name is immutable.' : 'Only lowercase letters, numbers, and underscores.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#8B8378] mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'MARKETING' | 'UTILITY')}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-sm"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.1em] uppercase text-[#8B8378] mb-2">Header Type</label>
                  <select
                    value={headerType}
                    onChange={(e) => setHeaderType(e.target.value as 'NONE' | 'IMAGE')}
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-sm"
                  >
                    <option value="NONE">None</option>
                    <option value="IMAGE">Image</option>
                  </select>
                </div>
              </div>

              {headerType === 'IMAGE' && (
                <div className="border border-dashed border-[#E8E3DA] rounded-lg p-4 bg-[#F9F7F4] flex flex-col items-center justify-center gap-2">
                  {imageFile ? (
                    <div className="relative w-24 h-24 bg-white border border-[#E8E3DA] rounded overflow-hidden">
                      <img src={URL.createObjectURL(imageFile)} alt="Selected Image" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer flex items-center justify-center w-5 h-5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : editingTemplate?.image_url ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative w-24 h-24 bg-white border border-[#E8E3DA] rounded overflow-hidden">
                        <img src={editingTemplate.image_url} alt="Current Image" className="w-full h-full object-contain" />
                      </div>
                      <label className="text-[10px] text-[#C4A896] font-medium hover:underline cursor-pointer">
                        Change Image
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                                setSubmitError('Invalid file format. Only PNG, JPG, and JPEG are supported.');
                                return;
                              }
                              if (file.size > 5 * 1024 * 1024) {
                                setSubmitError('File too large. Maximum size is 5MB.');
                                    return;
                              }
                              setSubmitError('');
                              setImageFile(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1 cursor-pointer w-full py-4 text-center">
                      <ImageIcon className="text-[#C4A896]" size={24} />
                      <span className="text-[11px] text-[#3E3B36] font-medium">Select Header Image</span>
                      <span className="text-[9px] text-[#8B8378]">PNG/JPG only, max 5MB</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                              setSubmitError('Invalid file format. Only PNG, JPG, and JPEG are supported.');
                              return;
                            }
                            if (file.size > 5 * 1024 * 1024) {
                              setSubmitError('File too large. Maximum size is 5MB.');
                              return;
                            }
                            setSubmitError('');
                            setImageFile(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] tracking-[0.1em] uppercase text-[#8B8378] mb-2">Message Body</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Hi {{1}}, thank you for shopping at {{2}}. Your balance is {{3}}."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-sm resize-none"
                />
                <p className="text-[10px] text-[#8B8378] mt-1 mb-2">Use double braces like {'{{1}}'}, {'{{2}}'} for dynamic variables.</p>
                {mode === 'META_API' && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleAIPolish}
                      disabled={isPolishing || !bodyText.trim()}
                      className="flex items-center gap-2 border border-[#C4A896] rounded px-3 py-1.5 tracking-[0.2em] text-xs text-[#C4A896] hover:bg-[#3E3B36] hover:border-[#3E3B36] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Wand2 size={12} className={isPolishing ? 'animate-spin' : ''} />
                      {isPolishing ? 'AI THINKING...' : 'AI POLISH TEMPLATE CONTENT'}
                    </button>
                    <select
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value)}
                      disabled={isPolishing}
                      className="bg-transparent border border-[#E8E3DA] text-[#8B8378] text-xs tracking-[0.1em] uppercase rounded px-2 py-1.5 focus:outline-none focus:border-[#C4A896] disabled:opacity-50"
                    >
                      <option value="Premium">Premium</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Festive">Festive</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-[#E8E3DA] text-[#3E3B36] text-xs tracking-[0.1em] uppercase hover:bg-[#F5F1EA] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-[#3E3B36] text-white text-xs tracking-[0.1em] uppercase hover:bg-[#2A2825] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <><Loader2 size={14} className="animate-spin" /> {editingTemplate ? 'Saving...' : 'Submitting...'}</>
                  ) : (
                    editingTemplate ? 'Save Changes' : 'Submit to Meta'
                  )}
                </button>
              </div>

              {mode === 'META_API' && (
                <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 rounded-lg text-xs leading-relaxed">
                  {editingTemplate 
                    ? "ℹ️ Meta API Approval Notice: Once re-submitted, Meta typically reviews and approves updates within a few minutes, but it can take up to 24 hours."
                    : "ℹ️ Meta API Approval Notice: Once submitted, Meta typically reviews and approves templates within a few minutes, but it can take up to 24 hours in some cases."
                  }
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <CustomConfirm
        isOpen={isDeleteModalOpen}
        title="Permanently Delete Template?"
        message={`Are you sure you want to permanently delete the template "${templateToDelete?.template_name}"? This cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
      />
    </div>
  );
}
