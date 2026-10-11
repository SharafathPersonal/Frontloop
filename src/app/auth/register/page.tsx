'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { Spinner } from '@/components/ui/Spinner';

// Mirrors TENANT_CATEGORIES in src/server/models/BusinessTenant.ts
const CATEGORIES = [
  { value: 'clinic', label: 'Clinic / Healthcare' },
  { value: 'institute', label: 'Educational Institute' },
  { value: 'restaurant', label: 'Restaurant / Café' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'other', label: 'Other Business' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: form.businessName,
        category: form.category,
        email: form.email,
        password: form.password,
      }),
    }).catch(() => null);

    setLoading(false);

    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? 'Failed to create account.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#F5F1EA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image src="/images/logo-dark.png" alt="Attendly Logo" fill sizes="32px" className="object-contain" />
            </div>
            <span className="serif-headline text-lg text-[#3E3B36]">Attendly</span>
          </div>
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-2">Create your workspace</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Your WhatsApp assistant in minutes</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">

          {error && (
            <div className="mb-6 p-4 bg-[#3E3B36] rounded-lg">
              <p className="text-[#F5F1EA] text-xs tracking-[0.1em]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Business Name */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Business Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="e.g. Sunrise Dental Clinic"
                disabled={loading}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Business Type
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-editorial disabled:opacity-50"
                disabled={loading}
              >
                <option value="" disabled>Select your business type</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="Min. 8 characters"
                disabled={loading}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
                    <span>CREATING WORKSPACE...</span>
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>

          </form>

          <div className="mt-6 pt-6 border-t border-[#E8E3DA] text-center">
            <p className="text-xs text-[#8B8378]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#3E3B36] hover:text-[#C4A896] transition-colors">
                Sign in →
              </Link>
            </p>
          </div>

        </div>

        {/* Terms note */}
        <p className="text-center text-xs text-[#8B8378] mt-6 leading-relaxed">
          By creating a workspace, you agree to our terms of service.
        </p>

        {/* Version Badge */}
        <div className="flex justify-center mt-6 pb-6">
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
