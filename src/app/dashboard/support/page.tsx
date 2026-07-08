'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Shop } from '@/types/broadcast';
import { Phone, MessageCircle, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

export default function SupportPage() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback States
  const [feedbackForm, setFeedbackForm] = useState({ rating: 5, category: 'WhatsApp Delivery', message: '' });
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedbackErrorMsg, setFeedbackErrorMsg] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: shopData } = await supabase.from('shops').select('*').eq('id', user.id).maybeSingle();
        if (shopData) setShop(shopData);
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackStatus('submitting');
    
    if (!shop?.id) {
      setFeedbackStatus('error');
      setFeedbackErrorMsg('Shop identity not loaded.');
      return;
    }
    
    const { error } = await supabase.from('shop_feedbacks').insert({
      shop_id: shop.id,
      rating: feedbackForm.rating,
      category: feedbackForm.category,
      message: feedbackForm.message
    });
    
    if (error) {
      setFeedbackStatus('error');
      setFeedbackErrorMsg(error.message);
    } else {
      setFeedbackStatus('success');
      setFeedbackForm({ rating: 5, category: 'WhatsApp Delivery', message: '' });
      setTimeout(() => setFeedbackStatus('idle'), 4000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="h-10 w-48 bg-[#E8E3DA] rounded-sm animate-pulse" />
        <div className="h-64 bg-[#FFFFFF] rounded-xl border border-[#E8E3DA] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      
      <div className="mb-8">
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Founder Support</h1>
        <p className="text-sm text-[#8B8378] mt-2">Direct lines to the core founding team for critical assistance.</p>
      </div>

      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden shadow-sm">
        <div className="grid md:grid-cols-2">
          
          {/* Left Column: 24/7 Helpline */}
          <div className="p-8 md:border-r border-b md:border-b-0 border-[#E8E3DA] flex flex-col">
            <h2 className="serif-headline text-2xl text-[#3E3B36] mb-3">24/7 Concierge Support</h2>
            <p className="text-sm text-[#8B8378] leading-relaxed font-sans mb-8">
              Have an urgent dispatch issue or billing question? Our founding team is available around the clock to keep your retail pipelines running smoothly.
            </p>
            
            <div className="mt-auto space-y-3">
              <a 
                href="tel:+916282560928" 
                className="flex items-center justify-center gap-2 w-full py-4 border border-[#3E3B36] text-[#3E3B36] hover:bg-[#3E3B36] hover:text-[#FFFFFF] transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
              >
                <Phone size={14} />
                DIRECT VOICE LINE
              </a>
              <a 
                href="https://wa.me/916282560928?text=Hello%20Sharafath,%20I%20need%20help%20with%20my%20Attendly%20Broadcast%20Dashboard." 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#1DA851] text-white transition-colors rounded-lg text-xs font-semibold tracking-[0.15em] uppercase"
              >
                <MessageCircle size={14} />
                WHATSAPP DISPATCH HELP
              </a>
            </div>
          </div>

          {/* Right Column: Ticketing Form */}
          <div className="p-8">
            <h3 className="text-xs font-semibold text-[#8B8378] tracking-[0.2em] uppercase mb-6">Issue Ticketing & Feedback</h3>
            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              
              {/* Rating */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-2">Experience Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        size={22} 
                        className={star <= feedbackForm.rating ? "text-[#C4A896] fill-current" : "text-[#E8E3DA]"} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-2">Support Category</label>
                <select 
                  value={feedbackForm.category}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                  className="input-editorial w-full appearance-none cursor-pointer"
                  disabled={feedbackStatus === 'submitting'}
                >
                  <option value="WhatsApp Delivery">WhatsApp Delivery</option>
                  <option value="AI Message Polisher">AI Message Polisher</option>
                  <option value="Billing/Credits">Billing/Credits</option>
                  <option value="General Suggestion">General Suggestion</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                  placeholder="Describe your issue or drop your feedback here..."
                  className="input-editorial w-full resize-none"
                  disabled={feedbackStatus === 'submitting'}
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                {feedbackStatus === 'error' && (
                  <div className="mb-4 flex items-start gap-2 text-[#8B8378] bg-[#F5F1EA] p-3 rounded-md">
                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{feedbackErrorMsg}</span>
                  </div>
                )}
                {feedbackStatus === 'success' ? (
                  <div className="flex items-center justify-center gap-2 w-full py-4 bg-[#F5F1EA] text-[#3E3B36] rounded-lg text-xs font-semibold tracking-[0.1em] uppercase">
                    <CheckCircle size={14} className="text-[#C4A896]" />
                    TICKET RECEIVED SECURELY
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={feedbackStatus === 'submitting' || !feedbackForm.message.trim()}
                    className="btn-primary w-full rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 h-[52px]"
                  >
                    {feedbackStatus === 'submitting' ? (
                      <>
                        <Spinner />
                        TRANSMITTING TICKET...
                      </>
                    ) : (
                      'SUBMIT AUDIT REPORT & FEEDBACK'
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
          
        </div>
      </section>
    </div>
  );
}
