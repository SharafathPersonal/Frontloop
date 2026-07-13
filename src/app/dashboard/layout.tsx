'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import type { Shop, Wallet } from '@/types/broadcast';
import {
  LayoutDashboard,
  Radio,
  Clock,
  Settings,
  LogOut,
  Menu,
  X,
  Wallet as WalletIcon,
  Users,
  HelpCircle,
  MessageSquareText,
  Lock,
  Receipt,
  Mail,
  QrCode,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { ToastProvider } from '@/contexts/ToastContext';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navLinks: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} /> },
  { label: 'Audience', href: '/dashboard/customers', icon: <Users size={14} strokeWidth={1.5} /> },
  { label: 'Email Campaigns', href: '/dashboard/email', icon: <Mail size={14} strokeWidth={1.5} /> },
  { label: 'WhatsApp Campaigns', href: '/dashboard/campaigns', icon: <Radio size={14} strokeWidth={1.5} /> },
  { label: 'Message Templates', href: '/dashboard/templates', icon: <MessageSquareText size={14} strokeWidth={1.5} /> },
  { label: 'Digital Bill Engine', href: '/dashboard/digital-bill', icon: <QrCode size={14} strokeWidth={1.5} /> },
  { label: 'Flash Offers', href: '/dashboard/flash-offers', icon: <Zap size={14} strokeWidth={1.5} /> },
  { label: 'Transactions', href: '/dashboard/transactions', icon: <Receipt size={14} strokeWidth={1.5} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={14} strokeWidth={1.5} /> },
  { label: 'Support', href: '/dashboard/support', icon: <HelpCircle size={14} strokeWidth={1.5} /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const [{ data: shopData }, { data: walletData }] = await Promise.all([
        supabase.from('shops').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('wallets').select('*').eq('shop_id', user.id).maybeSingle(),
      ]);

      if (shopData) setShop(shopData);
      if (walletData) setWallet(walletData);

      setIsAuthLoading(false);
    }

    loadData();
  }, [router]);

  const triggerSignOut = () => setIsLogoutConfirmOpen(true);

  const handleSignOut = async () => {
    setIsLogoutConfirmOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await fetch('/api/auth/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: user.id,
          account_email: user.email,
          action_type: 'LOGOUT'
        })
      });
    }
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarJsx = (
    <div className="flex flex-col h-full">

      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-[#E8E3DA]">
        {shop ? (
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <div className="relative h-8 w-8 rounded-md overflow-hidden flex-shrink-0 border border-[#E8E3DA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shop.logo_url} alt={shop.shop_name} className="h-8 w-8 object-contain" />
              </div>
            ) : (
              <div className="h-8 w-8 rounded-md bg-[#3E3B36] text-[#F5F1EA] flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase">
                {shop.shop_name.slice(0, 2)}
              </div>
            )}
            <span className="font-semibold text-sm text-[#3E3B36] truncate max-w-[150px]" title={shop.shop_name}>
              {shop.shop_name}
            </span>
          </div>
        ) : (
          <div className="h-8 w-28 bg-[#3E3B36]/10 rounded-md animate-pulse" />
        )}
      </div>

      {/* Credit Wallet Widget */}
      <div className="px-4 py-4 border-b border-[#E8E3DA]">
        <div className="bg-[#F5F1EA] rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#3E3B36] rounded-md flex items-center justify-center flex-shrink-0">
            <WalletIcon size={14} className="text-[#F5F1EA]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase">Credit Balance</p>
            <p className="serif-headline text-lg text-[#3E3B36] leading-tight">
              {wallet ? wallet.credits_remaining.toLocaleString() : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase px-3 mb-3">Navigation</p>
        {navLinks.map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all text-xs tracking-[0.15em] uppercase ${
                active
                  ? 'bg-[#F5F1EA] text-[#3E3B36] font-medium'
                  : 'text-[#8B8378] hover:text-[#C4A896]'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — Sign Out */}
      <div className="px-4 py-5 border-t border-[#E8E3DA]">
        {shop && (
          <p className="text-[10px] tracking-[0.15em] text-[#8B8378] uppercase mb-3 px-2 truncate">
            {shop.industry_type}
          </p>
        )}
        <button
          onClick={triggerSignOut}
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-xs tracking-[0.15em] uppercase text-[#8B8378] hover:text-[#C4A896] transition-colors mb-4"
        >
          <LogOut size={14} strokeWidth={1.5} />
          Sign Out
        </button>

        {/* Subtle, premium platform white-label footprint */}
        <div className="px-2 pt-4 border-t border-[#E8E3DA]/40">
          <div className="flex items-center gap-2">
            <div className="relative w-4 h-4 flex-shrink-0">
              <Image src="/images/logo-dark.png" alt="Attendly Logo" fill sizes="16px" className="object-contain" />
            </div>
            <span className="text-[10px] font-bold tracking-[0.1em] text-[#3E3B36] uppercase">
              True Attendly Broadcast
            </span>
          </div>
          <p className="text-[9px] tracking-wider text-[#8B8378]/60 mt-0.5">
            Version v3.11.1 Live
          </p>
        </div>
      </div>

    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ToastProvider>
        <div className="flex h-screen bg-[#F5F1EA] overflow-hidden">

          {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E8E3DA] flex-shrink-0 h-screen overflow-y-auto">
          {sidebarJsx}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-[#3E3B36]/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#FFFFFF] border-r border-[#E8E3DA] overflow-y-auto z-10">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-[#8B8378] hover:text-[#C4A896] transition-colors"
              >
                <X size={18} />
              </button>
              {sidebarJsx}
            </aside>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-4 bg-[#FFFFFF] border-b border-[#E8E3DA]">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 flex items-center justify-center">
                <Image src="/images/logo-dark.png" alt="Attendly Logo" fill className="object-contain" />
              </div>
              <span className="serif-headline text-base text-[#3E3B36]">Broadcast</span>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#8B8378] hover:text-[#C4A896] transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-4 sm:p-6 md:p-8 flex flex-col gap-6">
            {shop?.whatsapp_mode === 'QR_EXPRESS' && shop?.qr_express_status?.toUpperCase() !== 'CONNECTED' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={20} />
                  <div>
                    <p className="text-sm text-amber-900 font-bold">WhatsApp Disconnected</p>
                    <p className="text-xs text-amber-700 mt-0.5">Please reconnect WhatsApp to activate your QR code and capture real-time leads.</p>
                  </div>
                </div>
                <Link href="/dashboard/settings" className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-amber-300">
                  Connect WhatsApp
                </Link>
              </div>
            )}
            {children}
          </main>

        </div>

        <CustomConfirm
          isOpen={isLogoutConfirmOpen}
          title="System Logout"
          message="Are you sure you want to securely end your active session and sign out of the workspace?"
          confirmText="SIGN OUT"
          onConfirm={handleSignOut}
          onCancel={() => setIsLogoutConfirmOpen(false)}
        />
        </div>
    </ToastProvider>
  );
}
