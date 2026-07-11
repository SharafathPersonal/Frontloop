'use client';

import { useEffect, useState, FormEvent, Suspense, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { load } from '@cashfreepayments/cashfree-js';
import type { Shop, Wallet, WhatsAppConnectionMode } from '@/types/broadcast';
import { CheckCircle, AlertTriangle, CreditCard, User, Building, ChevronDown, ExternalLink, Zap, Lock, Smartphone, Globe, QrCode, RefreshCw, Wifi, Loader2 } from 'lucide-react';
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
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED');

  const searchParams = useSearchParams();
  const router = useRouter();

  // Modal States
  const [isShopConfirmOpen, setIsShopConfirmOpen] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isMetaDisconnectConfirmOpen, setIsMetaDisconnectConfirmOpen] = useState(false);
  const [globalError, setGlobalError] = useState<{title: string, message: string} | null>(null);



  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Canonical status normalizer — maps all backend status variants to a single uppercase key
  // used by the JSX render conditions below.
  //   CONNECTED         → 'CONNECTED'
  //   qr_ready          → 'QR_READY'
  //   WAITING_FOR_SCAN  → 'QR_READY'   (same visual: show the QR image)
  //   DISCONNECTED      → 'DISCONNECTED'
  //   everything else   → 'DISCONNECTED'
  const normalizeStatus = (raw: string): string => {
    const s = (raw || '').toUpperCase();
    if (s === 'CONNECTED') return 'CONNECTED';
    if (s === 'PAIRING_CODE_READY') return 'PAIRING_CODE_READY';
    return 'DISCONNECTED';
  };

  const fetchLiveStatus = useCallback(async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      const explicitShopId = shop?.id;
      if (!explicitShopId) return;
      const res = await fetch(`${backendUrl}/api/whatsapp/status?shop_id=${explicitShopId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const normalized = normalizeStatus(data.status);
        setConnectionStatus(normalized);

        if (normalized === 'PAIRING_CODE_READY') {
          if (data.pairingCode) {
            setPairingCode(data.pairingCode);
          }
        } else if (normalized === 'CONNECTED' || normalized === 'DISCONNECTED') {
          setPairingCode(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [shop]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (connectionStatus !== 'CONNECTED') {
      interval = setInterval(fetchLiveStatus, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connectionStatus, fetchLiveStatus]);

  const handleGeneratePairingCode = async (forceRefresh: boolean = false) => {
    if (!shop || !shop.id) return;
    if (!phoneNumber) {
      if (forceRefresh) {
        // If they click "Generate a New One" but the phone number was lost (e.g. page reload),
        // we forcefully disconnect the stale backend session to return them to the clean input form.
        await handleDisconnectQrConnection();
        return;
      }
      setGlobalError({ title: 'Validation Error', message: 'Please enter a valid phone number with country code.' });
      return;
    }
    setConnectionStatus('INITIALIZING');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shop.id, phoneNumber, force_refresh: forceRefresh })
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        const normalized = normalizeStatus(data.status);
        setConnectionStatus(normalized);
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }
      } else if (res) {
        const errData = await res.json().catch(() => ({}));
        setGlobalError({ title: 'Connection Error', message: errData.error || 'Failed to generate pairing code. Please check your phone number format.' });
        setConnectionStatus('DISCONNECTED');
      } else {
        setGlobalError({ title: 'Network Error', message: 'Could not connect to the backend server.' });
        setConnectionStatus('DISCONNECTED');
      }
    } catch (err) {
      console.error(err);
      setGlobalError({ title: 'Network Error', message: 'An unexpected error occurred.' });
      setConnectionStatus('DISCONNECTED');
    }
  };

  const handleDisconnectQrConnection = async () => {
    if (!shop || !shop.id) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_RENDER_SERVER_URL || 'http://localhost:3001';
      await fetch(`${backendUrl}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: shop.id })
      }).catch(e => console.warn('Backend unavailable, forcing UI disconnect.', e));
      setConnectionStatus('DISCONNECTED');
      setPairingCode(null);
      await fetchLiveStatus();
    } catch (err) {
      console.error(err);
    }
  };
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
        setConnectionStatus(normalizeStatus(shopData.qr_express_status || 'disconnected'));
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
      params.set('scope', 'public_profile,email,whatsapp_business_management,whatsapp_business_messaging');
      params.set('response_type', 'code,granted_scopes');
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

      {/* ── PROVIDER HUB — Facebook Embedded Signup ─────────────── */}
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

      
      {/* ── QR LEADS INBOUND LISTENER ──────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Smartphone size={14} className="text-amber-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">🔌 Connect your WhatsApp to get In-store QR Leads</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Zero ban-risk listener for inbound traffic</p>
          </div>
          <div className="ml-auto">
            {connectionStatus === 'CONNECTED' ? (
               <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Listening</span>
               </div>
            ) : (
               <div className="flex items-center gap-1.5 text-[#8B8378] bg-[#F5F1EA] px-3 py-1 rounded-full border border-[#E8E3DA]">
                 <span className="text-[10px] font-bold tracking-[0.15em] uppercase">Offline</span>
               </div>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="bg-[#F9F7F4] border border-[#E8E3DA] rounded-xl p-5 mb-5 flex flex-col items-center justify-center min-h-[250px] transition-all">
            {connectionStatus === 'CONNECTED' ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#3E3B36] mb-2">Listener Active</h3>
                <p className="text-xs text-[#8B8378] max-w-sm mx-auto leading-relaxed">
                  Your WhatsApp is actively listening for "Add me to Broadcast" messages. Outbound marketing is disabled on this socket to guarantee sender safety.
                </p>
                <button
                  onClick={() => setShowDisconnectModal(true)}
                  className="mt-6 text-[10px] font-bold text-rose-600 tracking-[0.1em] uppercase hover:underline"
                >
                  Disconnect Listener
                </button>
              </div>
            ) : pairingCode && connectionStatus === 'PAIRING_CODE_READY' ? (
              <div className="text-center animate-fade-in">
                <p className="text-xs font-bold text-[#3E3B36] mb-4 uppercase tracking-[0.1em]">Link with Phone Number</p>
                <div className="bg-white p-6 rounded-xl shadow-sm inline-block border border-[#E8E3DA]">
                  <p className="text-3xl font-mono tracking-[0.2em] font-bold text-[#3E3B36]">{pairingCode}</p>
                </div>
                <div className="mt-6 space-y-2 text-left bg-white p-4 rounded-lg border border-[#E8E3DA] max-w-sm mx-auto">
                  <p className="text-xs text-[#8B8378] font-medium"><span className="text-emerald-600 font-bold">1.</span> Open WhatsApp on your phone.</p>
                  <p className="text-xs text-[#8B8378] font-medium"><span className="text-emerald-600 font-bold">2.</span> Tap Settings or the 3 dots.</p>
                  <p className="text-xs text-[#8B8378] font-medium"><span className="text-emerald-600 font-bold">3.</span> Tap <strong>Linked Devices</strong> &gt; <strong>Link a device</strong>.</p>
                  <p className="text-xs text-[#8B8378] font-medium"><span className="text-emerald-600 font-bold">4.</span> Tap <strong>Link with phone number instead</strong> at the bottom.</p>
                  <p className="text-xs text-[#8B8378] font-medium"><span className="text-emerald-600 font-bold">5.</span> Enter the 8-digit code shown above.</p>
                </div>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <p className="text-[10px] text-[#8B8378] uppercase tracking-wider animate-pulse flex items-center gap-2">
                    <RefreshCw size={10} className="animate-spin" /> Awaiting pairing confirmation...
                  </p>
                  <button 
                    onClick={() => handleGeneratePairingCode(true)}
                    className="text-[10px] font-bold text-[#C4A896] uppercase tracking-wider hover:text-[#A88B79] hover:underline transition-colors mt-2"
                  >
                    Code Expired? Generate a New One
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center w-full max-w-sm mx-auto">
                <Smartphone size={32} className="text-[#C4A896] mx-auto mb-4 opacity-50" />
                <h3 className="text-sm font-bold text-[#3E3B36] mb-2 uppercase tracking-wide">Socket Disconnected</h3>
                <p className="text-xs text-[#8B8378] mb-6 leading-relaxed">
                  Enter your phone number with country code (e.g. 919876543210) to generate an 8-digit activation code and securely link your WhatsApp.
                </p>
                
                <div className="mb-4 text-left">
                  <label className="block text-[10px] font-bold text-[#8B8378] uppercase tracking-[0.1em] mb-1">Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    placeholder="919876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-11 px-4 bg-white border border-[#E8E3DA] rounded-lg text-sm text-[#3E3B36] focus:outline-none focus:border-[#C4A896] transition-colors"
                  />
                </div>

                <button
                  onClick={() => handleGeneratePairingCode(false)}
                  disabled={connectionStatus === 'INITIALIZING'}
                  className="btn-primary w-full rounded-lg flex items-center justify-center gap-2 h-11 disabled:opacity-50"
                >
                  {connectionStatus === 'INITIALIZING' ? (
                    <><Spinner /> Initializing...</>
                  ) : (
                    <><QrCode size={14} /> Generate Activation Code</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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

      
      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white rounded-2xl p-6 max-w-md shadow-xl border-t-4 border-red-500 scale-100 transition-transform duration-300">
            <h3 className="text-lg font-bold text-red-600 mb-3">🚨 Disconnect Listener?</h3>
            <p className="text-sm text-[#8B8378] mb-6">This will stop processing incoming QR lead scans immediately.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDisconnectModal(false)} className="px-4 py-2 bg-[#3E3B36] text-white rounded-lg hover:bg-black transition-colors text-sm font-medium shadow-sm">Keep Connected</button>
              <button onClick={() => { setShowDisconnectModal(false); handleDisconnectQrConnection(); }} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">Force Disconnect</button>
            </div>
          </div>
        </div>
      )}

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
