'use client';

import { useEffect, useState, FormEvent, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { load } from '@cashfreepayments/cashfree-js';
import type { Shop, Wallet, WhatsAppConnectionMode } from '@/types/broadcast';
import { CheckCircle, AlertTriangle, CreditCard, User, Building, ChevronDown, ExternalLink, Zap, Lock, Smartphone, Globe, QrCode, RefreshCw, Wifi, Loader2 } from 'lucide-react';
import { useWhatsAppMode } from '@/contexts/WhatsAppModeContext';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type CreditStatus = 'idle' | 'redirecting';

function SettingsContent() {
  const isVerifying = useRef(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [shopForm, setShopForm] = useState({
    shop_name: '', owner_phone: '', contact_number: '', location_address: '', 
    city: '', district: '', state: '', country: '', industry_type: '',
    meta_access_token: '', meta_phone_number_id: '', meta_business_account_id: '', meta_template_name: '',
    whatsapp_mode: 'NONE' as WhatsAppConnectionMode,
    anti_ban_delay: 45
  });
  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<number>(100);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [creditStatus, setCreditStatus] = useState<CreditStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [manualProviderOpen, setManualProviderOpen] = useState(false);
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>('disconnected');
  const [isQrStarting, setIsQrStarting] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { setMode } = useWhatsAppMode();

  // Modal States
  const [isShopConfirmOpen, setIsShopConfirmOpen] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isMetaDisconnectConfirmOpen, setIsMetaDisconnectConfirmOpen] = useState(false);
  const [globalError, setGlobalError] = useState<{title: string, message: string} | null>(null);

  // Custom QR Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showMetaConfirmModal, setShowMetaConfirmModal] = useState(false);
  const [showExpressWarningModal, setShowExpressWarningModal] = useState(false);

  // Password Reset States
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState<SaveStatus>('idle');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    const metaStatus = searchParams.get('meta_status');
    const orderId = searchParams.get('order_id');

    if (metaStatus === 'success') {
      setIsMetaConnected(true);
      window.history.replaceState({}, '', '/dashboard/settings');
    }

    if (orderId && !isVerifying.current) {
      isVerifying.current = true;
      setCreditStatus('redirecting');
      
      // Immediately clean the URL to prevent re-triggering on page refresh
      window.history.replaceState({}, '', '/dashboard/settings');
      
      // Fallback verification 
      fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setGlobalError({ title: 'Payment Successful', message: 'Your wallet has been credited!' });
        } else {
          setGlobalError({ title: 'Payment Status', message: data.error || 'Payment might be pending or failed.' });
        }
      })
      .catch(err => {
        setGlobalError({ title: 'Verification Error', message: err.message });
      })
      .finally(() => {
        setCreditStatus('idle');
        // Refresh wallet state
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle().then(({ data: w }) => {
              if (w) setWallet(w);
            });
          }
        });
      });
    }
  }, [searchParams, router]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: shopData }, { data: walletData }, { data: pricingData }, { data: metaConfigData }] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
        supabase.from('pricing_tiers').select('*').order('amount_inr', { ascending: true }),
        supabase.from('meta_configs').select('is_connected').eq('shop_id', user.id).maybeSingle(),
      ]);
      if (metaConfigData?.is_connected) {
        setIsMetaConnected(true);
      }
      if (pricingData && pricingData.length > 0) {
        setCreditPacks(pricingData.map((t: any) => ({
          amount: t.credit_count,
          amount_inr: t.amount_inr,
          label: `${t.credit_count} Credits`,
          desc: 'Top-up Package',
          price: `₹${t.amount_inr}`,
        })));
        if (!selectedPack || !pricingData.find((t:any) => t.credit_count === selectedPack)) {
          setSelectedPack(pricingData[0].credit_count);
        }
      }
      if (shopData) {
        setShop(shopData);
        setQrStatus(shopData.qr_express_status || 'disconnected');
        setShopForm({
          shop_name: shopData.shop_name || '',
          owner_phone: shopData.owner_phone || '',
          contact_number: shopData.contact_number || '',
          location_address: shopData.location_address || '',
          city: shopData.city || '',
          district: shopData.district || '',
          state: shopData.state || '',
          country: shopData.country || '',
          industry_type: shopData.industry_type || '',
          meta_access_token: shopData.meta_access_token || '',
          meta_phone_number_id: shopData.meta_phone_number_id || '',
          meta_business_account_id: shopData.meta_business_account_id || '',
          meta_template_name: shopData.meta_template_name || '',
          whatsapp_mode: shopData.whatsapp_mode || 'NONE',
          anti_ban_delay: shopData.anti_ban_delay || 45,
        });
      }
      if (walletData) setWallet(walletData);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (shopForm.whatsapp_mode === 'QR_EXPRESS' && shop?.id) {
      const pollStatus = async () => {
        try {
          const url = process.env.NEXT_PUBLIC_RENDER_SERVER_URL 
            ? `${process.env.NEXT_PUBLIC_RENDER_SERVER_URL}/api/whatsapp/status?shop_id=${shop.id}`
            : `/api/whatsapp/status?shop_id=${shop.id}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setQrStatus(data.status);
            if (data.status === 'connected') {
              setQrCodeString(null);
            }
          }
        } catch (err) {
          console.error('Error polling WhatsApp connection status:', err);
        }
      };

      pollStatus();
      intervalId = setInterval(pollStatus, 7000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [shopForm.whatsapp_mode, shop?.id]);

  const handleGenerateQR = async () => {
    if (!shop?.id) return;
    setIsQrStarting(true);
    try {
      const url = process.env.NEXT_PUBLIC_RENDER_SERVER_URL 
        ? `${process.env.NEXT_PUBLIC_RENDER_SERVER_URL}/api/whatsapp/connect?shop_id=${shop.id}`
        : `/api/whatsapp/connect?shop_id=${shop.id}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to initialize QR session');
      }
      const data = await res.json();
      if (data.qr) {
        setQrCodeString(data.qr);
      }
      setQrStatus('disconnected');
    } catch (err: any) {
      setGlobalError({ title: 'QR Connection Error', message: err.message || 'Failed to start QR session.' });
    } finally {
      setIsQrStarting(false);
    }
  };

  const handleDisconnectQrConnection = async () => {
    setSaveStatus('saving');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('shops').update({
      qr_express_status: 'disconnected',
      whatsapp_mode: 'NONE'
    }).eq('id', user.id);

    await supabase.from('whatsapp_sessions').delete().eq('shop_id', user.id);

    if (!error) {
      setShop(prev => prev ? { ...prev, qr_express_status: 'disconnected', whatsapp_mode: 'NONE' } : null);
      setShopForm(prev => ({ ...prev, whatsapp_mode: 'NONE' }));
      setMode('NONE');
      setQrStatus('disconnected');
      setQrCodeString(null);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  const handleConfirmSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setIsShopConfirmOpen(true);
  };

  const executeSaveProfile = async () => {
    setIsShopConfirmOpen(false);
    setSaveStatus('saving');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('shops').upsert({
      id: user.id,
      shop_name: shopForm.shop_name,
      owner_phone: shopForm.owner_phone,
      contact_number: shopForm.contact_number,
      location_address: shopForm.location_address,
      city: shopForm.city,
      district: shopForm.district,
      state: shopForm.state,
      country: shopForm.country,
      industry_type: shopForm.industry_type,
      meta_access_token: shopForm.meta_access_token,
      meta_phone_number_id: shopForm.meta_phone_number_id,
      meta_business_account_id: shopForm.meta_business_account_id,
      meta_template_name: shopForm.meta_template_name,
      whatsapp_mode: shopForm.whatsapp_mode,
      anti_ban_delay: shopForm.anti_ban_delay,
    }, { onConflict: 'id' });
    setSaveStatus(error ? 'error' : 'saved');
    if (!error) {
      setShop((prev) => prev ? { ...prev, ...shopForm } : prev);
      setMode(shopForm.whatsapp_mode);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleSaveManualCredentials = async (e: FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found.');
      }
      
      const [shopUpdate, metaConfigUpdate] = await Promise.all([
        supabase.from('shops').update({
          meta_access_token: shopForm.meta_access_token,
          meta_phone_number_id: shopForm.meta_phone_number_id,
          meta_business_account_id: shopForm.meta_business_account_id,
          meta_template_name: shopForm.meta_template_name,
          whatsapp_mode: 'META_API',
        }).eq('id', user.id),
        supabase.from('meta_configs').upsert({
          shop_id: user.id,
          meta_access_token: shopForm.meta_access_token,
          is_connected: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'shop_id' })
      ]);

      if (shopUpdate.error) throw shopUpdate.error;
      if (metaConfigUpdate.error) throw metaConfigUpdate.error;

      setShop(prev => prev ? { 
        ...prev, 
        meta_access_token: shopForm.meta_access_token,
        meta_phone_number_id: shopForm.meta_phone_number_id,
        meta_business_account_id: shopForm.meta_business_account_id,
        meta_template_name: shopForm.meta_template_name,
        whatsapp_mode: 'META_API'
      } : prev);
      
      setShopForm(prev => ({
        ...prev,
        meta_access_token: shopForm.meta_access_token,
        meta_phone_number_id: shopForm.meta_phone_number_id,
        meta_business_account_id: shopForm.meta_business_account_id,
        meta_template_name: shopForm.meta_template_name,
        whatsapp_mode: 'META_API'
      }));
      
      setIsMetaConnected(true);
      setMode('META_API');
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      
    } catch (err: any) {
      console.error('Error saving manual credentials:', err);
      setSaveStatus('error');
      setGlobalError({
        title: 'Save Failed',
        message: err.message || 'An error occurred while updating credentials.'
      });
    }
  };

  const handleConfirmPassword = (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus('error');
      setPasswordMsg('Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus('error');
      setPasswordMsg('Passwords do not match.');
      return;
    }
    setIsPasswordConfirmOpen(true);
  };

  const executeUpdatePassword = async () => {
    setIsPasswordConfirmOpen(false);
    setPasswordStatus('saving');
    const { error } = await supabase.auth.updateUser({
      password: passwordForm.newPassword,
    });
    
    if (error) {
      setPasswordStatus('error');
      setPasswordMsg(error.message);
    } else {
      setPasswordStatus('saved');
      setPasswordMsg('Password updated securely!');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => { setPasswordStatus('idle'); setPasswordMsg(''); }, 3000);
    }
  };

  const handleCreditPurchase = async () => {
    const pack = creditPacks.find(p => p.amount === selectedPack);
    if (!pack) return;

    setCreditStatus('redirecting');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_inr: pack.amount_inr, credit_count: pack.amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const isProdMode = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' || process.env.CASHFREE_ENV === 'production';
      const cashfree = await load({ mode: isProdMode ? 'production' : 'sandbox' });
      
      if (!cashfree) throw new Error("Cashfree SDK failed to load");

      cashfree.checkout({
        paymentSessionId: data.payment_session_id,
        returnUrl: window.location.origin + '/dashboard/settings?order_id={order_id}',
      });
    } catch (err: unknown) {
      setCreditStatus('idle');
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setGlobalError({ title: 'Payment Session Error', message: msg });
    }
  };

  const handleFacebookConnect = () => {
    try {
      const origin = (typeof window !== 'undefined' ? window.location.origin : 'https://broadcast.trueattendly.online').replace(/\/+$/, '');
      const redirectUri = `${origin}/api/auth/callback/facebook`;
        
      const appId = process.env.NEXT_PUBLIC_META_APP_ID || '';
      if (!appId) {
        throw new Error('Meta App ID is missing from environment configurations.');
      }
        
      // Generate a clean state CSRF token context (Base64url encoded to avoid raw JSON format warnings in Chrome)
      const statePayload = { timestamp: Date.now(), secure: true };
      const secureState = typeof window !== 'undefined'
        ? window.btoa(JSON.stringify(statePayload))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        : '';

      const params = new URLSearchParams();
      params.set('client_id', appId);
      params.set('redirect_uri', redirectUri);
      params.set('scope', 'business_management,whatsapp_business_management');
      params.set('response_type', 'code');
      if (secureState) {
        params.set('state', secureState);
      }
        
      const fbAuthUrl = `https://www.facebook.com/v17.0/dialog/oauth?${params.toString()}`;
      
      const newWindow = window.open(fbAuthUrl, 'FacebookLogin', 'width=600,height=700');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        throw new Error('Popup intercepted by browser. Please allow popups for this site to authorize Meta integration.');
      }
    } catch (err: any) {
      setGlobalError({ title: 'Meta Connection Error', message: err.message || 'Failed to initialize Meta connection. Please check your popup blockers.' });
    }
  };

  const handleDisconnectFacebook = () => {
    if (!shop) return;
    setIsMetaDisconnectConfirmOpen(true);
  };

  const executeDisconnectFacebook = async () => {
    if (!shop) return;
    setIsMetaDisconnectConfirmOpen(false);
    setSaveStatus('saving');
    const { error } = await supabase.from('shops').update({
      meta_access_token: null,
      meta_phone_number_id: null,
      meta_business_account_id: null,
      meta_template_name: null
    }).eq('id', shop.id);
    await supabase.from('meta_configs').delete().eq('shop_id', shop.id);
    
    if (!error) {
      setShop(prev => prev ? { ...prev, meta_access_token: '', meta_phone_number_id: '', meta_business_account_id: '', meta_template_name: '' } : prev);
      setShopForm(prev => ({ ...prev, meta_access_token: '', meta_phone_number_id: '', meta_business_account_id: '', meta_template_name: '' }));
      setIsMetaConnected(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="p-6 space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </section>

        <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="p-6 space-y-5">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div>
        <h1 className="serif-headline text-2xl md:text-3xl text-[#3E3B36]">Settings & Provider Hub</h1>
        <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mt-1.5">Manage workspace, credits, and Meta integration</p>
      </div>

      {/* ── CREDIT PURCHASE MATRICES ─────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <CreditCard size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Credit Wallet</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Pay-as-you-send ledger</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Balance */}
          <div className="bg-[#3E3B36] rounded-xl p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-[0.25em] text-[#F5F1EA]/50 uppercase mb-1">Current Balance</p>
              <p className="serif-headline text-4xl text-[#F5F1EA]">{wallet ? wallet.credits_remaining.toLocaleString() : '0'}</p>
              <p className="text-xs text-[#C4A896] mt-1 tracking-[0.1em] uppercase">Credits</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mb-1">Rate</p>
              <p className="text-sm text-[#F5F1EA]/80">1 Credit</p>
              <p className="text-[10px] text-[#C4A896] tracking-[0.1em]">= 1 Message</p>
            </div>
          </div>

          {/* Credit pack selection */}
          <div>
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-3">Select Credit Pack</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {creditPacks.map((pack) => (
                <button
                  key={pack.amount}
                  onClick={() => setSelectedPack(pack.amount)}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    selectedPack === pack.amount
                      ? 'border-[#C4A896] bg-[#F5F1EA]'
                      : 'border-[#E8E3DA] hover:border-[#C4A896]/50'
                  }`}
                >
                  {selectedPack === pack.amount && (
                    <div className="absolute top-2 right-2"><CheckCircle size={12} className="text-[#C4A896]" strokeWidth={1.5} /></div>
                  )}
                  <p className="text-sm font-medium text-[#3E3B36]">{pack.label}</p>
                  <p className="text-[10px] text-[#8B8378] tracking-[0.1em] uppercase mt-0.5">{pack.desc}</p>
                  <p className="text-base font-semibold text-[#3E3B36] mt-2">{pack.price}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreditPurchase}
            disabled={creditStatus === 'redirecting'}
            className="btn-primary rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 min-h-[48px]"
          >
            {creditStatus === 'redirecting' ? (
              <>
                <Spinner />
                INITIALIZING SECURE CHECKOUT...
              </>
            ) : (
              <>
                <Zap size={12} strokeWidth={1.5} />
                Purchase {selectedPack} Credits
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── CONNECTION MODE SETTINGS ──────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <Globe size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">WhatsApp Connection Mode</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Configure your broadcast infrastructure engine</p>
          </div>
        </div>

        <form onSubmit={handleConfirmSaveProfile} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* META API OPTION */}
            <label className={`relative block border rounded-xl p-5 cursor-pointer transition-all ${
              shopForm.whatsapp_mode === 'META_API' ? 'border-[#C4A896] bg-[#F9F7F4]' : 'border-[#E8E3DA] hover:border-[#C4A896]/50'
            }`}>
              <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="whatsapp_mode" 
                    value="META_API" 
                    checked={shopForm.whatsapp_mode === 'META_API'} 
                    onChange={() => {
                      if (shopForm.whatsapp_mode !== 'META_API') {
                        setShowMetaConfirmModal(true);
                      }
                    }} 
                    className="mt-1 accent-[#C4A896] w-4 h-4" 
                  />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FacebookIcon size={14} />
                    <span className="text-sm font-medium text-[#3E3B36]">Meta Official API</span>
                  </div>
                  <p className="text-[11px] text-[#8B8378] leading-relaxed mb-3">100% Verified Gateway, Zero Ban Risk, Template Approvals Required. Best for large scale Enterprise.</p>
                </div>
              </div>
            </label>

            {/* QR EXPRESS OPTION */}
            <label className={`relative block border rounded-xl p-5 cursor-pointer transition-all ${
              shopForm.whatsapp_mode === 'QR_EXPRESS' ? 'border-[#C4A896] bg-[#F9F7F4]' : 'border-[#E8E3DA] hover:border-[#C4A896]/50'
            }`}>
              <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="whatsapp_mode" 
                    value="QR_EXPRESS" 
                    checked={shopForm.whatsapp_mode === 'QR_EXPRESS'} 
                    onChange={() => {
                      if (shopForm.whatsapp_mode !== 'QR_EXPRESS') {
                        setShowExpressWarningModal(true);
                      }
                    }} 
                    className="mt-1 accent-[#C4A896] w-4 h-4" 
                  />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone size={14} className="text-[#3E3B36]" />
                    <span className="text-sm font-medium text-[#3E3B36]">TrueAttendly Express Mode</span>
                  </div>
                  <p className="text-[11px] text-[#8B8378] leading-relaxed mb-3">Quick QR Scan Connection, No Approvals, Fully Throttled Anti-Ban Spintax engine. Ideal for local SMEs.</p>
                </div>
              </div>
            </label>

          </div>

          {shopForm.whatsapp_mode === 'QR_EXPRESS' && (
            <div className="bg-[#3E3B36] rounded-xl p-5 mt-4">
              <label className="block text-xs tracking-[0.2em] text-[#F5F1EA]/80 uppercase mb-2">Anti-Ban Dispatch Delay (Seconds)</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min={30} 
                  max={120} 
                  value={shopForm.anti_ban_delay} 
                  onChange={(e) => setShopForm({ ...shopForm, anti_ban_delay: parseInt(e.target.value) || 45 })} 
                  className="bg-[#2A2825] border border-[#F5F1EA]/20 py-2 px-3 text-sm text-[#F5F1EA] rounded-lg w-24 outline-none focus:border-[#C4A896]" 
                />
                <p className="text-[10px] text-[#F5F1EA]/60">Minimum 30s recommended to avoid bulk detection.</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-[#E8E3DA] mt-4">
            <button type="submit" disabled={saveStatus === 'saving'} className="btn-primary rounded-lg disabled:opacity-50">
              {saveStatus === 'saving' ? 'Saving...' : 'Save Connection Mode'}
            </button>
            {saveStatus === 'saved' && <div className="flex items-center gap-1.5 text-[#C4A896]"><CheckCircle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Saved!</span></div>}
          </div>
        </form>
      </section>

      {/* ── PROVIDER HUB — Facebook Embedded Signup ─────────────── */}
      {shopForm.whatsapp_mode === 'META_API' && (
        <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden transition-all duration-300 animate-fade-in">
          <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
              <FacebookIcon size={14} />
            </div>
            <div>
              <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Meta WhatsApp Provider</h2>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Connect your Business account</p>
            </div>
            {isMetaConnected && (
              <div className="ml-auto flex items-center gap-1.5 text-[#C4A896]">
                <div className="w-1.5 h-1.5 bg-[#C4A896] rounded-full animate-pulse" />
                <span className="text-[10px] tracking-[0.15em] uppercase">Connected</span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-5">
            {/* Primary: 1-Click Facebook Embedded Signup */}
            <div className="bg-[#F5F1EA] rounded-xl p-5">
              <p className="text-xs text-[#3E3B36] mb-1 font-medium">Connect with Facebook</p>
              <p className="text-[11px] text-[#8B8378] leading-relaxed mb-4">
                Authorize your Meta Business account to enable WhatsApp Cloud API broadcasting. Your token is securely stored and never shared.
              </p>
              {isMetaConnected ? (
                <div className="mt-2">
                  <div className="inline-flex items-center gap-2 bg-[#F5F1EA] text-[#3E3B36] px-4 py-2.5 rounded-lg border border-[#E8E3DA]">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-sm font-medium">✓ Connected to Meta Business Node</span>
                  </div>
                  <button
                    onClick={handleDisconnectFacebook}
                    className="block mt-4 text-[10px] text-[#8B8378] tracking-[0.05em] hover:text-[#3E3B36] transition-colors uppercase"
                  >
                    Disconnect Account
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleFacebookConnect}
                  className="flex items-center gap-3 bg-[#3E3B36] hover:bg-[#2A2825] text-[#F5F1EA] px-5 py-3 rounded-xl transition-colors font-medium text-sm"
                >
                  <FacebookIcon size={16} />
                  Connect with Facebook
                  <ExternalLink size={12} className="ml-auto opacity-70" />
                </button>
              )}
            </div>

            {/* Secondary: Manual credential entry toggle */}
            <div className="border border-[#E8E3DA] rounded-xl overflow-hidden">
              <button
                onClick={() => setManualProviderOpen(!manualProviderOpen)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#F5F1EA]/40 transition-colors"
              >
                <div className="text-left">
                  <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Manual Token Entry</p>
                  <p className="text-[10px] text-[#8B8378] mt-0.5 normal-case tracking-normal">Developer safety route - enter credentials directly</p>
                </div>
                <ChevronDown size={14} className={`text-[#8B8378] transition-transform flex-shrink-0 ${manualProviderOpen ? 'rotate-180' : ''}`} />
              </button>

              {manualProviderOpen && (
                <form onSubmit={handleSaveManualCredentials} className="border-t border-[#E8E3DA] p-5 space-y-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Meta Access Token</label>
                    <input type="password" value={shopForm.meta_access_token} onChange={(e) => setShopForm({ ...shopForm, meta_access_token: e.target.value })} className="input-editorial" placeholder="EAAB..." readOnly={isMetaConnected} />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Phone Number ID</label>
                    <input type="text" value={shopForm.meta_phone_number_id} onChange={(e) => setShopForm({ ...shopForm, meta_phone_number_id: e.target.value })} className="input-editorial" placeholder="1234567890" readOnly={isMetaConnected} />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Business Account ID</label>
                    <input type="text" value={shopForm.meta_business_account_id} onChange={(e) => setShopForm({ ...shopForm, meta_business_account_id: e.target.value })} className="input-editorial" placeholder="0987654321" readOnly={isMetaConnected} />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5">Default Template Name</label>
                    <input type="text" value={shopForm.meta_template_name} onChange={(e) => setShopForm({ ...shopForm, meta_template_name: e.target.value })} className="input-editorial" placeholder="hello_world" />
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <button type="submit" disabled={saveStatus === 'saving' || isMetaConnected} className="btn-primary rounded-lg disabled:opacity-50">
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Credentials'}
                    </button>
                    {saveStatus === 'saved' && <div className="flex items-center gap-1.5 text-[#C4A896]"><CheckCircle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Saved!</span></div>}
                    {saveStatus === 'error' && <div className="flex items-center gap-1.5 text-[#8B8378]"><AlertTriangle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Save failed</span></div>}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── PROVIDER HUB — QR Express Connection Node ─────────────── */}
      {shopForm.whatsapp_mode === 'QR_EXPRESS' && (
        <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden transition-all duration-300 animate-fade-in">
          <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
              <QrCode size={14} className="text-[#C4A896]" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">TrueAttendly QR Express Connection Node</h2>
              <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Direct WhatsApp Web session</p>
            </div>
            <div className="ml-auto">
              {qrStatus === 'connected' ? (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[#8B8378]">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-[#F9F7F4] rounded-xl p-5 border border-[#E8E3DA] flex flex-col items-center text-center">
              {qrStatus === 'connected' ? (
                <div className="py-6 space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle className="text-emerald-600" size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="serif-headline text-[#3E3B36] text-base font-semibold">Device Linked Successfully</h3>
                    <p className="text-xs text-[#8B8378] mt-1 max-w-sm">
                      Your phone is currently connected to the QR Express broadcast queue. You can send messages instantly.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDisconnectModal(true)}
                    className="border border-[#E8E3DA] hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-xs text-[#8B8378] tracking-[0.1em] px-4 py-2 rounded-lg transition-colors uppercase font-medium mt-2"
                  >
                    Disconnect Device
                  </button>
                </div>
              ) : qrCodeString ? (
                <div className="py-4 space-y-5 flex flex-col items-center">
                  <div className="p-3 bg-white border border-[#E8E3DA] rounded-xl shadow-inner relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeString)}&size=200x200`}
                      alt="WhatsApp Web QR Code"
                      className="w-48 h-48 block"
                    />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <p className="text-xs text-[#3E3B36] font-bold uppercase tracking-wider">Scan QR Code</p>
                    <p className="text-[11px] text-[#8B8378] leading-relaxed">
                      Open WhatsApp on your phone &gt; tap Menu or Settings &gt; Linked Devices &gt; Link a Device, and point your camera to this screen.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 animate-pulse">
                    <Loader2 size={10} className="animate-spin" />
                    <span>Polling connection status...</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 space-y-4 max-w-md">
                  <div className="w-12 h-12 bg-[#F5F1EA] rounded-full flex items-center justify-center mx-auto">
                    <Wifi size={20} className="text-[#C4A896]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="serif-headline text-[#3E3B36] text-sm font-semibold">Start Connection Channel</h3>
                    <p className="text-xs text-[#8B8378] mt-1">
                      Initialize the Baileys engine to generate a secure real-time QR code scanner interface.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConnectModal(true)}
                    disabled={isQrStarting}
                    className="btn-primary rounded-lg flex items-center gap-2 mx-auto"
                  >
                    {isQrStarting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        INITIALIZING ENGINE...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} />
                        GENERATE QR CODE
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Prominent Premium Recommendation Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-amber-800 text-[11px] leading-relaxed">
                <strong>⚠️ Pro Recommendation:</strong> For high-volume retail campaigns, zero ban-risk, and 100% official scale, we highly recommend switching to the Meta Official Cloud API mode.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── SHOP PROFILE ─────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <Building size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Shop Profile</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Business identity node</p>
          </div>
        </div>
        <form onSubmit={handleConfirmSaveProfile} className="p-6 space-y-5">
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Shop / Brand Name</label>
            <input type="text" required value={shopForm.shop_name} onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })} className="input-editorial" placeholder={shop?.shop_name || "Your shop name"} />
          </div>
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Owner WhatsApp Number</label>
            <input type="tel" required value={shopForm.owner_phone} onChange={(e) => setShopForm({ ...shopForm, owner_phone: e.target.value })} className="input-editorial" placeholder={shop?.owner_phone || "+91 98765 43210"} />
          </div>
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Official Contact Number (Voice)</label>
            <input type="tel" value={shopForm.contact_number} onChange={(e) => setShopForm({ ...shopForm, contact_number: e.target.value })} className="input-editorial" placeholder={shop?.contact_number || "+91 98765 43210"} />
          </div>
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Physical Store Location</label>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={shopForm.city} onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })} className="input-editorial" placeholder="City / Locality" />
              <input type="text" value={shopForm.district} onChange={(e) => setShopForm({ ...shopForm, district: e.target.value })} className="input-editorial" placeholder="District" />
              <input type="text" value={shopForm.state} onChange={(e) => setShopForm({ ...shopForm, state: e.target.value })} className="input-editorial" placeholder="State" />
              <input type="text" value={shopForm.country} onChange={(e) => setShopForm({ ...shopForm, country: e.target.value })} className="input-editorial" placeholder="Country" />
            </div>
          </div>
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Industry Type</label>
            <select value={shopForm.industry_type} onChange={(e) => setShopForm({ ...shopForm, industry_type: e.target.value })} className="input-editorial appearance-none cursor-pointer">
              <option value="" disabled>{shop?.industry_type || "Select Industry Type"}</option>
              <option value="Fashion & Apparel">Fashion & Apparel</option>
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Health & Beauty">Health & Beauty</option>
              <option value="Electronics">Electronics</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saveStatus === 'saving'} className="btn-primary rounded-lg disabled:opacity-50">
              {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
            </button>
            {saveStatus === 'saved' && <div className="flex items-center gap-1.5 text-[#C4A896]"><CheckCircle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Saved!</span></div>}
            {saveStatus === 'error' && <div className="flex items-center gap-1.5 text-[#8B8378]"><AlertTriangle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Save failed</span></div>}
          </div>
        </form>
      </section>

      {/* ── SECURITY & PASSWORD MANAGEMENT ─────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <Lock size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Security & Password Management</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Update workspace credentials</p>
          </div>
        </div>
        <form onSubmit={handleConfirmPassword} className="p-6 space-y-5">
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">New Password</label>
            <input 
              type="password" 
              required 
              value={passwordForm.newPassword} 
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
              className="bg-[#FFFFFF] border border-[#E8E3DA] py-3 px-4 text-sm text-[#3E3B36] transition-colors focus:border-[#C4A896] outline-none rounded-lg w-full" 
              placeholder="Enter new password" 
            />
          </div>
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Confirm New Password</label>
            <input 
              type="password" 
              required 
              value={passwordForm.confirmPassword} 
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
              className="bg-[#FFFFFF] border border-[#E8E3DA] py-3 px-4 text-sm text-[#3E3B36] transition-colors focus:border-[#C4A896] outline-none rounded-lg w-full" 
              placeholder="Confirm new password" 
            />
          </div>
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={passwordStatus === 'saving'} className="btn-primary rounded-lg disabled:opacity-50">
              {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
            </button>
            {passwordStatus === 'saved' && (
              <div className="flex items-center gap-1.5 text-[#C4A896]">
                <CheckCircle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">{passwordMsg}</span>
              </div>
            )}
            {passwordStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-[#8B8378]">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">{passwordMsg}</span>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* ── ACCOUNT INFO ─────────────────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center"><User size={14} className="text-[#C4A896]" strokeWidth={1.5} /></div>
          <div><h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">Account Details</h2><p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Workspace identity</p></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { label: 'Workspace ID', value: shop?.id ?? '-' },
              { label: 'Created', value: shop ? new Date(shop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between py-3 border-b border-[#E8E3DA] last:border-0">
                <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">{item.label}</p>
                <p className="text-xs text-[#3E3B36] font-mono max-w-xs truncate text-right">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODALS */}
      <CustomConfirm
        isOpen={isShopConfirmOpen}
        title="Update Shop Profile"
        message="Are you sure you want to save these modifications to your active business identity? This will be immediately reflected."
        confirmText="SAVE PROFILE"
        onConfirm={executeSaveProfile}
        onCancel={() => setIsShopConfirmOpen(false)}
      />

      <CustomConfirm
        isOpen={isPasswordConfirmOpen}
        title="Update Workspace Security"
        message="Are you sure you want to change your workspace password? You will need to use the new credentials on your next login."
        confirmText="UPDATE PASSWORD"
        onConfirm={executeUpdatePassword}
        onCancel={() => setIsPasswordConfirmOpen(false)}
      />

      <CustomConfirm
        isOpen={isMetaDisconnectConfirmOpen}
        title="Disconnect Meta Account"
        message="Are you sure you want to disconnect your Meta account? This will immediately sever your WhatsApp Cloud API connection."
        confirmText="DISCONNECT"
        onConfirm={executeDisconnectFacebook}
        onCancel={() => setIsMetaDisconnectConfirmOpen(false)}
      />

      <CustomConfirm
        isOpen={globalError !== null}
        title={globalError?.title || 'Error'}
        message={globalError?.message || ''}
        confirmText="DISMISS"
        onConfirm={() => setGlobalError(null)}
        onCancel={() => setGlobalError(null)}
      />

      {/* ── CUSTOM QR MODALS ────────────────────────────────────────── */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-[#3E3B36] mb-3">⚠️ Important Connection Requirements:</h3>
            <ul className="list-disc pl-5 text-sm text-[#8B8378] space-y-2 mb-6">
              <li>Ensure your mobile device has an active, uninterrupted internet connection.</li>
              <li>Keep your WhatsApp application open during the initial QR handshake.</li>
              <li>Do not close or refresh this browser tab until the status badge updates to 'CONNECTED'.</li>
            </ul>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowConnectModal(false);
                  handleGenerateQR();
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium shadow-sm"
              >
                Yes, Proceed to Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl border-t-4 border-red-500 scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-red-600 mb-3">🚨 Are you sure you want to disconnect?</h3>
            <p className="text-sm text-[#8B8378] mb-6">
              Disconnecting will immediately stop all active outbound campaign dispatches and queue processes for this shop. You will need to re-scan the QR code to re-activate the engine.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDisconnectModal(false)}
                className="px-4 py-2 bg-[#3E3B36] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-sm"
              >
                No, Keep Connected
              </button>
              <button 
                onClick={() => {
                  setShowDisconnectModal(false);
                  handleDisconnectQrConnection();
                }}
                className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Yes, Force Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {showMetaConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-[#3E3B36] mb-3">Confirm Mode Switch</h3>
            <p className="text-sm text-[#8B8378] mb-6">
              You are switching to the Meta Cloud API. Ensure your permanent Meta Business Phone Number and Access Tokens are correctly configured in the settings registry.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowMetaConfirmModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowMetaConfirmModal(false);
                  setShopForm({ ...shopForm, whatsapp_mode: 'META_API' });
                }}
                className="px-4 py-2 bg-[#3E3B36] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-sm"
              >
                Confirm Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpressWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl scale-100 transition-transform duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-50 rounded-full p-2 flex-shrink-0">
                <AlertTriangle className="text-amber-500" size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-[#3E3B36]">⚠️ True Attendly Express Mode Activation</h3>
            </div>
            <div className="space-y-3 text-sm text-[#8B8378] mb-6">
              <p>Please note: This mode operates via a persistent WhatsApp web socket. It requires your scanning device to remain connected to a stable internet network 24/7.</p>
              <p>Make sure no other web/desktop clients are actively fighting for this specific session instance.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowExpressWarningModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowExpressWarningModal(false);
                  setShopForm({ ...shopForm, whatsapp_mode: 'QR_EXPRESS' });
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
              >
                I Understand, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto space-y-8"><div className="h-8 w-64 mb-3 bg-[#E8E3DA] animate-pulse rounded" /><div className="h-4 w-96 bg-[#E8E3DA] animate-pulse rounded" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
