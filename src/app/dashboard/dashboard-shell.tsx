'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
  HelpCircle,
  AlertTriangle,
  Users,
  BookOpen,
  QrCode,
} from 'lucide-react';
import CustomConfirm from '@/components/ui/CustomConfirm';
import { ToastProvider } from '@/contexts/ToastContext';

export interface ShellTenant {
  name: string;
  category: string;
  whatsappStatus: 'disconnected' | 'connected' | 'error';
}

interface NavLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navLinks: NavLink[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={14} strokeWidth={1.5} /> },
  { label: 'Leads & Chats', href: '/dashboard/leads', icon: <Users size={14} strokeWidth={1.5} /> },
  { label: 'Knowledge Base', href: '/dashboard/knowledge', icon: <BookOpen size={14} strokeWidth={1.5} /> },
  { label: 'Front Desk & QR', href: '/dashboard/qr', icon: <QrCode size={14} strokeWidth={1.5} /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={14} strokeWidth={1.5} /> },
  { label: 'Support', href: '/dashboard/support', icon: <HelpCircle size={14} strokeWidth={1.5} /> },
];

function TenantBadge({ name, size }: { name: string; size: 'sm' | 'md' }) {
  const box = size === 'md' ? 'h-8 w-8 rounded-md text-xs' : 'h-7 w-7 rounded text-[10px]';
  return (
    <div className={`${box} bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0 font-bold uppercase`}>
      {name.slice(0, 2)}
    </div>
  );
}

export default function DashboardShell({ tenant, children }: { tenant: ShellTenant; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null);

  // Open drawer: move focus into it and let Escape close it.
  useEffect(() => {
    if (!sidebarOpen) return;
    closeMenuRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const handleSignOut = async () => {
    setIsLogoutConfirmOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
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
      <div className="px-6 py-6 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <TenantBadge name={tenant.name} size="md" />
          <span className="font-semibold text-sm text-[#0F172A] truncate max-w-[150px]" title={tenant.name}>
            {tenant.name}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0">
        <p className="text-[10px] tracking-[0.2em] text-[#64748B] uppercase px-3 mb-3">Navigation</p>
        {navLinks.map((link) => {
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all text-xs tracking-[0.15em] uppercase min-w-0 ${
                active
                  ? 'bg-[#ECFDF5] text-[#065F46] font-semibold'
                  : 'text-[#64748B] hover:text-[#047857]'
              }`}
            >
              {link.icon}
              <span className="break-words whitespace-normal">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Sign Out */}
      <div className="px-4 py-5 border-t border-[#E2E8F0] flex-shrink-0">
        <p className="text-[10px] tracking-[0.15em] text-[#64748B] uppercase mb-3 px-2 truncate">
          {tenant.category}
        </p>
        <button
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-xs tracking-[0.15em] uppercase text-[#64748B] hover:text-[#047857] transition-colors mb-4"
        >
          <LogOut size={14} strokeWidth={1.5} />
          Sign Out
        </button>

        {/* Subtle, premium platform white-label footprint */}
        <div className="px-2 pt-4 border-t border-[#E2E8F0]/40">
          <div className="flex items-center gap-2">
            <span className="text-[9px] tracking-[0.15em] text-[#64748B] uppercase">Powered by</span>
            <BrandLogo size="xs" />
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E2E8F0] flex-shrink-0 h-screen overflow-y-auto">
          {sidebarJsx}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {/* `inert` while closed: the invisible drawer's links must not be reachable by Tab or screen readers. */}
        <div
          inert={!sidebarOpen}
          className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <div
            className={`absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            id="mobile-navigation"
            aria-label="Navigation menu"
            className={`absolute left-0 top-0 bottom-0 w-80 max-w-[280px] sm:max-w-xs bg-[#FFFFFF] border-r border-[#E2E8F0] overflow-y-auto z-10 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <button
              ref={closeMenuRef}
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-4 text-[#64748B] hover:text-[#047857] transition-colors p-1.5"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {sidebarJsx}
          </aside>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Fixed Mobile Top Bar with Glassmorphism */}
          <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#FFFFFF]/80 backdrop-blur-md border-b border-[#E2E8F0]/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <TenantBadge name={tenant.name} size="sm" />
              <span className="font-semibold text-xs sm:text-sm text-[#0F172A] truncate max-w-[110px] sm:max-w-[160px]" title={tenant.name}>
                {tenant.name}
              </span>
            </div>

            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#0F172A]/5 rounded-md transition-all shrink-0"
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-navigation"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
            {tenant.whatsappStatus !== 'connected' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" size={20} />
                  <div>
                    <p className="text-sm text-amber-900 font-bold">
                      {tenant.whatsappStatus === 'error' ? 'WhatsApp Connection Error' : 'WhatsApp Not Connected'}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {tenant.whatsappStatus === 'error'
                        ? 'Meta rejected your stored credentials, so automated replies are failing. Reconnect with a fresh access token.'
                        : 'Connect your WhatsApp Business number with your Meta Cloud API credentials to start answering leads.'}
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/settings" className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border border-amber-300">
                  {tenant.whatsappStatus === 'error' ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
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
