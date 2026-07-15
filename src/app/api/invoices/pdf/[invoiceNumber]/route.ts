import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import crypto from 'crypto';

export async function GET(
  request: Request,
  props: { params: Promise<{ invoiceNumber: string }> }
) {
  const params = await props.params;
  const { invoiceNumber } = params;

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
      .eq('invoice_number', invoiceNumber)
      .maybeSingle();

    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Security Validation: Require dynamic hmac signature OR valid merchant session matching the shop_id
    let isAuthorized = false;

    // A. Check signed URL dynamic HMAC token (public access via WhatsApp)
    const { searchParams } = new URL(request.url);
    const sig = searchParams.get('sig');
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(invoiceNumber)
      .digest('hex');

    if (sig === expectedSignature) {
      isAuthorized = true;
    } else {
      // B. Fall back to cookie-based merchant session validation
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
        console.error('[PDF API Authorization] Failed cookie session check:', authErr);
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied: Unauthorized to view this invoice' }, { status: 403 });
    }

    // 2. Fetch shop details
    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('*')
      .eq('id', invoice.shop_id)
      .maybeSingle();

    if (shopErr || !shop) {
      return NextResponse.json({ error: 'Shop config not found' }, { status: 404 });
    }

    // 3. Fetch invoice items
    const { data: items, error: itemsErr } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (itemsErr) {
      return NextResponse.json({ error: 'Failed to fetch invoice items' }, { status: 500 });
    }

    // 4. Create jsPDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const rawThemeColor = shop.invoice_theme_color || '#5C4033';
    const primaryColorRGB = hexToRgb(rawThemeColor) || { r: 92, g: 64, b: 51 };

    // Fetch and embed logo if available
    let logoBase64 = '';
    let logoType = 'PNG';
    if (shop.logo_url && shop.logo_url.trim()) {
      try {
        const response = await fetch(shop.logo_url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          logoBase64 = Buffer.from(arrayBuffer).toString('base64');
          if (shop.logo_url.toLowerCase().endsWith('.jpg') || shop.logo_url.toLowerCase().endsWith('.jpeg')) {
            logoType = 'JPEG';
          }
        }
      } catch (logoErr) {
        console.error('[PDF Generator] Error fetching logo image:', logoErr);
      }
    }

    // Render Header Section
    let startY = 15;
    if (logoBase64) {
      try {
        doc.addImage(`data:image/${logoType.toLowerCase()};base64,${logoBase64}`, logoType, 15, startY, 20, 20);
        doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(shop.shop_name || 'INVOICE', 40, startY + 13);
        startY = 42;
      } catch (e) {
        console.error('[PDF Generator] Failed to add logo image to PDF:', e);
        doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(shop.shop_name || 'INVOICE', 15, startY + 5);
        startY = 28;
      }
    } else {
      // Styled text fallback for brand name if logo is absent
      doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(shop.shop_name || 'INVOICE', 15, startY + 5);
      startY = 28;
    }

    // Invoice Meta / Bill Info (Right side header) - Enforce warm brown palette
    doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Invoice No: #${invoice.invoice_number}`, 140, 18);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 140, 23);
    if (shop.gst_number) {
      doc.text(`GSTIN: ${shop.gst_number}`, 140, 28);
    }
    
    // Horizontal divider
    doc.setDrawColor(232, 227, 218);
    doc.setLineWidth(0.5);
    doc.line(15, startY, 195, startY);
    startY += 10;

    // Billing details block
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    doc.text('BILLED FROM', 15, startY);
    doc.text('BILLED TO', 110, startY);
    
    startY += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    // Store info
    const shopAddr = [
      shop.shop_name,
      shop.location_address,
      `${shop.city || ''} ${shop.state || ''} ${shop.country || ''}`.trim()
    ].filter(Boolean);
    
    shopAddr.forEach((line, idx) => {
      doc.text(line, 15, startY + (idx * 4.5));
    });

    // Customer info
    const customerPhoneFormatted = invoice.customer_phone ? `+${invoice.customer_phone}` : 'Walk-in Customer';
    doc.text(invoice.customer_name || 'Valued Customer', 110, startY);
    doc.text(customerPhoneFormatted, 110, startY + 4.5);

    startY += 20;

    // Items table header bar
    doc.setFillColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    doc.rect(15, startY, 180, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Product Name', 18, startY + 5.5);
    doc.text('Serial / Barcode', 85, startY + 5.5);
    doc.text('Qty', 135, startY + 5.5);
    doc.text('Price', 155, startY + 5.5);
    doc.text('Total', 178, startY + 5.5);

    startY += 8;

    // Table rows - Enforce warm brown palette
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);

    const itemsList = items || [];
    if (itemsList.length === 0) {
      // Fallback row if no child items were created (e.g. legacy invoice)
      doc.text(invoice.customer_name || 'Standard Service', 18, startY + 6);
      doc.text('—', 85, startY + 6);
      doc.text('1', 135, startY + 6);
      doc.text(`INR ${Number(invoice.total_amount).toFixed(2)}`, 155, startY + 6);
      doc.text(`INR ${Number(invoice.total_amount).toFixed(2)}`, 178, startY + 6);
      startY += 10;
    } else {
      itemsList.forEach((item) => {
        // Draw row bottom line
        doc.setDrawColor(245, 241, 234);
        doc.line(15, startY + 8, 195, startY + 8);

        doc.text(item.product_name || 'Item', 18, startY + 5);
        doc.text(item.barcode_or_serial || '—', 85, startY + 5);
        doc.text(String(item.quantity || 1), 135, startY + 5);
        doc.text(`INR ${Number(item.price || 0).toFixed(2)}`, 155, startY + 5);
        doc.text(`INR ${Number(item.item_total || 0).toFixed(2)}`, 178, startY + 5);
        startY += 8;
      });
    }

    startY += 10;

    // Totals block
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    doc.text('Grand Total:', 135, startY);
    doc.text(`INR ${Number(invoice.total_amount).toFixed(2)}`, 165, startY);

    // Decorative line above footer
    doc.setDrawColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    doc.setLineWidth(0.3);
    doc.line(15, 235, 195, 235);

    // Dynamic, stylized invoice footer note
    const footerNote = invoice.invoice_footer_note || 'Thank you for visiting!';
    doc.setFont('Times', 'BoldItalic');
    doc.setFontSize(13);
    doc.setTextColor(primaryColorRGB.r, primaryColorRGB.g, primaryColorRGB.b);
    const splitNote = doc.splitTextToSize(footerNote, 160);
    const noteY = 231 - (splitNote.length * 4.5);
    splitNote.forEach((line: string, index: number) => {
      doc.text(line, 105, noteY + (index * 4.5), { align: 'center' });
    });

    // Fetch and embed storefront QR code
    const storefrontUrl = `https://broadcast.trueattendly.online/offers/${shop.id}`;
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(storefrontUrl)}&color=1a1a1a&bgcolor=ffffff`;
    let qrBase64 = '';
    try {
      const qrResponse = await fetch(qrCodeApiUrl);
      if (qrResponse.ok) {
        const qrArrayBuffer = await qrResponse.arrayBuffer();
        qrBase64 = Buffer.from(qrArrayBuffer).toString('base64');
      }
    } catch (qrErr) {
      console.error('[PDF Generator] Error fetching QR code image:', qrErr);
    }

    // Render QR Code in PDF if fetched successfully
    if (qrBase64) {
      try {
        doc.addImage(`data:image/png;base64,${qrBase64}`, 'PNG', 91, 238, 28, 28);
        doc.link(91, 238, 28, 28, { url: storefrontUrl });
      } catch (qrAddErr) {
        console.error('[PDF Generator] Failed to add QR image to PDF:', qrAddErr);
      }
    }

    // Interactive Text Hyperlink
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 102, 204); // Nice professional blue
    const linkText = "Scan or Tap to Discover Live Shop Offers!";
    doc.text(linkText, 105, 272, { align: 'center' });
    
    // Compute width of link text to create clickable link area
    const linkWidth = doc.getTextWidth(linkText);
    doc.link(105 - (linkWidth / 2), 268, linkWidth, 6, { url: storefrontUrl });

    // Absolute footer text - statically anchored
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('Powered by True Attendly', 105, 280, { align: 'center' });

    // Output raw PDF bytes
    const pdfBuffer = doc.output('arraybuffer');

    const shouldDownload = searchParams.get('download') === 'true';
    const contentDisposition = shouldDownload ? 'attachment' : 'inline';

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${contentDisposition}; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (err: any) {
    console.error('[PDF API ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
