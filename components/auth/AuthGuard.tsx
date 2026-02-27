"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import JarvisLoader from "@/components/JarvisLoader";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setReady(!!session);
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <JarvisLoader mode="full" />
      </div>
    );
  }

  // 🔑 INI KUNCI: JANGAN RETURN null
  return <>{children}</>;
}
