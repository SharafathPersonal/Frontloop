'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import type { LoginFormValues } from '@/types/broadcast';
import { Spinner } from '@/components/ui/Spinner';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginFormValues>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#F5F1EA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image src="/images/logo-dark.png" alt="Attendly Logo" fill sizes="32px" className="object-contain" />
            </div>
            <span className="serif-headline text-lg text-[#3E3B36]">Attendly Broadcast</span>
          </div>
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-2">Welcome back</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Sign in to your broadcast workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">

          {error && (
            <div className="mb-6 p-4 bg-[#3E3B36] rounded-lg">
              <p className="text-[#F5F1EA] text-xs tracking-[0.1em]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Email Address
              </label>
              <input
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
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Password
              </label>
              <input
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
                    <span>PROCESSING PROFILE...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>

          </form>

          <div className="mt-6 pt-6 border-t border-[#E8E3DA] text-center">
            <p className="text-xs text-[#8B8378]">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-[#3E3B36] hover:text-[#C4A896] transition-colors">
                Create workspace →
              </Link>
            </p>
          </div>

        </div>

        {/* Back to landing & Version Badge */}
        <div className="text-center mt-6 flex flex-col items-center gap-4">
          <Link
            href="/"
            className="text-xs tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase"
          >
            ← Back to home
          </Link>
          <div className="border border-[#E8E3DA]/50 bg-transparent py-1 px-3 rounded-md">
            <span className="text-[10px] tracking-[0.15em] text-[#C4A896] font-mono">
              {APP_VERSION}
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}
