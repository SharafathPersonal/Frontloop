'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { APP_VERSION } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import type { RegisterFormValues } from '@/types/broadcast';
import { Spinner } from '@/components/ui/Spinner';

const INDUSTRY_TYPES = [
  'Fashion & Apparel',
  'Food & Beverage',
  'Electronics & Tech',
  'Health & Wellness',
  'Home & Furniture',
  'Beauty & Cosmetics',
  'Jewellery & Accessories',
  'Automotive',
  'Sports & Outdoors',
  'Education',
  'Other Retail',
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormValues>({
    email: '',
    password: '',
    confirmPassword: '',
    shop_name: '',
    owner_phone: '',
    contact_number: '',
    location_address: '',
    city: '',
    district: '',
    state: '',
    country: '',
    industry_type: '',
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

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          shop_name: form.shop_name,
          owner_phone: form.owner_phone,
          contact_number: form.contact_number,
          location_address: form.location_address,
          city: form.city,
          district: form.district,
          state: form.state,
          country: form.country,
          industry_type: form.industry_type,
        }
      }
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? 'Failed to create account.');
      setLoading(false);
      return;
    }

    // Note: The secondary writes to `public.shops` and `public.wallets` 
    // are now handled atomically by a PostgreSQL trigger on `auth.users` insert!
    
    setLoading(false);
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
            <span className="serif-headline text-lg text-[#3E3B36]">Attendly Broadcast</span>
          </div>
          <h1 className="serif-headline text-2xl text-[#3E3B36] mb-2">Create your workspace</h1>
          <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase">Start broadcasting in minutes</p>
        </div>

        {/* Card */}
        <div className="bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8">

          {error && (
            <div className="mb-6 p-4 bg-[#3E3B36] rounded-lg">
              <p className="text-[#F5F1EA] text-xs tracking-[0.1em]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Shop Name */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Shop / Brand Name
              </label>
              <input
                type="text"
                required
                value={form.shop_name}
                onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="e.g. Noor Fashion House"
                disabled={loading}
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Industry Type
              </label>
              <select
                required
                value={form.industry_type}
                onChange={(e) => setForm({ ...form, industry_type: e.target.value })}
                className="input-editorial disabled:opacity-50"
                disabled={loading}
              >
                <option value="" disabled>Select your industry</option>
                {INDUSTRY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Owner Phone */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Owner WhatsApp Number
              </label>
              <input
                type="tel"
                required
                value={form.owner_phone}
                onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="+91 98765 43210"
                disabled={loading}
              />
            </div>

            {/* Official Contact Number */}
            <div>
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Official Contact Number
              </label>
              <input
                type="tel"
                value={form.contact_number || ''}
                onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                className="input-editorial disabled:opacity-50"
                placeholder="Voice / Landline (Optional)"
                disabled={loading}
              />
            </div>

            {/* Geographical Location */}
            <div className="space-y-4">
              <label className="block text-xs tracking-[0.2em] text-[#8B8378] uppercase mb-2">
                Physical Store Location
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  placeholder="City / Locality"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={form.district || ''}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  placeholder="District"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={form.state || ''}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  placeholder="State"
                  disabled={loading}
                />
                <input
                  type="text"
                  value={form.country || ''}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  placeholder="Country"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#E8E3DA] pt-4">
              <p className="text-xs tracking-[0.15em] text-[#8B8378] uppercase mb-4">Account Credentials</p>
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
                placeholder="Repeat your password"
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
          By creating a workspace, you agree to our terms of service.<br />
          1 credit = 1 WhatsApp message delivered.
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
