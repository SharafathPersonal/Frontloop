'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const token = new URLSearchParams(window.location.search).get('token');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);

    setLoading(false);

    if (!res?.ok) {
      const message = (await res?.json().catch(() => null))?.error ?? 'Unable to update password.';
      setError(message);
      showToast(message, 'error');
      return;
    }

    showToast('Password updated successfully. You can now sign in.', 'success');
    router.push('/auth/login');
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
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-2">Set New Password</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Secure your workspace</p>
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
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-editorial disabled:opacity-50"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <span>UPDATING...</span>
                  </>
                ) : (
                  '🔒 Update & Confirm Password'
                )}
              </button>
            </div>
          </form>

        </div>

        {/* Back to signin */}
        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="text-xs tracking-[0.15em] text-[#8B8378] hover:text-[#C4A896] transition-colors uppercase"
          >
            ← Back to sign in
          </Link>
        </div>

      </div>
    </main>
  );
}
