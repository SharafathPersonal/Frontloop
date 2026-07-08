'use client';

import { useEffect } from 'react';

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
    <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E8E3DA] rounded-xl p-8 text-center shadow-sm">
        
        <p className="uppercase text-[10px] tracking-[0.25em] text-[#8B8378] font-medium mb-4">
          SYSTEM ERROR
        </p>
        
        <h1 className="serif-headline text-xl text-[#3E3B36] font-normal tracking-tight mb-2">
          Workspace Execution Failed
        </h1>
        
        <p className="text-sm text-[#8B8378] leading-relaxed mb-6">
          A critical rendering fault was intercepted. The active session has been safely halted to prevent data corruption.
        </p>

        <div className="bg-[#F5F1EA]/50 border border-[#E8E3DA] rounded-md p-4 mb-8 text-left overflow-hidden">
          <p className="text-[10px] tracking-[0.2em] text-[#8B8378] uppercase mb-1.5 font-medium">Technical Payload</p>
          <code className="text-[11px] font-mono text-[#3E3B36] break-words">
            {error.message || 'Unknown runtime exception occurred.'}
          </code>
        </div>

        <button
          onClick={() => reset()}
          className="btn-primary w-full rounded-lg py-3.5 text-xs tracking-[0.2em] uppercase transition-all"
        >
          Try Refreshing App State
        </button>

      </div>
    </div>
  );
}
