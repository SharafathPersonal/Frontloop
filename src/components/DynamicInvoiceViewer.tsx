'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Printer, Download, Loader2 } from 'lucide-react';
import type { Shop } from '@/types/broadcast';

interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_name: string;
  barcode_or_serial?: string | null;
  quantity: number;
  price: number;
  item_total: number;
  created_at: string;
}

interface Invoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  invoice_footer_note?: string | null;
}

interface DynamicInvoiceViewerProps {
  invoiceNumber: string;
}

export function DynamicInvoiceViewer({ invoiceNumber }: DynamicInvoiceViewerProps) {
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    async function fetchInvoiceData() {
      try {
        setLoading(true);
        // 1. Fetch invoice details
        const { data: invData, error: invErr } = await supabase
          .from('digital_invoices')
          .select('*')
          .eq('invoice_number', invoiceNumber)
          .maybeSingle();

        if (invErr || !invData) {
          console.error('Invoice fetch error:', invErr);
          setLoading(false);
          return;
        }
        setInvoice(invData);

        // 2. Fetch shop details & items in parallel
        const [shopRes, itemsRes] = await Promise.all([
          supabase.from('shops').select('*').eq('id', invData.shop_id).maybeSingle(),
          supabase.from('invoice_items').select('*').eq('invoice_id', invData.id)
        ]);

        if (shopRes.data) {
          setShop(shopRes.data);
        }
        if (itemsRes.data) {
          setItems(itemsRes.data);
        }
      } catch (err) {
        console.error('Error fetching invoice details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (invoiceNumber) {
      fetchInvoiceData();
    }
  }, [invoiceNumber]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#F5F1EA]/30 gap-6">
        <Loader2 className="animate-spin text-[#C4A896]" size={36} />
        {/* Pulse Skeleton Layout */}
        <div className="w-full max-w-2xl bg-white border border-[#E8E3DA] rounded-2xl p-6 space-y-6 animate-pulse shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-8 w-32 bg-gray-200 rounded-md" />
              <div className="h-4 w-48 bg-gray-100 rounded-md" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-5 w-24 bg-gray-200 rounded-md ml-auto" />
              <div className="h-4 w-32 bg-gray-100 rounded-md ml-auto" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded-md" />
              <div className="h-4 w-36 bg-gray-100 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-gray-200 rounded-md" />
              <div className="h-4 w-36 bg-gray-100 rounded-md" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-6 space-y-3">
            <div className="h-8 w-full bg-gray-200 rounded-md" />
            <div className="h-6 w-full bg-gray-100 rounded-md" />
            <div className="h-6 w-full bg-gray-100 rounded-md" />
          </div>
          <div className="border-t border-gray-100 pt-6 flex justify-end">
            <div className="h-6 w-32 bg-gray-200 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice || !shop) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#F5F1EA]/30 text-center">
        <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">
          Error Loading Invoice Data
        </p>
        <p className="text-xs text-[#8B8378] mt-1">
          Please verify the invoice number and try again.
        </p>
      </div>
    );
  }

  const primaryColor = shop.invoice_theme_color || '#5C4033';
  const pdfUrl = `/api/invoices/pdf/${invoiceNumber}`;

  const handlePrintA4 = () => {
    window.open(`/api/invoice/print?invoiceNumber=${invoiceNumber}&format=a4`, '_blank');
  };

  const handlePrintThermal = () => {
    window.open(`/api/invoice/print?invoiceNumber=${invoiceNumber}&format=thermal`, '_blank');
  };

  return (
    <div id="print-modal-container" className="flex flex-col h-full bg-[#F5F1EA]/30 overflow-y-auto">
      <style>{`
        @media print {
          aside, nav, header, 
          .no-print, 
          #print-modal-header, 
          #print-modal-actions {
            display: none !important;
          }
          #print-modal-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      {/* Action Header Bar */}
      <div id="print-modal-actions" className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-b border-[#E8E3DA] shrink-0">
        <button
          onClick={handlePrintA4}
          className="flex items-center gap-2 px-4 py-2 bg-[#F5F1EA] text-[#3E3B36] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#E8E3DA] transition-colors border border-[#E8E3DA]"
        >
          <Printer size={14} />
          Print A4
        </button>
        <button
          onClick={handlePrintThermal}
          className="flex items-center gap-2 px-4 py-2 bg-[#F5F1EA] text-[#3E3B36] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#E8E3DA] transition-colors border border-[#E8E3DA]"
        >
          <Printer size={14} />
          Print Thermal POS
        </button>
        <a
          href={`${pdfUrl}?download=true`}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <Download size={14} />
          Download PDF
        </a>
      </div>

      {/* Invoice Layout Canvas */}
      <div id="printable-invoice-content" className="flex-1 flex justify-center p-6 md:p-12">
        <div className="w-full max-w-2xl bg-white border border-[#E8E3DA] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col min-h-[750px] relative">
          
          {/* Top Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-8 border-b border-[#E8E3DA]/60">
            {/* Merchant Identity */}
            <div className="flex items-center gap-4">
              {shop.logo_url ? (
                <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 border border-[#E8E3DA] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shop.logo_url} alt={shop.shop_name} className="h-full w-full object-contain" />
                </div>
              ) : null}
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                  {shop.shop_name}
                </h1>
                <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mt-0.5">
                  Tax Invoice
                </p>
              </div>
            </div>

            {/* Meta details */}
            <div className="text-left sm:text-right space-y-1">
              <h2 className="text-sm font-bold font-mono text-gray-800">
                Invoice No: #{invoice.invoice_number}
              </h2>
              <p className="text-xs text-[#8B8378]">
                Date: {new Date(invoice.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
              {shop.gst_number && (
                <p className="text-xs text-[#8B8378]">
                  GSTIN: {shop.gst_number}
                </p>
              )}
            </div>
          </div>

          {/* Billed From & Billed To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-[#E8E3DA]/60 text-xs">
            <div>
              <p className="font-bold tracking-wider uppercase mb-2" style={{ color: primaryColor }}>
                Billed From
              </p>
              <div className="space-y-1 text-gray-600 font-medium">
                <p className="font-semibold text-gray-900">{shop.shop_name}</p>
                {shop.location_address && <p>{shop.location_address}</p>}
                {(shop.city || shop.state || shop.country) && (
                  <p>
                    {shop.city || ''} {shop.state || ''} {shop.country || ''}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="font-bold tracking-wider uppercase mb-2" style={{ color: primaryColor }}>
                Billed To
              </p>
              <div className="space-y-1 text-gray-600 font-medium">
                <p className="font-semibold text-gray-900">
                  {invoice.customer_name || 'Valued Customer'}
                </p>
                <p>
                  {invoice.customer_phone ? `+${invoice.customer_phone}` : 'Walk-in Customer'}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table Grid */}
          <div className="flex-1 py-8 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-white" style={{ backgroundColor: primaryColor }}>
                  <th className="py-3 px-4 rounded-l-xl font-bold">Product Name</th>
                  <th className="py-3 px-4 font-bold">Serial / Barcode</th>
                  <th className="py-3 px-4 font-bold text-center">Qty</th>
                  <th className="py-3 px-4 font-bold text-right">Price</th>
                  <th className="py-3 px-4 rounded-r-xl font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E3DA]/40 text-xs text-gray-700">
                {items.length === 0 ? (
                  <tr>
                    <td className="py-4 px-4 font-medium">{invoice.customer_name || 'Standard Service'}</td>
                    <td className="py-4 px-4 font-mono text-[#8B8378]">#</td>
                    <td className="py-4 px-4 text-center">1</td>
                    <td className="py-4 px-4 text-right">INR {Number(invoice.total_amount).toFixed(2)}</td>
                    <td className="py-4 px-4 text-right font-semibold">INR {Number(invoice.total_amount).toFixed(2)}</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 px-4 font-medium">{item.product_name || 'Item'}</td>
                      <td className="py-4 px-4 font-mono text-[#8B8378]">
                        {item.barcode_or_serial || '—'}
                      </td>
                      <td className="py-4 px-4 text-center">{item.quantity || 1}</td>
                      <td className="py-4 px-4 text-right">
                        INR {Number(item.price || 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        INR {Number(item.item_total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Block */}
          <div className="pt-6 border-t border-[#E8E3DA]/60 flex justify-end text-sm">
            <div className="flex items-center gap-6">
              <span className="font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                Grand Total:
              </span>
              <span className="text-lg font-bold" style={{ color: primaryColor }}>
                INR {Number(invoice.total_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Centered Absolute Baseline Footer */}
          <div className="pt-8 mt-auto flex flex-col items-center">
            <div className="w-full h-[1px] opacity-20 my-4" style={{ backgroundColor: primaryColor }} />
            
            <p className="text-lg md:text-xl font-serif font-semibold italic text-center tracking-wide my-4" style={{ color: `${primaryColor}cc` }}>
              {invoice.invoice_footer_note || 'Thank you for visiting!'}
            </p>

            {/* Dynamic Storefront QR & Link Block */}
            <div className="my-6 flex flex-col items-center gap-3">
              <div className="p-3 bg-white border border-[#E8E3DA] rounded-2xl shadow-sm inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://broadcast.trueattendly.online/offers/${shop.id}`)}&color=${primaryColor.replace('#', '')}&bgcolor=ffffff`}
                  alt="Storefront Offers QR Code"
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>
              <a
                href={`/offers/${shop.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold transition-colors hover:underline"
                style={{ color: primaryColor }}
              >
                Scan or Tap to View Live Store Flash Offers!
              </a>
            </div>

            <div className="pt-6 text-center">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                Powered by True Attendly
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
