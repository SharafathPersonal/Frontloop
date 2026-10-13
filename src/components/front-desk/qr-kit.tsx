'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, ExternalLink, MessageCircle, Share2 } from 'lucide-react';

const CARD_W = 1200;
const CARD_H = 1800; // 4 x 6 in at 300 dpi: fits a table tent or a reception desk stand
const QR_SIZE = 760;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Greedy word wrap for the card title; long single words are hard-cut. */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) line = candidate;
    else {
      if (line) lines.push(line);
      line = word.slice(0, maxChars);
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxChars - 3)}...`;
  }
  return lines;
}

function buildCardSvg(qrSvg: SVGSVGElement, businessName: string, displayUrl: string): string {
  const qr = qrSvg.cloneNode(true) as SVGSVGElement;
  qr.setAttribute('width', String(QR_SIZE));
  qr.setAttribute('height', String(QR_SIZE));
  qr.setAttribute('x', String((CARD_W - QR_SIZE) / 2));
  qr.setAttribute('y', '620');
  qr.removeAttribute('style');
  qr.removeAttribute('class');

  const titleLines = wrap(businessName, 22, 2);
  const titleSize = titleLines.length > 1 ? 72 : 84;
  const title = titleLines
    .map((l, i) => `<text x="600" y="${370 + i * (titleSize + 14)}" text-anchor="middle" font-size="${titleSize}" font-weight="700" fill="#0F172A">${escapeXml(l)}</text>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" font-family="Arial, Helvetica, sans-serif">
  <rect width="${CARD_W}" height="${CARD_H}" fill="#FFFFFF"/>
  <rect width="${CARD_W}" height="230" fill="#047857"/>
  <text x="600" y="140" text-anchor="middle" font-size="68" font-weight="700" fill="#FFFFFF">Scan to chat with us</text>
  ${title}
  <text x="600" y="545" text-anchor="middle" font-size="40" font-weight="700" fill="#065F46" letter-spacing="3">24/7 AI RECEPTIONIST</text>
  <rect x="${(CARD_W - QR_SIZE) / 2 - 30}" y="590" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}" rx="36" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
  ${new XMLSerializer().serializeToString(qr)}
  <text x="600" y="1520" text-anchor="middle" font-size="42" fill="#475569">Ask about services, prices and timings.</text>
  <text x="600" y="1580" text-anchor="middle" font-size="42" fill="#475569">Chat on WhatsApp or right in your browser.</text>
  <text x="600" y="1680" text-anchor="middle" font-size="34" font-weight="700" fill="#0F172A">${escapeXml(displayUrl)}</text>
  <text x="600" y="1740" text-anchor="middle" font-size="26" fill="#64748B">Powered by FrontLoop</text>
</svg>`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function svgToPng(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => (png ? resolve(png) : reject(new Error('PNG export failed'))), 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not render the card'));
    };
    img.src = url;
  });
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors disabled:opacity-50';

export function QrKit({ businessName, hubUrl }: { businessName: string; hubUrl: string }) {
  const qrRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const displayUrl = hubUrl.replace(/^https?:\/\//, '');
  const fileBase = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'front-desk'}-front-desk`;
  const shareText = `Chat with ${businessName} any time, on WhatsApp or the web: ${hubUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(hubUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your front-desk link', hubUrl);
    }
  };

  const nativeShare = async () => {
    if (typeof navigator.share !== 'function') return copyLink();
    try {
      await navigator.share({ title: businessName, text: `Chat with ${businessName} any time`, url: hubUrl });
    } catch {
      // Closing the share sheet is not an error worth reporting.
    }
  };

  const downloadCard = async (format: 'svg' | 'png') => {
    if (!qrRef.current) return;
    const svg = buildCardSvg(qrRef.current, businessName, displayUrl);
    try {
      download(
        format === 'svg' ? new Blob([svg], { type: 'image/svg+xml' }) : await svgToPng(svg),
        `${fileBase}-card.${format}`,
      );
      setStatus(`Printable card downloaded as ${format.toUpperCase()}.`);
    } catch {
      setStatus('Could not create the PNG in this browser. Try the SVG download instead.');
    }
  };

  const downloadQrOnly = () => {
    if (!qrRef.current) return;
    const qr = qrRef.current.cloneNode(true) as SVGSVGElement;
    qr.removeAttribute('style');
    qr.removeAttribute('class');
    download(new Blob([new XMLSerializer().serializeToString(qr)], { type: 'image/svg+xml' }), `${fileBase}-qr.svg`);
    setStatus('QR code downloaded as SVG.');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,320px)_1fr] gap-6 items-start">
      <figure className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
        <QRCodeSVG
          ref={qrRef}
          value={hubUrl}
          size={512}
          level="M"
          marginSize={2}
          fgColor="#0F172A"
          bgColor="#FFFFFF"
          title={`QR code for ${businessName}'s front desk`}
          className="w-full h-auto"
        />
        <figcaption className="mt-3 text-center text-[11px] text-[#64748B]">
          Points to your public front desk. Printing stays sharp at any size.
        </figcaption>
      </figure>

      <div className="space-y-6">
        <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Your front-desk link</h2>
          <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-xs text-[#0F172A]">{hubUrl}</code>
            <button type="button" onClick={() => void copyLink()} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#047857] hover:text-[#065F46]">
              {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
              <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#047857] hover:bg-[#065F46] px-4 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              <MessageCircle size={14} aria-hidden="true" /> Share via WhatsApp
            </a>
            <button type="button" onClick={() => void nativeShare()} className={buttonClass}>
              <Share2 size={14} aria-hidden="true" /> Share
            </button>
            <a href={hubUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
              <ExternalLink size={14} aria-hidden="true" /> Open page
            </a>
          </div>
        </section>

        <section className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Printable card</h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            A 4 x 6 inch card with your business name and QR code, ready for a reception desk, table tent or shop window.
            PNG prints at 300 dpi; SVG scales to any size for a print shop.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void downloadCard('png')} className={buttonClass}>
              <Download size={14} aria-hidden="true" /> Card (PNG)
            </button>
            <button type="button" onClick={() => void downloadCard('svg')} className={buttonClass}>
              <Download size={14} aria-hidden="true" /> Card (SVG)
            </button>
            <button type="button" onClick={downloadQrOnly} className={buttonClass}>
              <Download size={14} aria-hidden="true" /> QR code only (SVG)
            </button>
          </div>
          {status && (
            <p role="status" className="text-[11px] text-[#065F46]">
              {status}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Compact version for the dashboard overview. */
export function FrontDeskLinkCard({ hubUrl }: { hubUrl: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hubUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your front-desk link', hubUrl);
    }
  };

  return (
    <div className="flex items-center gap-4 min-w-0">
      <QRCodeSVG value={hubUrl} size={96} level="M" marginSize={1} fgColor="#0F172A" className="shrink-0 rounded-lg border border-[#E2E8F0]" aria-hidden="true" />
      <div className="min-w-0 space-y-2">
        <code className="block truncate text-xs text-[#0F172A]">{hubUrl.replace(/^https?:\/\//, '')}</code>
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1 text-xs font-semibold text-[#047857] hover:text-[#065F46]">
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          <span aria-live="polite">{copied ? 'Copied' : 'Copy link'}</span>
        </button>
      </div>
    </div>
  );
}
