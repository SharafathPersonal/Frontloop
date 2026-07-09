'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MessageTemplate } from '@/types/broadcast';
import { Plus, X, Image as ImageIcon, MessageSquareText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY'>('MARKETING');
  const [headerType, setHeaderType] = useState<'NONE' | 'IMAGE'>('NONE');
  const [bodyText, setBodyText] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('message_templates')
        .select('*')
        .eq('shop_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setTemplates(data as MessageTemplate[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: templateName,
          category,
          header_type: headerType,
          body_text: bodyText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit template');
      }

      setTemplates([data.data, ...templates]);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTemplateName('');
    setCategory('MARKETING');
    setHeaderType('NONE');
    setBodyText('');
    setSubmitError('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-1">Message Templates</h1>
          <p className="text-sm text-[#8B8378]">Manage and submit WhatsApp message templates for Meta approval.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#3E3B36] hover:bg-[#2A2825] text-white px-5 py-2.5 rounded-lg text-xs tracking-[0.1em] uppercase transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      <div className="bg-white border border-[#E8E3DA] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#C4A896]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center text-[#8B8378]">
            <MessageSquareText className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No templates found. Create your first template to start broadcasting.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F1EA] text-[#8B8378] text-[10px] tracking-[0.1em] uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Template Name</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Header</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-[#F9F7F4] transition-colors">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3E3B36]/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center justify-between">
              <h2 className="serif-headline text-xl text-[#3E3B36]">Create New Template</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8B8378] hover:text-[#3E3B36]">
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
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E8E3DA] focus:outline-none focus:ring-2 focus:ring-[#C4A896]/20 focus:border-[#C4A896] text-[#3E3B36] text-sm"
                />
                <p className="text-[10px] text-[#8B8378] mt-1">Only lowercase letters, numbers, and underscores.</p>
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
                <p className="text-[10px] text-[#8B8378] mt-1">Use double braces like {'{{1}}'}, {'{{2}}'} for dynamic variables.</p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#E8E3DA] text-[#3E3B36] text-xs tracking-[0.1em] uppercase hover:bg-[#F5F1EA] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-[#3E3B36] text-white text-xs tracking-[0.1em] uppercase hover:bg-[#2A2825] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                  ) : (
                    'Submit to Meta'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
