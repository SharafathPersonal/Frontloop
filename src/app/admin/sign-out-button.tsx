'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] hover:text-[#0F172A] transition-colors disabled:opacity-50"
    >
      <LogOut size={14} aria-hidden="true" />
      {busy ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
