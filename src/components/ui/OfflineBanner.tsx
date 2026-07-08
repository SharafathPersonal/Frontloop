'use client';

import { useState, useEffect } from 'react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Only run on client
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-[#3E3B36] z-[100] transition-all duration-300 shadow-md">
      <div className="flex items-center justify-center py-2.5 px-4 text-center">
        <p className="text-[10px] tracking-[0.2em] text-white uppercase font-medium">
          Network Connectivity Interrupted. Dispatch queues are safely paused.
        </p>
      </div>
    </div>
  );
}
