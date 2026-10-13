'use client';

import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-8 text-center shadow-sm">
        <p className="uppercase text-[10px] tracking-[0.25em] text-[#64748B] font-medium mb-4">Something went wrong</p>

        <h1 className="serif-headline text-xl text-[#0F172A] font-normal tracking-tight mb-2">
          This page could not load
        </h1>

        <p className="text-sm text-[#64748B] leading-relaxed mb-6">
          Your data is safe and your AI front desk keeps replying to customers. Try again, and if this keeps
          happening, contact support with the reference below.
        </p>

        {/* Raw error messages can carry internal details; only the opaque digest is shown. */}
        {error.digest && (
          <p className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-3 mb-8 text-[11px] font-mono text-[#0F172A] break-all">
            Reference: {error.digest}
          </p>
        )}

        <button
          onClick={() => reset()}
          className="btn-primary w-full rounded-lg py-3.5 text-xs tracking-[0.2em] uppercase transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
