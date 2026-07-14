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
    anti_ban_delay: 45,
    gst_number: '',
    logo_url: '',
    invoice_theme_color: '#5C4033',
    invoice_footer_note: ''
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('Only PNG, JPG, or JPEG images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size must be less than 5MB.');
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/campaigns/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to upload logo.');
      } else {
        setShopForm(prev => ({ ...prev, logo_url: data.publicUrl }));
      }
    } catch (err: any) {
      alert('Error uploading logo: ' + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleResetProfile = () => {
    if (shop) {
      setShopForm({
        shop_name: shop.shop_name || '',
        owner_phone: shop.owner_phone || '',
        contact_number: shop.contact_number || '',
        location_address: shop.location_address || '',
        city: shop.city || '',
        district: shop.district || '',
        state: shop.state || '',
        country: shop.country || '',
        industry_type: shop.industry_type || '',
        meta_access_token: shop.meta_access_token || '',
        meta_phone_number_id: shop.meta_phone_number_id || '',
        meta_business_account_id: shop.meta_business_account_id || '',
        meta_template_name: shop.meta_template_name || '',
        whatsapp_mode: shop.whatsapp_mode || 'NONE',
        anti_ban_delay: shop.anti_ban_delay || 45,
        gst_number: shop.gst_number || '',
        logo_url: shop.logo_url || '',
        invoice_theme_color: shop.invoice_theme_color || '#5C4033',
        invoice_footer_note: shop.invoice_footer_note || '',
      });
    }
  };


  const [creditPacks, setCreditPacks] = useState<any[]>([]);
  const [selectedPack, setSelectedPack] = useState<number>(100);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [brandStory, setBrandStory] = useState<string>('');
  const [brandStoryStatus, setBrandStoryStatus] = useState<SaveStatus>('idle');
  const [creditStatus, setCreditStatus] = useState<CreditStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [manualProviderOpen, setManualProviderOpen] = useState(false);
  const [isMetaConnected, setIsMetaConnected] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Modal States
  const [isShopConfirmOpen, setIsShopConfirmOpen] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isMetaDisconnectConfirmOpen, setIsMetaDisconnectConfirmOpen] = useState(false);
  const [globalError, setGlobalError] = useState<{title: string, message: string} | null>(null);


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
        setBrandStory(shopData.brand_story || '');
        setShop(shopData);
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
          gst_number: shopData.gst_number || '',
          logo_url: shopData.logo_url || '',
          invoice_theme_color: shopData.invoice_theme_color || '#5C4033',
          invoice_footer_note: shopData.invoice_footer_note || '',
        });
      }
      if (walletData) setWallet(walletData);
      setLoading(false);
    }
    load();
  }, []);


  const handleSaveBrandStory = async (e: FormEvent) => {
    e.preventDefault();
    setBrandStoryStatus('saving');
    try {
      const res = await fetch('/api/settings/brand-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_story: brandStory })
      });
      if (!res.ok) throw new Error('Failed to save');
      setBrandStoryStatus('saved');
      setTimeout(() => setBrandStoryStatus('idle'), 3000);
    } catch (error) {
      setBrandStoryStatus('error');
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
      gst_number: shopForm.gst_number,
      logo_url: shopForm.logo_url,
      invoice_theme_color: shopForm.invoice_theme_color,
      invoice_footer_note: shopForm.invoice_footer_note,
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
          <div className="bg-[#3E3B36] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.25em] text-[#F5F1EA]/50 uppercase mb-1">Current Balance</p>
              <p className="serif-headline text-3xl sm:text-4xl text-[#F5F1EA]">{wallet ? wallet.credits_remaining.toLocaleString() : '0'}</p>
              <p className="text-xs text-[#C4A896] mt-1 tracking-[0.1em] uppercase">Credits</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] tracking-[0.15em] text-[#F5F1EA]/50 uppercase mb-1">Rate</p>
              <p className="text-sm text-[#F5F1EA]/80">1 Credit</p>
              <p className="text-[10px] text-[#C4A896] tracking-[0.1em]">= 1 Message</p>
            </div>
          </div>

          {/* Credit pack selection */}
          <div>
            <p className="text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-3">Select Credit Pack</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
                  <p className="text-sm sm:text-base font-medium text-[#3E3B36]">{pack.label}</p>
                  <p className="text-[10px] text-[#8B8378] tracking-[0.1em] uppercase mt-0.5">{pack.desc}</p>
                  <p className="text-base sm:text-lg font-semibold text-[#3E3B36] mt-2">{pack.price}</p>
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
                  <div className="flex items-center gap-2 bg-[#F5F1EA] text-[#3E3B36] px-4 py-2.5 rounded-lg border border-[#E8E3DA] max-w-full">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium break-words whitespace-normal">✓ Connected to Meta Business Node</span>
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
                  className="flex items-center gap-3 bg-[#3E3B36] hover:bg-[#2A2825] text-[#F5F1EA] px-5 py-3 rounded-xl transition-colors font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
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
        <form onSubmit={handleConfirmSaveProfile} className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Shop Name */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Shop / Brand Name</label>
              <input type="text" required value={shopForm.shop_name} onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })} className="input-editorial" placeholder={shop?.shop_name || "Your shop name"} />
            </div>

            {/* Industry Type */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Industry Type</label>
              <div className="relative">
                <select value={shopForm.industry_type} onChange={(e) => setShopForm({ ...shopForm, industry_type: e.target.value })} className="input-editorial appearance-none cursor-pointer pr-10">
                  <option value="" disabled>{shop?.industry_type || "Select Industry Type"}</option>
                  <option value="Fashion & Apparel">Fashion & Apparel</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Health & Beauty">Health & Beauty</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Education">Education</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#8B8378]">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Owner WhatsApp Number */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Owner WhatsApp Number</label>
              <input type="tel" required value={shopForm.owner_phone} onChange={(e) => setShopForm({ ...shopForm, owner_phone: e.target.value })} className="input-editorial" placeholder={shop?.owner_phone || "+91 98765 43210"} />
            </div>

            {/* Official Contact Number */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Official Contact Number (Voice)</label>
              <input type="tel" value={shopForm.contact_number} onChange={(e) => setShopForm({ ...shopForm, contact_number: e.target.value })} className="input-editorial" placeholder={shop?.contact_number || "+91 98765 43210"} />
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">GST Number (Optional)</label>
              <input type="text" value={shopForm.gst_number} onChange={(e) => setShopForm({ ...shopForm, gst_number: e.target.value })} className="input-editorial" placeholder="e.g. 22AAAAA1111A1Z1" />
            </div>

            {/* Invoice Theme Accent Color */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Invoice Theme Accent Color</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <input type="color" value={shopForm.invoice_theme_color} onChange={(e) => setShopForm({ ...shopForm, invoice_theme_color: e.target.value })} className="w-10 h-10 border border-[#E8E3DA] rounded-lg cursor-pointer bg-white flex-shrink-0" />
                  <input type="text" value={shopForm.invoice_theme_color} onChange={(e) => setShopForm({ ...shopForm, invoice_theme_color: e.target.value })} className="input-editorial font-mono uppercase flex-1" placeholder="#5C4033" />
                </div>
                <span className="text-xs text-[#8B8378] whitespace-normal sm:whitespace-nowrap">Default: Warm Brown (#5C4033)</span>
              </div>
            </div>
          </div>

          {/* Physical Store Location */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Physical Store Location</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <input type="text" value={shopForm.city} onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })} className="input-editorial" placeholder="City / Locality" />
              <input type="text" value={shopForm.district} onChange={(e) => setShopForm({ ...shopForm, district: e.target.value })} className="input-editorial" placeholder="District" />
              <input type="text" value={shopForm.state} onChange={(e) => setShopForm({ ...shopForm, state: e.target.value })} className="input-editorial" placeholder="State" />
              <input type="text" value={shopForm.country} onChange={(e) => setShopForm({ ...shopForm, country: e.target.value })} className="input-editorial" placeholder="Country" />
            </div>
          </div>

          {/* Logo Upload Section */}
          <div>
            <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Store Logo (Transparent PNG)</label>
            <div className="border border-dashed border-[#E8E3DA] rounded-xl p-6 text-center hover:bg-[#F9F7F4]/50 transition-colors">
              <input type="file" ref={logoRef} onChange={handleLogoUpload} accept="image/png,image/jpeg,image/jpg" className="hidden" />
              {shopForm.logo_url ? (
                <div className="flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shopForm.logo_url} alt="Store logo" className="max-h-20 object-contain bg-[#F5F1EA] p-2 rounded-lg border border-[#E8E3DA]" />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button type="button" onClick={() => logoRef.current?.click()} className="text-xs text-[#C4A896] hover:text-[#b09482] font-semibold uppercase tracking-wider min-h-[44px] px-3 flex items-center justify-center">Change Logo</button>
                    <span className="text-[#E8E3DA] self-center">|</span>
                    <button type="button" onClick={() => setShopForm(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-red-500 hover:text-red-600 font-semibold uppercase tracking-wider min-h-[44px] px-3 flex items-center justify-center">Remove</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => logoRef.current?.click()} className="cursor-pointer py-4 min-h-[44px] flex flex-col justify-center items-center">
                  <Building size={24} className="text-[#8B8378] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#3E3B36] uppercase tracking-wider">Upload Store Logo</p>
                  <p className="text-[10px] text-[#8B8378] mt-1">Please upload your logo with background removed (PNG/Transparent format)</p>
                </div>
              )}
              {logoUploading && (
                <p className="text-xs text-[#C4A896] mt-2 animate-pulse">Uploading store logo...</p>
              )}
            </div>
          </div>

          <div>
             <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">Invoice Footer Note</label>
             <input
               type="text"
               value={shopForm.invoice_footer_note}
               onChange={(e) => setShopForm({ ...shopForm, invoice_footer_note: e.target.value })}
               className="input-editorial"
               placeholder="Thank you for visiting! Please come again."
             />
             <span className="text-[10px] text-[#8B8378] mt-1 block">A premium message printed at the bottom of customer invoices.</span>
           </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 w-full">
            <button 
              type="submit" 
              disabled={saveStatus === 'saving'} 
              className="btn-primary rounded-lg disabled:opacity-50 w-full sm:w-auto min-h-[44px] px-6 flex items-center justify-center"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
            </button>
            <button 
              type="button" 
              onClick={handleResetProfile}
              className="border border-[#E8E3DA] hover:bg-[#F5F1EA] text-[#3E3B36] rounded-lg w-full sm:w-auto min-h-[44px] px-6 text-xs font-bold tracking-[0.2em] uppercase transition-colors flex items-center justify-center cursor-pointer"
            >
              Reset Changes
            </button>
            {saveStatus === 'saved' && <div className="flex items-center justify-center gap-1.5 text-[#C4A896] py-1"><CheckCircle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Saved!</span></div>}
            {saveStatus === 'error' && <div className="flex items-center justify-center gap-1.5 text-[#8B8378] py-1"><AlertTriangle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Save failed</span></div>}
          </div>
        </form>
      </section>

      {/* ── AI BRAND INTELLIGENCE ─────────────────────────────── */}
      <section className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E8E3DA] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#F5F1EA] rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-[#C4A896]" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="lexend-subheading text-sm font-medium text-[#3E3B36]">AI Brand Intelligence</h2>
            <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase">Tell AI the story of your brand to generate hyper-personalized responses.</p>
          </div>
        </div>
        <form onSubmit={handleSaveBrandStory} className="p-6 space-y-5">
          <div>
            <textarea 
              rows={4}
              required 
              value={brandStory} 
              onChange={(e) => setBrandStory(e.target.value)} 
              className="input-editorial w-full resize-none p-3" 
              placeholder="e.g., We are a boutique organic clothing store in Kozhikode focusing on sustainable fashion. Our tone is friendly and warm..." 
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full">
            <button 
              type="submit" 
              disabled={brandStoryStatus === 'saving'} 
              className="btn-primary rounded-lg disabled:opacity-50 w-full sm:w-auto min-h-[44px] px-6 flex items-center justify-center"
            >
              {brandStoryStatus === 'saving' ? 'Saving...' : 'Save Brand Story'}
            </button>
            {brandStoryStatus === 'saved' && <div className="flex items-center justify-center gap-1.5 text-[#C4A896] py-1"><CheckCircle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Saved!</span></div>}
            {brandStoryStatus === 'error' && <div className="flex items-center justify-center gap-1.5 text-[#8B8378] py-1"><AlertTriangle size={14} strokeWidth={1.5} /><span className="text-xs tracking-[0.1em] uppercase">Save failed</span></div>}
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full">
            <button 
              type="submit" 
              disabled={passwordStatus === 'saving'} 
              className="btn-primary rounded-lg disabled:opacity-50 w-full sm:w-auto min-h-[44px] px-6 flex items-center justify-center"
            >
              {passwordStatus === 'saving' ? 'Updating...' : 'Update Password'}
            </button>
            {passwordStatus === 'saved' && (
              <div className="flex items-center justify-center gap-1.5 text-[#C4A896] py-1">
                <CheckCircle size={14} strokeWidth={1.5} />
                <span className="text-xs tracking-[0.1em] uppercase">{passwordMsg}</span>
              </div>
            )}
            {passwordStatus === 'error' && (
              <div className="flex items-center justify-center gap-1.5 text-[#8B8378] py-1">
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
              <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-[#E8E3DA] last:border-0">
                <p className="text-[10px] sm:text-xs tracking-[0.15em] text-[#8B8378] uppercase">{item.label}</p>
                <p className="text-xs text-[#3E3B36] font-mono break-all text-left sm:text-right">{item.value}</p>
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
