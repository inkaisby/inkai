"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";


export default function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      try {
        const { error } = await supabase.rpc("get_my_events_count");

        if (!mounted) return;
        setIsConnected(!error);
      } catch {
        if (!mounted) return;
        setIsConnected(false);
      }
    };

    // Check awal
    checkConnection();

    // Interval pengecekan
    const interval = setInterval(checkConnection, 4000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isConnected };
}
