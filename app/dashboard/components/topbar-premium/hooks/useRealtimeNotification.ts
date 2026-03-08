"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";


export default function useRealtimeNotification() {

  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Ambil user_id
  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUserId(data.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Load unread count via RPC (bypass permission denied)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for call site
  const loadUnreadCount = async (_uid: string) => {
    const { data } = await supabase.rpc("get_my_events_count");
    const c = typeof data === "number" ? data : 0;
    setCount(c);
    setHasNew(c > 0);
  };

  // Subscribe realtime SETELAH userId ada
  useEffect(() => {
    if (!userId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load + subscription sync from DB
    loadUnreadCount(userId);

    const channel = supabase
      .channel("topbar_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setCount((c) => c + 1);
          setHasNew(true);

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            setHasNew(false);
          }, 10000);
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const refreshCount = useCallback(() => {
    if (userId) void loadUnreadCount(userId);
  }, [userId]);

  return {
    count,
    hasNew,
    refreshCount,
  };
}
