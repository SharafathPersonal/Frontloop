'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces
 * the whole document, so it renders its own <html>/<body> and inline styles
 * (globals.css may not have loaded).
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          background: '#F8FAFC',
          color: '#0F172A',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400, fontSize: 24, margin: '0 0 12px' }}>
            FrontLoop could not load
          </h1>
          <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
            Your data is safe and your AI front desk keeps replying to customers. Please try again in a moment.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#475569', margin: '0 0 24px', wordBreak: 'break-all' }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: '#047857',
              color: '#FFFFFF',
              border: 0,
              borderRadius: 12,
              padding: '14px 28px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
