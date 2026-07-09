'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WhatsAppConnectionMode } from '@/types/broadcast';

interface ModeContextState {
  mode: WhatsAppConnectionMode;
  isLoading: boolean;
  setMode: (mode: WhatsAppConnectionMode) => void;
}

const ModeContext = createContext<ModeContextState>({
  mode: 'NONE',
  isLoading: true,
  setMode: () => {},
});

export function WhatsAppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WhatsAppConnectionMode>('NONE');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMode() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('shops').select('whatsapp_mode').eq('id', user.id).maybeSingle();
        if (data?.whatsapp_mode) {
          setMode(data.whatsapp_mode as WhatsAppConnectionMode);
        }
      }
      setIsLoading(false);
    }
    fetchMode();
  }, []);

  return (
    <ModeContext.Provider value={{ mode, isLoading, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export const useWhatsAppMode = () => useContext(ModeContext);
