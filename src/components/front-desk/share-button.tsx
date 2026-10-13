'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

/** Native share sheet where available (most phones); otherwise copies the link. */
export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? 'Link copied' : `Share ${title}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#0F172A] shadow-sm hover:bg-[#F8FAFC] transition-colors"
    >
      {copied ? <Check size={14} className="text-[#047857]" aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Share'}</span>
    </button>
  );
}
