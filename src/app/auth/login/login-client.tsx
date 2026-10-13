'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { APP_VERSION } from '@/lib/config';
import { Spinner } from '@/components/ui/Spinner';

/** Only same-app paths, and only into the area the signed-in role can use: never an open redirect. */
function safeRedirect(requested: string | null, roleHome: string): string {
  if (!requested) return roleHome;
  const area = roleHome === '/admin' ? /^\/admin(\/|\?|$)/ : /^\/dashboard(\/|\?|$)/;
  return area.test(requested) && !requested.startsWith('//') ? requested : roleHome;
}

export default function LoginClient({ requestedRedirect, passwordReset }: { requestedRedirect: string | null; passwordReset: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password }),
    }).catch(() => null);
    const body: { error?: string; redirect?: string } | null = await res?.json().catch(() => null);

    setLoading(false);

    if (!res?.ok) {
      setError(body?.error ?? 'Unable to sign in. Please try again.');
      return;
    }

    router.push(safeRedirect(requestedRedirect, body?.redirect === '/admin' ? '/admin' : '/dashboard'));
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <Link href="/" aria-label="FrontLoop home" className="inline-flex items-center mb-6">
            <BrandLogo size="lg" priority />
          </Link>
          <h1 className="serif-headline text-2xl text-[#0F172A] mb-2">Welcome back</h1>
          <p className="text-xs tracking-[0.15em] text-[#64748B] uppercase">Sign in to your FrontLoop workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8">

          {passwordReset && !error && (
            <div role="status" className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-emerald-800 text-xs tracking-[0.05em]">
                Password updated. Sign in with your new password.
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-rose-700 text-xs tracking-[0.1em]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label htmlFor="login-email" className="block text-xs tracking-[0.2em] text-[#64748B] uppercase mb-2">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="block text-xs tracking-[0.2em] text-[#64748B] uppercase">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs text-[#64748B] hover:text-[#0F172A] underline underline-offset-2 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

          </form>

          <div className="mt-6 pt-6 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-[#0F172A] hover:text-[#047857] transition-colors">
                Create workspace →
              </Link>
            </p>
          </div>

        </div>

        {/* Back to landing & Version Badge */}
        <div className="text-center mt-6 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="text-xs tracking-[0.15em] text-[#64748B] hover:text-[#047857] transition-colors uppercase"
          >
            ← Back to home
          </Link>
          <div className="border border-[#E2E8F0]/50 bg-transparent py-1 px-3 rounded-md">
            <span className="text-[10px] tracking-[0.15em] text-[#047857] font-mono">
              {APP_VERSION}
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}
