import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * HTML Sanitization Helper to prevent Stored & Reflected XSS
 * (Fixes CRITICAL #3)
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invoiceNumberRaw = searchParams.get('invoiceNumber');
  const formatRaw = searchParams.get('format') || 'a4'; // 'a4' or 'thermal'

  if (!invoiceNumberRaw) {
    return new Response('Missing invoiceNumber parameter', { status: 400 });
  }

  const invoiceNumber = escapeHtml(invoiceNumberRaw);
  const format = formatRaw === 'thermal' ? 'thermal' : 'a4';

  // Initialize Supabase admin client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Fetch invoice details
    const { data: invoice, error: invoiceErr } = await supabase
      .from('digital_invoices')
      .select('*')
      .eq('invoice_number', invoiceNumberRaw)
      .maybeSingle();

    if (invoiceErr || !invoice) {
      return new Response('Invoice not found', { status: 404 });
    }

    // 2. Security Validation: HMAC signature OR valid merchant session
    // (Fixes CRITICAL #5: Uses INVOICE_SIGNING_SECRET instead of SUPABASE_SERVICE_ROLE_KEY)
    let isAuthorized = false;
    const sig = searchParams.get('sig');
    const secret = process.env.INVOICE_SIGNING_SECRET || process.env.ADMIN_SECURE_TOKEN || 'invoice_signing_secret_fallback';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(invoiceNumberRaw)
      .digest('hex');

    if (sig === expectedSignature) {
      isAuthorized = true;
    } else {
      try {
        const cookieStore = await cookies();
        const userClient = createServerClient<any>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() { return cookieStore.getAll(); },
              setAll(cookiesToSet) {
                try {
                  cookiesToSet.forEach(({ name, value, options }) =>
                    cookieStore.set(name, value, options)
                  );
                } catch { /* noop */ }
              },
            },
          }
        );
        const { data: { user } } = await userClient.auth.getUser();
        if (user && user.id === invoice.shop_id) {
          isAuthorized = true;
        }
      } catch (authErr) {
        console.error('[Print API Authorization] Failed cookie session check:', authErr);
      }
    }

    if (!isAuthorized) {
      return new Response('Access denied: Unauthorized to print this invoice', { status: 403 });
    }

    // 3. Fetch shop config
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('*')
      .eq('id', invoice.shop_id)
      .maybeSingle();

    if (shopErr || !shop) {
      return new Response('Shop configuration not found', { status: 404 });
    }

    // 4. Fetch invoice items
    const { data: items, error: itemsErr } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (itemsErr) {
      return new Response('Failed to load invoice items', { status: 500 });
    }

    // Sanitize dynamic shop & invoice fields (Fixes CRITICAL #3)
    const shopName = escapeHtml(shop.shop_name);
    const shopAddress = escapeHtml(shop.location_address);
    const shopCity = escapeHtml(shop.city);
    const shopState = escapeHtml(shop.state);
    const shopCountry = escapeHtml(shop.country);
    const shopGst = escapeHtml(shop.gst_number);
    const shopLogoUrl = shop.logo_url ? escapeHtml(shop.logo_url) : null;
    const customerName = escapeHtml(invoice.customer_name || 'Valued Customer');
    const customerPhone = escapeHtml(invoice.customer_phone ? `+${invoice.customer_phone}` : '');
    const invoiceFooterNote = escapeHtml(invoice.invoice_footer_note || 'Thank you for your visit!');
    const sanitizedSig = escapeHtml(sig || '');

    const rawPrimaryColor = shop.invoice_theme_color || '#5C4033';
    const primaryColor = /^#[0-9A-Fa-f]{6}$/.test(rawPrimaryColor) ? rawPrimaryColor : '#5C4033';
    
    const storefrontUrl = `https://broadcast.trueattendly.online/offers/${encodeURIComponent(shop.id)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(storefrontUrl)}&color=${primaryColor.replace('#', '')}&bgcolor=ffffff`;

    const invoiceDate = escapeHtml(new Date(invoice.created_at).toLocaleDateString('en-IN', {
      dateStyle: 'long'
    }));

    const itemsList = items || [];
    const subtotal = itemsList.reduce((sum: number, item: any) => sum + (item.item_total || 0), 0);
    const finalAmount = Number(invoice.total_amount || subtotal);

    // HTML Output Builder
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Print Invoice #${invoiceNumber}</title>
  <style>
    /* Reset and base styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-smooth: antialiased;
      -webkit-font-smoothing: antialiased;
    }

    /* Print triggers and styles */
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: #fff !important;
        color: #000 !important;
      }
    }

    /* A4 Layout CSS */
    body.format-a4 {
      background-color: #FAF9F6;
      color: #3E3B36;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 40px 20px;
    }

    .a4-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #E8E3DA;
      border-radius: 24px;
      padding: 48px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      min-height: 1000px;
      display: flex;
      flex-direction: column;
    }

    .a4-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      border-bottom: 1px solid #E8E3DA;
      padding-bottom: 24px;
      margin-bottom: 30px;
    }

    .a4-logo-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .a4-logo {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      border: 1px solid #E8E3DA;
      object-fit: contain;
      background: #fff;
    }

    .a4-title {
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .a4-meta {
      text-align: right;
      font-size: 13px;
      line-height: 1.5;
    }

    .a4-meta h2 {
      font-family: monospace;
      font-size: 15px;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .a4-billing-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
      font-size: 13px;
    }

    .a4-billing-col h3 {
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 12px;
      font-size: 11px;
    }

    .a4-billing-details {
      line-height: 1.6;
      color: #666;
    }

    .a4-billing-details strong {
      color: #333;
    }

    .a4-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      font-size: 13px;
    }

    .a4-table th {
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 1px;
      padding: 12px 16px;
    }

    .a4-table th:first-child { border-radius: 8px 0 0 8px; }
    .a4-table th:last-child { border-radius: 0 8px 8px 0; }

    .a4-table td {
      padding: 16px;
      border-bottom: 1px solid #F5F1EA;
      color: #4A4A4A;
    }

    .a4-table tr:last-child td {
      border-bottom: none;
    }

    .a4-total-block {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 24px;
      padding-top: 24px;
      border-t: 1px solid #E8E3DA;
      margin-top: auto;
      font-size: 14px;
    }

    .a4-total-label {
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .a4-total-value {
      font-size: 20px;
      font-weight: 800;
    }

    .a4-footer {
      border-top: 1px solid #E8E3DA;
      margin-top: 40px;
      padding-top: 24px;
      text-align: center;
    }

    .a4-footer-note {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 16px;
      margin-bottom: 24px;
    }

    .a4-marketing-box {
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .a4-qr-img {
      border: 1px solid #E8E3DA;
      border-radius: 16px;
      padding: 8px;
      background: #fff;
    }

    .a4-marketing-link {
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: color 0.2s;
    }

    .a4-marketing-link:hover {
      text-decoration: underline;
    }

    .a4-power-text {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    /* Thermal POS Layout CSS */
    body.format-thermal {
      background-color: #ffffff;
      color: #000000;
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      padding: 4px;
      width: 76mm;
      margin: 0 auto;
    }

    .thermal-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    .thermal-center {
      text-align: center;
      margin-bottom: 12px;
    }

    .thermal-bold {
      font-weight: bold;
    }

    .thermal-title {
      font-size: 16px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .thermal-divider {
      border-top: 1px dashed #000000;
      margin: 8px 0;
      height: 0;
    }

    .thermal-meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .thermal-address {
      font-size: 11px;
      line-height: 1.3;
      margin-bottom: 4px;
    }

    .thermal-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 11px;
    }

    .thermal-table th {
      border-bottom: 1px dashed #000000;
      text-align: left;
      padding: 4px 0;
      font-weight: bold;
    }

    .thermal-table td {
      padding: 6px 0;
    }

    .thermal-total-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 13px;
      margin-top: 6px;
    }

    .thermal-qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 16px 0 8px 0;
      gap: 6px;
    }

    .thermal-qr-img {
      border: 1px solid #000;
      padding: 4px;
      width: 100px;
      height: 100px;
    }

    .thermal-link {
      font-size: 9px;
      color: #000;
      text-decoration: underline;
      font-weight: bold;
      text-align: center;
      word-break: break-all;
    }

    .thermal-footer-note {
      font-style: italic;
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
    }

    .thermal-power-text {
      font-size: 9px;
      text-align: center;
      margin-top: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Print control toolbar (visible on screen only) */
    .print-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 56px;
      background: #1a1a1a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .print-toolbar-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .print-toolbar-actions {
      display: flex;
      gap: 12px;
    }

    .print-btn {
      background: ${primaryColor};
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .print-btn-secondary {
      background: #333333;
      color: #ffffff;
      border: 1px solid #444444;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .print-btn:hover, .print-btn-secondary:hover {
      opacity: 0.9;
    }

    /* Adjust page container when toolbar is visible */
    body {
      padding-top: 56px !important;
    }

    @media print {
      body {
        padding-top: 0 !important;
      }
    }
  </style>
</head>
<body class="format-${format}">

  <!-- Print Control Toolbar (Screen Only) -->
  <div class="print-toolbar no-print">
    <div class="print-toolbar-title">
      True Attendly Print Terminal &middot; Invoice #${invoiceNumber} (${format.toUpperCase()})
    </div>
    <div class="print-toolbar-actions">
      <a href="?invoiceNumber=${invoiceNumber}&format=${format === 'thermal' ? 'a4' : 'thermal'}&sig=${sanitizedSig}" class="print-btn-secondary">
        Switch to ${format === 'thermal' ? 'A4 Paper' : 'Thermal POS'}
      </a>
      <button onclick="window.print()" class="print-btn">
        Execute Print
      </button>
    </div>
  </div>
`;

    if (format === 'thermal') {
      // Thermal POS layout output
      html += `
  <div class="thermal-container">
    <div class="thermal-center">
      <div class="thermal-bold thermal-title">${shopName}</div>
      ${shopAddress ? `<div class="thermal-address">${shopAddress}</div>` : ''}
      ${shopCity || shopState ? `<div class="thermal-address">${shopCity} ${shopState}</div>` : ''}
      <div class="thermal-bold">TAX RECEIPT</div>
    </div>

    <div class="thermal-divider"></div>

    <div class="thermal-meta-row">
      <span>Invoice:</span>
      <span class="thermal-bold">#${invoiceNumber}</span>
    </div>
    <div class="thermal-meta-row">
      <span>Date:</span>
      <span>${invoiceDate}</span>
    </div>
    ${shopGst ? `
    <div class="thermal-meta-row">
      <span>GSTIN:</span>
      <span>${shopGst}</span>
    </div>` : ''}

    <div class="thermal-divider"></div>

    <div class="thermal-meta-row thermal-bold">
      <span>Billed To:</span>
      <span>${customerName}</span>
    </div>
    <div class="thermal-meta-row">
      <span>Phone:</span>
      <span>${customerPhone || 'Walk-in'}</span>
    </div>

    <div class="thermal-divider"></div>

    <table class="thermal-table">
      <thead>
        <tr>
          <th width="50%">Item</th>
          <th width="15%" style="text-align: center;">Qty</th>
          <th width="35%" style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList.length === 0 ? `
        <tr>
          <td>Standard Service</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">₹${finalAmount.toFixed(2)}</td>
        </tr>
        ` : itemsList.map((item: any) => {
          const itemName = escapeHtml(item.product_name);
          const itemBarcode = escapeHtml(item.barcode_or_serial);
          return `
        <tr>
          <td>
            ${itemName}
            ${itemBarcode ? `<br/><span style="font-size: 9px; opacity: 0.8;">[${itemBarcode}]</span>` : ''}
          </td>
          <td style="text-align: center;">${item.quantity || 1}</td>
          <td style="text-align: right;">₹${Number(item.item_total).toFixed(2)}</td>
        </tr>
        `;
        }).join('')}
      </tbody>
    </table>

    <div class="thermal-divider"></div>

    <div class="thermal-total-row">
      <span>GRAND TOTAL:</span>
      <span>₹${finalAmount.toFixed(2)}</span>
    </div>

    <div class="thermal-divider"></div>

    <!-- Mandatory marketing QR and Link loop -->
    <div class="thermal-qr-container">
      <img class="thermal-qr-img" src="${qrCodeUrl}" alt="Storefront QR" />
      <a class="thermal-link" href="${storefrontUrl}" target="_blank">
        Scan/Tap for active Flash Offers!
      </a>
      <div style="font-size: 8px; opacity: 0.7; text-align: center; margin-top: 2px;">
        broadcast.trueattendly.online/offers/${encodeURIComponent(shop.id)}
      </div>
    </div>

    <div class="thermal-footer-note">
      ${invoiceFooterNote}
    </div>

    <div class="thermal-power-text">
      Powered by True Attendly
    </div>
  </div>
`;
    } else {
      // A4 corporate sheets layout output
      html += `
  <div class="a4-container">
    <!-- Top Brand Header -->
    <div class="a4-header">
      <div class="a4-logo-title">
        ${shopLogoUrl ? `<img class="a4-logo" src="${shopLogoUrl}" alt="logo" />` : ''}
        <div>
          <h1 class="a4-title" style="color: ${primaryColor}">${shopName}</h1>
          <p style="font-size: 10px; text-transform: uppercase; tracking: 1.5px; color: #8B8378; margin-top: 2px;">Tax Invoice</p>
        </div>
      </div>
      <div class="a4-meta">
        <h2 style="color: ${primaryColor}">Invoice No: #${invoiceNumber}</h2>
        <p>Date: ${invoiceDate}</p>
        ${shopGst ? `<p>GSTIN: ${shopGst}</p>` : ''}
      </div>
    </div>

    <!-- Billing Columns -->
    <div class="a4-billing-grid">
      <div class="a4-billing-col">
        <h3 style="color: ${primaryColor}">Billed From</h3>
        <div class="a4-billing-details">
          <strong>${shopName}</strong><br/>
          ${shopAddress ? `${shopAddress}<br/>` : ''}
          ${shopCity} ${shopState} ${shopCountry}
        </div>
      </div>
      <div class="a4-billing-col">
        <h3 style="color: ${primaryColor}">Billed To</h3>
        <div class="a4-billing-details">
          <strong>${customerName}</strong><br/>
          ${customerPhone || 'Walk-in Customer'}
        </div>
      </div>
    </div>

    <!-- Items List Table -->
    <table class="a4-table">
      <thead>
        <tr style="background-color: ${primaryColor}">
          <th width="40%">Product / Service Description</th>
          <th width="20%">Barcode/Serial</th>
          <th width="10%" style="text-align: center;">Qty</th>
          <th width="15%" style="text-align: right;">Unit Price</th>
          <th width="15%" style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsList.length === 0 ? `
        <tr>
          <td>Standard Service</td>
          <td style="font-family: monospace; color: #888;">—</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">₹${finalAmount.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700;">₹${finalAmount.toFixed(2)}</td>
        </tr>
        ` : itemsList.map((item: any) => {
          const itemName = escapeHtml(item.product_name);
          const itemBarcode = escapeHtml(item.barcode_or_serial || '—');
          return `
        <tr>
          <td style="font-weight: 500; color: #1a1a1a;">${itemName}</td>
          <td style="font-family: monospace; color: #888;">${itemBarcode}</td>
          <td style="text-align: center;">${item.quantity || 1}</td>
          <td style="text-align: right;">₹${Number(item.price).toFixed(2)}</td>
          <td style="text-align: right; font-weight: 700; color: #1a1a1a;">₹${Number(item.item_total).toFixed(2)}</td>
        </tr>
        `;
        }).join('')}
      </tbody>
    </table>

    <!-- Totals Area -->
    <div class="a4-total-block">
      <span class="a4-total-label" style="color: ${primaryColor}">Grand Total:</span>
      <span class="a4-total-value" style="color: ${primaryColor}">₹${finalAmount.toFixed(2)}</span>
    </div>

    <!-- Absolute Footer Marketing Hook -->
    <div class="a4-footer">
      <div class="a4-footer-note" style="color: ${primaryColor}cc">
        ${invoiceFooterNote}
      </div>

      <!-- Universal QR and Link Injection Block -->
      <div class="a4-marketing-box">
        <img class="a4-qr-img" src="${qrCodeUrl}" alt="Active Storefront Offers QR" width="110" height="110" />
        <a class="a4-marketing-link" href="${storefrontUrl}" target="_blank" style="color: ${primaryColor}">
          Scan or Tap to Discover Live Shop Offers!
        </a>
        <div style="font-size: 10px; color: #888; font-family: monospace;">
          broadcast.trueattendly.online/offers/${encodeURIComponent(shop.id)}
        </div>
      </div>

      <div class="a4-power-text">
        Powered by True Attendly
      </div>
    </div>
  </div>
`;
    }

    // Close document body & trigger native print
    html += `
  <script>
    window.onload = function() {
      // Small timeout to guarantee assets like QR image are fully painted
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (err: any) {
    console.error('[Print Router Error]', err);
    return new Response('Internal Server Error: ' + escapeHtml(err.message), { status: 500 });
  }
}
