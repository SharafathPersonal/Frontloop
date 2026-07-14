'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  QrCode, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  DollarSign, 
  Check, 
  RefreshCw, 
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Camera,
  X,
  FileDown
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { PdfPreviewModal } from '@/components/PdfPreviewModal';

interface ShopData {
  id: string;
  owner_phone: string;
  contact_number?: string;
  shop_name: string;
  whatsapp_mode: string;
  qr_express_status: string;
  invoice_theme_color?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode: string;
}

interface DigitalInvoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_phone: string | null;
  customer_name: string | null;
  total_amount: number;
  pdf_url: string | null;
  status: string;
  created_at: string;
}

export default function MobilePOSDigitalBillPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  // Local cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Item builder inputs state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemBarcode, setItemBarcode] = useState('');

  // Checkout inputs state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Camera Barcode Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopActive = useRef(false);


  // Active streamed QR state
  const [activeInvoice, setActiveInvoice] = useState<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    customerName: string;
    customerPhone: string | null;
    pdfUrl: string;
    status: string;
  } | null>(null);

  // State for in-app PDF preview
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState<string | null>(null);

  // Realtime subscription ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // Auto-generate invoice number format (e.g. INV-20260713-12345)
  const generateNextInvoiceNumber = useCallback(() => {
    // Implement a zero-collision identifier sequence format
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
    const randomSuffix = Math.floor(10000 + Math.random() * 90000); // Unique 5-digit jitter
    const uniqueInvoiceNumber = `INV-${dateStamp}-${randomSuffix}`;
    setInvoiceNumber(uniqueInvoiceNumber);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: shopData } = await supabase
        .from('shops')
        .select('id, owner_phone, contact_number, shop_name, whatsapp_mode, qr_express_status, invoice_theme_color, gst_number')
        .eq('id', user.id)
        .single();

      if (shopData) {
        setShop(shopData);
      }
    } catch (err) {
      console.error('Error loading digital invoice data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadData();
    generateNextInvoiceNumber();
  }, [loadData, generateNextInvoiceNumber]);

  // Realtime status updates tracking
  useEffect(() => {
    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`digital-invoices-pos-realtime-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'digital_invoices', filter: `shop_id=eq.${user.id}` },
          (payload) => {
            const updatedRecord = payload.new as DigitalInvoice;
            
            // If this is our active streamed QR, check status updates
            setActiveInvoice(prev => {
              if (prev && prev.id === updatedRecord.id) {
                if (updatedRecord.status === 'delivered' && prev.status !== 'delivered') {
                  showToast(`✨ Invoice #${updatedRecord.invoice_number} successfully delivered & lead captured!`, 'success');
                  // Collapse modal viewport & clear local basket state
                  setCart([]);
                  setItemName('');
                  setItemPrice('');
                  setItemQuantity('1');
                  setItemBarcode('');
                  setCustomerName('');
                  generateNextInvoiceNumber();
                  return null; // collapse modal
                }
                return {
                  ...prev,
                  status: updatedRecord.status,
                  customerPhone: updatedRecord.customer_phone
                };
              }
              return prev;
            });
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    setupSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [showToast, generateNextInvoiceNumber]);

  // Camera start / stop handlers
  const startCamera = async () => {
    setScannerError('');
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        
        scanLoopActive.current = true;
        requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setScannerError('Could not access camera. Please verify permissions or enter code manually.');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    scanLoopActive.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Frame tick scan logic
  const scanTick = async () => {
    if (!scanLoopActive.current) return;

    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Native Barcode Detector check
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
            });
            const barcodes = await detector.detect(canvas);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              setItemBarcode(code);
              showToast(`Scanned Code: ${code}`, 'success');
              stopCamera();
              return;
            }
          } catch (e) {
            console.error('Barcode detection error:', e);
          }
        }
      }
    }

    if (scanLoopActive.current) {
      setTimeout(() => {
        requestAnimationFrame(scanTick);
      }, 150); // Cap frame inspections to prevent CPU locking
    }
  };

  // Add Item to Local Cart Basket
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice.trim()) {
      showToast('Product Name and Price are required.', 'error');
      return;
    }

    const priceNum = parseFloat(itemPrice);
    const qtyNum = parseInt(itemQuantity, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Price must be a valid number greater than 0', 'error');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Quantity must be a positive integer', 'error');
      return;
    }

    const newItem: CartItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: itemName.trim(),
      price: priceNum,
      quantity: qtyNum,
      barcode: itemBarcode.trim()
    };

    setCart(prev => [...prev, newItem]);
    
    // Reset builder inputs (keep focus-friendly)
    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
    setItemBarcode('');
    showToast('Product added to basket', 'success');
  };

  // Remove Item from Cart Basket
  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    showToast('Product removed from basket', 'success');
  };

  // Calculate Grand Total
  const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Submit and Generate QR Transaction
  const handleGenerateInvoice = async () => {
    if (!shop) return;
    if (cart.length === 0) {
      showToast('Your basket is empty. Add products before generating invoice.', 'error');
      return;
    }
    if (!invoiceNumber.trim()) {
      showToast('Please specify an Invoice Number.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const invoiceNum = invoiceNumber.trim();
      const clientName = customerName.trim() || 'Valued Customer';
      
      // Setup PDF download link targeting our serverless endpoint
      const pdfLink = `https://broadcast.trueattendly.online/api/invoices/pdf/${invoiceNum}`;

      // Insert parent invoice and child items atomically using PostgreSQL RPC
      const { data: invoiceData, error: transactionErr } = await supabase.rpc(
        'create_digital_invoice_with_items',
        {
          p_shop_id: shop.id,
          p_invoice_number: invoiceNum,
          p_customer_name: clientName,
          p_total_amount: grandTotal,
          p_pdf_url: pdfLink,
          p_items: cart.map(item => ({
            product_name: item.name,
            barcode_or_serial: item.barcode || null,
            quantity: item.quantity,
            price: item.price,
            item_total: item.price * item.quantity
          }))
        }
      );

      if (transactionErr) throw transactionErr;

      // Populate streamed active QR view state
      setActiveInvoice({
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoice_number,
        totalAmount: Number(invoiceData.total_amount),
        customerName: invoiceData.customer_name || 'Valued Customer',
        customerPhone: invoiceData.customer_phone,
        pdfUrl: invoiceData.pdf_url || '',
        status: invoiceData.status
      });

      showToast('🚀 QR Code generated! Stream active at counter.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to submit invoice transaction.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate WhatsApp deep link for the QR Code
  const whatsappUrl = shop && activeInvoice
    ? `https://wa.me/${(shop.contact_number || shop.owner_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Get my Bill ${activeInvoice.invoiceNumber}`)}`
    : '';

  const qrImageSrc = whatsappUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(whatsappUrl)}&color=1A1A1A`
    : '';

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 px-2 sm:px-4 md:max-w-4xl">
      
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E8E3DA] pb-4">
        <div>
          <h1 className="text-2xl font-bold serif-headline text-[#3E3B36]">Billing Counter</h1>
          <p className="text-[10px] tracking-widest uppercase text-[#8B8378] mt-1 font-semibold">Mobile POS & Lead Terminal</p>
        </div>
        <Link 
          href="/dashboard/digital-bill/manage"
          className="text-xs font-bold tracking-widest text-[#C4A896] hover:text-[#b09482] uppercase flex items-center gap-1.5 transition-colors"
        >
          View Ledger <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: Item Builder & Cart Basket */}
        <div className="space-y-6">
          
          {/* Card: Add product form */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#C4A896] rounded-full"></span>
              Add Item to Cart
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cotton Shirt"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Barcode / Serial Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter or scan barcode"
                    value={itemBarcode}
                    onChange={(e) => setItemBarcode(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                  />
                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-2.5 border border-[#C4A896] text-[#C4A896] hover:bg-[#F5F1EA] transition-colors rounded-lg flex items-center justify-center"
                    title="Scan Barcode via Camera"
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#3E3B36] text-[#F5F1EA] py-3 rounded-lg text-xs font-bold tracking-widest uppercase hover:bg-[#2A2825] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add Product
              </button>
            </form>
          </div>

          {/* Card: Current basket */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[#C4A896] rounded-full"></span>
                Basket ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[#E8E3DA] rounded-xl">
                <p className="text-xs text-[#8B8378]">Your basket is empty.</p>
                <p className="text-[10px] text-[#8B8378] mt-1">Add items above to start checkout.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-[#F9F7F4] rounded-xl border border-[#E8E3DA] group">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#3E3B36] truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#8B8378]">
                        <span>Qty: {item.quantity}</span>
                        <span>•</span>
                        <span>₹{item.price.toFixed(2)}</span>
                        {item.barcode && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.barcode}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#3E3B36]">₹{(item.price * item.quantity).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[#8B8378] hover:text-red-500 transition-colors p-1"
                        title="Remove product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Customer Details & Checkout QR Generator */}
        <div className="space-y-6">
          
          {/* Card: Invoice info */}
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[#3E3B36] uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[#C4A896] rounded-full"></span>
              Checkout Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Invoice Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                  />
                  <button
                    type="button"
                    onClick={generateNextInvoiceNumber}
                    className="p-2.5 border border-[#E8E3DA] rounded-lg hover:bg-[#F5F1EA] text-[#3E3B36] flex items-center justify-center"
                    title="Generate invoice ID"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] tracking-widest uppercase font-bold text-[#8B8378] mb-1">Customer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E8E3DA] text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896]"
                />
              </div>

              {/* Aggregated totals */}
              <div className="bg-[#F9F7F4] rounded-xl p-4 border border-[#E8E3DA] space-y-2">
                <div className="flex justify-between text-xs text-[#8B8378]">
                  <span>Items Count:</span>
                  <span className="font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E8E3DA]">
                  <span className="text-xs font-bold text-[#3E3B36]">Grand Total:</span>
                  <span className="text-lg font-bold text-[#C4A896]">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={cart.length === 0 || isGenerating}
                className="w-full bg-[#C4A896] hover:bg-[#b09482] text-white py-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <QrCode size={14} /> Generate QR Bill
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: CAMERA SCANNER OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 flex flex-col justify-center items-center z-50 p-4">
          <div className="relative w-full max-w-sm bg-[#1E1B18] rounded-2xl border border-white/10 overflow-hidden flex flex-col items-center">
            
            <div className="w-full p-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Camera Scan</span>
              <button 
                onClick={stopCamera}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
              <video 
                ref={videoRef} 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs */}
              <div className="absolute inset-8 border-2 border-dashed border-[#C4A896]/50 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-full h-0.5 bg-red-500 animate-pulse absolute"></div>
              </div>
            </div>

            {/* Camera scanner status and guidance */}
            <div className="w-full p-4 space-y-2 bg-[#1E1B18] border-t border-white/5">
              {scannerError && (
                <p className="text-[10px] text-red-400 text-center font-medium leading-relaxed">{scannerError}</p>
              )}
              <p className="text-[10px] text-white/40 text-center">Place barcode/QR inside the scanner viewfinder frame.</p>
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER QR STREAMING VIEWER */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-[#1E1B18]/95 flex flex-col justify-center items-center z-50 p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm bg-[#1E1B18] rounded-3xl p-6 text-center border border-white/10 shadow-2xl space-y-4 my-auto">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <span className="text-[10px] tracking-widest uppercase font-bold text-[#8B8378]">Checkout QR Code</span>
              <span className="bg-[#C4A896]/20 border border-[#C4A896]/30 text-[#C4A896] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                {activeInvoice.invoiceNumber}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl inline-block shadow-lg">
              {qrImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageSrc}
                  alt="Checkout QR Code"
                  width={220}
                  height={220}
                  className="mx-auto object-contain"
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-100 rounded-xl">
                  <Loader2 className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {/* Quick-action overrides */}
            <div className="flex gap-2 justify-center w-full max-w-[260px] mx-auto mt-2">
              <button
                type="button"
                onClick={() => setPreviewInvoiceNumber(activeInvoice.invoiceNumber)}
                className="flex-1 py-2 px-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
              >
                🔍 View Bill
              </button>
              {activeInvoice.pdfUrl && (
                <a
                  href={`${activeInvoice.pdfUrl}${activeInvoice.pdfUrl.includes('?') ? '&' : '?'}download=true`}
                  className="flex-1 py-2 px-3 bg-[#C4A896] hover:bg-[#b09482] text-[#1E1B18] rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  📥 Download Bill
                </a>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-amber-400 animate-pulse text-xs font-semibold">
                <Clock size={14} />
                <span>Waiting for Customer Scan...</span>
              </div>
              <p className="text-[9px] text-[#8B8378] tracking-widest uppercase leading-normal">
                Customer scans to verify and get bill on WhatsApp
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 font-mono text-[11px] text-[#E8E3DA] select-all flex items-center justify-center gap-1.5">
                <FileText size={12} className="text-[#C4A896]" />
                <span>Get my Bill {activeInvoice.invoiceNumber}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-[#8B8378]">Bill Total:</span>
              <span className="font-bold text-emerald-400 text-sm">₹{activeInvoice.totalAmount.toFixed(2)}</span>
            </div>

            <div className="flex gap-3 pt-2">
              {activeInvoice.pdfUrl && (
                <a
                  href={`${activeInvoice.pdfUrl}${activeInvoice.pdfUrl.includes('?') ? '&' : '?'}download=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#C4A896] hover:bg-[#b09482] text-[#1E1B18] font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileDown size={14} /> Download Bill
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveInvoice(null)}
                className="flex-1 py-3 border border-white/10 text-white/70 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold tracking-widest uppercase transition-colors"
              >
                Close View
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* NATIVE IN-APP PDF VIEWER OVERLAY */}
      <PdfPreviewModal
        invoiceNumber={previewInvoiceNumber}
        onClose={() => setPreviewInvoiceNumber(null)}
      />

    </div>
  );
}
