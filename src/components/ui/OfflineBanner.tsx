'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

// The server snapshot is always "online" so SSR and the first client render match.
const getSnapshot = () => navigator.onLine;
const getServerSnapshot = () => true;

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) return null;

  return (
    <div role="status" className="fixed top-0 left-0 w-full bg-[#0F172A] z-[100] transition-all duration-300 shadow-md">
      <div className="flex items-center justify-center py-2.5 px-4 text-center">
        <p className="text-[10px] tracking-[0.2em] text-white uppercase font-medium">
          You&apos;re offline. Changes will be available when you reconnect.
        </p>
      </div>
    </div>
  );
}
