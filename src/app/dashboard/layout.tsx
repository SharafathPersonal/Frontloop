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
} from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { WhatsAppModeProvider, useWhatsAppMode } from '@/contexts/WhatsAppModeContext';

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navLinks: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} /> },
  { label: 'Audience', href: '/dashboard/customers', icon: <Users size={14} strokeWidth={1.5} /> },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: <Radio size={14} strokeWidth={1.5} /> },
  { label: 'Templates', href: '/dashboard/templates', icon: <MessageSquareText size={14} strokeWidth={1.5} /> },
  { label: 'History', href: '/dashboard/history', icon: <Clock size={14} strokeWidth={1.5} /> },
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

  const SidebarContent = () => {
    const { mode, isLoading } = useWhatsAppMode();
    return (
    <div className="flex flex-col h-full">

      {/* Brand Header */}
      <div className="px-6 py-8 border-b border-[#E8E3DA]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="relative w-7 h-7 flex items-center justify-center flex-shrink-0">
             <Image src="/images/logo-dark.png" alt="Attendly Logo" fill className="object-contain" />
          </div>
          <h1 className="serif-headline text-base text-[#3E3B36] leading-tight">
            Attendly<br />Broadcast
          </h1>
        </div>
        {shop && (
          <p className="text-xs tracking-[0.1em] text-[#8B8378] uppercase mt-3 truncate">
            {shop.shop_name}
          </p>
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
          const isTemplates = link.label === 'Templates';
          
          if (isTemplates && isLoading) {
            return (
              <div key={link.href} className="py-2.5 px-3 rounded-lg bg-[#F5F1EA]/30 animate-pulse h-9 w-full" />
            );
          }

          const isLocked = isTemplates && mode === 'QR_EXPRESS';

          if (isLocked) {
            return (
              <div key={link.href} className="flex flex-col gap-1 py-2.5 px-3 rounded-lg bg-[#F5F1EA]/50 opacity-60">
                <div className="flex items-center gap-3 text-xs tracking-[0.15em] uppercase text-[#8B8378]">
                  <Lock size={14} strokeWidth={1.5} />
                  {link.label}
                </div>
                <p className="text-[9px] text-[#8B8378] ml-7">Meta API only</p>
              </div>
            );
          }

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

        <div className="mt-auto pt-6 border-t border-[#E8E3DA]/40 text-center">
          <p className="text-[10px] tracking-[0.25em] font-medium text-[#8B8378]/60 uppercase">
            VERSION {APP_VERSION}
          </p>
        </div>
      </div>

    </div>
    );
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8E3DA] border-t-[#C4A896] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WhatsAppModeProvider>
      <div className="flex h-screen bg-[#F5F1EA] overflow-hidden">

        {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E8E3DA] flex-shrink-0 h-screen overflow-y-auto">
        <SidebarContent />
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
            <SidebarContent />
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
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
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
    </WhatsAppModeProvider>
  );
}
