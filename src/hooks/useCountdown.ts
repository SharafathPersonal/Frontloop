'use client';

import { useCallback, useEffect, useState } from 'react';

/** Seconds remaining on a one-shot countdown; `start(n)` (re)starts it. */
export function useCountdown(): [remaining: number, start: (seconds: number) => void] {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((seconds: number) => setRemaining(Math.max(0, Math.ceil(seconds))), []);
  return [remaining, start];
}
