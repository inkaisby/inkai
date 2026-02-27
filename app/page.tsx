"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";

import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import CinematicIntro from "@/components/ui/CinematicIntro";
import LoginModal from "@/app/auth/login/LoginModal";
import JarvisLoader from "@/components/JarvisLoader";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/dashboard";

  const [phase, setPhase] = useState<"intro" | "landing" | "auth" | "boot">(
    "intro",
  );
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  const handleIntroFinish = () => {
    setTimeout(() => setPhase("landing"), 600);
  };

  useEffect(() => {
    if (phase === "landing") {
      requestAnimationFrame(() => loginButtonRef.current?.focus());
    }
  }, [phase]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setPhase("boot");
        await new Promise((r) => setTimeout(r, 300));
        router.replace(returnTo);
        router.refresh();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [router, returnTo]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {phase === "intro" && (
        <motion.div>
          <CinematicIntro onFinish={handleIntroFinish} />
        </motion.div>
      )}

      {phase === "landing" && (
        <motion.div className="text-center">
          <img
            src="/logo/inkai-logo.png"
            alt="INKAI"
            className="w-40 mx-auto mb-6"
          />
          <h1 className="text-5xl font-extrabold">INKAI</h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPhase("auth");
            }}
          >
            <button
              ref={loginButtonRef}
              type="submit"
              className="mt-10 px-12 py-3 font-bold bg-gradient-to-r from-yellow-300 to-red-500 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              Login
            </button>
          </form>
        </motion.div>
      )}

      {phase === "auth" && (
        <motion.div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xl">
          <LoginModal onClose={() => setPhase("landing")} />
        </motion.div>
      )}

      {phase === "boot" && (
        <motion.div className="fixed inset-0 flex items-center justify-center bg-black/90">
          <JarvisLoader mode="full" />
        </motion.div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="relative h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
          <JarvisLoader mode="full" />
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
