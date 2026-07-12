'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/contexts/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      showToast(authError.message, 'error');
      return;
    }

    setSuccess(true);
    showToast('Secure recovery link sent to your email.', 'success');
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
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-2">Password Recovery</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Secure your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">

          {error && (
            <div className="mb-6 p-4 bg-[#3E3B36] rounded-lg">
              <p className="text-[#F5F1EA] text-xs tracking-[0.1em]">{error}</p>
            </div>
          )}

          {success ? (
             <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="serif-headline text-xl text-[#3E3B36]">Check your email</h3>
                <p className="text-sm text-[#8B8378]">We have sent a secure recovery link to {email}. Please check your inbox.</p>
                <div className="pt-4">
                    <Link href="/auth/login" className="btn-primary w-full rounded-lg flex items-center justify-center py-2.5 px-4 text-sm font-medium transition-all duration-200 block">
                        Return to Sign In
                    </Link>
                </div>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                    Email Address
                </label>
                <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-editorial disabled:opacity-50"
                    placeholder="you@example.com"
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
                        <span>SENDING LINK...</span>
                    </>
                    ) : (
                    '⚡ Send Reset Secure Link'
                    )}
                </button>
                </div>
            </form>
          )}

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
