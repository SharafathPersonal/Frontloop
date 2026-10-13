'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Spinner } from '@/components/ui/Spinner';
import { OtpInput, emptyOtp } from '@/components/ui/OtpInput';
import { useCountdown } from '@/hooks/useCountdown';
import { PASSWORD_RULES, passwordProblem } from '@/lib/password-policy';

const labelClass = 'block text-xs tracking-[0.2em] text-[#64748B] uppercase mb-2';

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(emptyOtp);
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, startResendTimer] = useCountdown();

  const requestCode = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const data: { error?: string; message?: string; resendAfter?: number } | null = await res?.json().catch(() => null);
    setLoading(false);

    if (!res?.ok) {
      setError(data?.error ?? 'Could not request a reset code. Please try again.');
      return false;
    }
    setNotice(data?.message ?? 'If an account exists with this email, an OTP has been sent.');
    startResendTimer(data?.resendAfter ?? 60);
    return true;
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (await requestCode()) {
      setOtp(emptyOtp());
      setStep('reset');
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) return setError('Enter all 6 digits of the code.');
    if (passwords.newPassword !== passwords.confirmPassword) return setError('Passwords do not match.');
    const problem = passwordProblem(passwords.newPassword);
    if (problem) return setError(problem);

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, ...passwords }),
    }).catch(() => null);
    const data: { error?: string } | null = await res?.json().catch(() => null);

    if (!res?.ok) {
      setLoading(false);
      setError(data?.error ?? 'Could not reset your password. Please try again.');
      setOtp(emptyOtp());
      return;
    }
    router.push('/auth/login?reset=1');
  };

  const startOver = () => {
    setStep('email');
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
            {step === 'email' ? 'Password Recovery' : 'Set a new password'}
          </h1>
          <p className="text-xs tracking-[0.15em] text-[#64748B] uppercase">Step {step === 'email' ? 1 : 2} of 2</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 sm:p-8">
          {error && (
            <div role="alert" className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <p className="text-rose-700 text-xs tracking-[0.05em]">{error}</p>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <p className="text-sm text-[#64748B] leading-relaxed">
                Enter the email you signed up with and we will send you a 6-digit code to reset your password.
              </p>
              <div>
                <label htmlFor="forgot-email" className={labelClass}>Email Address</label>
                <input
                  id="forgot-email"
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
                  'Send Reset Code'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              {notice && (
                <p role="status" className="text-xs text-[#0F172A] leading-relaxed">
                  {notice} Codes expire in 10 minutes.
                </p>
              )}

              <div className="space-y-3">
                <p id="reset-otp-label" className={labelClass}>Reset Code</p>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  labelledBy="reset-otp-label"
                  invalid={Boolean(error)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="reset-new-password" className={labelClass}>New Password</label>
                <input
                  id="reset-new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="reset-password-rules"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="input-editorial disabled:opacity-50"
                  disabled={loading}
                />
                <p id="reset-password-rules" className="text-[11px] text-[#64748B] mt-1.5">{PASSWORD_RULES}</p>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className={labelClass}>Confirm New Password</label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
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
                    <span>Resetting...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>

              <p className="text-[11px] text-[#64748B] leading-relaxed">
                Resetting signs you out on every device. You will sign in again with the new password.
              </p>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={startOver}
                  disabled={loading}
                  className="text-[#64748B] hover:text-[#0F172A] underline underline-offset-2 disabled:opacity-50"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={() => void requestCode().then((sent) => sent && setOtp(emptyOtp()))}
                  disabled={loading || resendIn > 0}
                  aria-live="polite"
                  className="text-[#047857] font-semibold hover:text-[#065F46] disabled:text-[#64748B] disabled:cursor-not-allowed"
                >
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/auth/login"
            className="text-xs tracking-[0.15em] text-[#64748B] hover:text-[#047857] transition-colors uppercase"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
