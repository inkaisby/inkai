"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

export const SessionContext = createContext<{
  session: Session | null;
} | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session }}>
      {children}
    </SessionContext.Provider>
  );
}
