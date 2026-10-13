'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Spinner } from '@/components/ui/Spinner';
import { OtpInput, emptyOtp } from '@/components/ui/OtpInput';
import { useCountdown } from '@/hooks/useCountdown';
import { APP_VERSION } from '@/lib/config';
import { PASSWORD_RULES, passwordProblem } from '@/lib/password-policy';

// Mirrors TENANT_CATEGORIES in src/server/models/BusinessTenant.ts
const CATEGORIES = [
  { value: 'clinic', label: 'Clinic / Healthcare' },
  { value: 'institute', label: 'Educational Institute' },
  { value: 'restaurant', label: 'Restaurant / Café' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'other', label: 'Other Business' },
] as const;

const labelClass = 'block text-xs tracking-[0.2em] text-[#64748B] uppercase mb-2';

type SendResponse = { ok?: boolean; error?: string; resendAfter?: number; retryAfter?: number };

export default function RegisterClient() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [form, setForm] = useState({ businessName: '', category: '', email: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState(emptyOtp);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, startResendTimer] = useCountdown();

  /** Sends (or resends) the verification code for the details in step 1. */
  const requestCode = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null);
    const data: SendResponse | null = await res?.json().catch(() => null);
    setLoading(false);

    if (res?.status === 429 && data?.retryAfter) startResendTimer(data.retryAfter);
    if (!res?.ok) {
      setError(data?.error ?? 'Could not send the verification code. Please try again.');
      return false;
    }
    startResendTimer(data?.resendAfter ?? 60);
    return true;
  };

  const handleDetailsSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);

    if (await requestCode()) {
      setOtp(emptyOtp());
      setNotice(`We sent a 6-digit code to ${form.email}. It expires in 10 minutes.`);
      setStep('verify');
    }
  };

  const verify = async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/register/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, code }),
    }).catch(() => null);
    const data: { error?: string; redirect?: string } | null = await res?.json().catch(() => null);

    if (!res?.ok) {
      setLoading(false);
      setError(data?.error ?? 'Could not verify the code. Please try again.');
      setOtp(emptyOtp());
      return;
    }
    router.push(data?.redirect ?? '/dashboard');
    router.refresh();
  };

  const handleVerifySubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter all 6 digits of the code.');
    void verify(code);
  };

  const handleResend = async () => {
    if (await requestCode()) {
      setOtp(emptyOtp());
      setNotice(`A new code is on its way to ${form.email}. Earlier codes no longer work.`);
    }
  };

  const changeEmail = () => {
    setStep('details');
    setError(null);
    setNotice(null);
    setOtp(emptyOtp());
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" aria-label="FrontLoop home" className="inline-flex items-center mb-6">
            <BrandLogo size="lg" priority />
          </Link>
          <h1 className="serif-headline text-2xl text-[#0F172A] mb-2">
            {step === 'details' ? 'Create your workspace' : 'Verify your email'}
          </h1>
          <p className="text-xs tracking-[0.15em] text-[#64748B] uppercase" aria-live="polite">
            Step {step === 'details' ? 1 : 2} of 2
          </p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
          {error && (
            <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-rose-700 text-xs tracking-[0.05em]">{error}</p>
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <div>
                <label htmlFor="register-business-name" className={labelClass}>Business Name</label>
                <input
                  id="register-business-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="organization"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  placeholder="e.g. Sunrise Dental Clinic"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="register-category" className={labelClass}>Business Type</label>
                <select
                  id="register-category"
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

              <div>
                <label htmlFor="register-email" className={labelClass}>Email Address</label>
                <input
                  id="register-email"
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
                <label htmlFor="register-password" className={labelClass}>Password</label>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="register-password-rules"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  disabled={loading}
                />
                <p id="register-password-rules" className="text-[11px] text-[#64748B] mt-1.5">{PASSWORD_RULES}</p>
              </div>

              <div>
                <label htmlFor="register-confirm-password" className={labelClass}>Confirm Password</label>
                <input
                  id="register-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Sending code...</span>
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-6">
              {notice && (
                <p role="status" className="text-xs text-[#0F172A] leading-relaxed">
                  {notice}
                </p>
              )}

              <div className="space-y-3">
                <p id="register-otp-label" className={labelClass}>Verification Code</p>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  onComplete={(code) => void verify(code)}
                  labelledBy="register-otp-label"
                  describedBy="register-otp-hint"
                  invalid={Boolean(error)}
                  disabled={loading}
                />
                <p id="register-otp-hint" className="text-[11px] text-[#64748B]">
                  Check your inbox and spam folder. You can paste the whole code into the first box.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Verifying...</span>
                  </>
                ) : (
                  'Verify & Create Workspace'
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={changeEmail}
                  disabled={loading}
                  className="text-[#64748B] hover:text-[#0F172A] underline underline-offset-2 disabled:opacity-50"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={loading || resendIn > 0}
                  aria-live="polite"
                  className="text-[#047857] font-semibold hover:text-[#065F46] disabled:text-[#64748B] disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-[#E2E8F0] text-center">
            <p className="text-xs text-[#64748B]">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#0F172A] hover:text-[#047857] transition-colors">
                Sign in →
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748B] mt-6 leading-relaxed">
          By creating a workspace, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-[#0F172A]">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-[#0F172A]">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex justify-center mt-6 pb-6">
          <div className="border border-[#E2E8F0]/50 bg-transparent py-1 px-3 rounded-md">
            <span className="text-[10px] tracking-[0.15em] text-[#047857] font-mono">{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
