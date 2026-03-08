"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import LoginModal from "@/app/auth/login/LoginModal";
import JarvisLoader from "@/components/JarvisLoader";
import { useBootstrapStore, type BootstrapData } from "@/app/dashboard/store/bootstrapStore";

function getReturnTo(): string {
  if (typeof window === "undefined") return "/dashboard";
  const params = new URLSearchParams(window.location.search);
  return params.get("returnTo") || "/dashboard";
}

export default function Home() {
  const router = useRouter();
  const [phase, setPhase] = useState<"landing" | "auth" | "boot">("landing");
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase === "landing") {
      requestAnimationFrame(() => loginButtonRef.current?.focus());
    }
  }, [phase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPhase("boot");
        fetch("/api/sidebar/menus", { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .then((json: { user?: unknown; menus?: unknown[]; profile_completed?: boolean } | null) => {
            if (json) {
              useBootstrapStore.getState().setBootstrap({
                user: (json.user ?? null) as BootstrapData["user"],
                menus: json.menus ?? [],
                profile_completed: json.profile_completed ?? false,
              });
            }
          })
          .catch(() => {});
        setTimeout(() => {
          router.replace(getReturnTo());
          router.refresh();
        }, 300);
      }
    });

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setPhase("boot");
        await new Promise((r) => setTimeout(r, 300));
        router.replace(getReturnTo());
        router.refresh();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white flex items-center justify-center">
      {phase === "landing" && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Image
            src="/logo/inkai-logo.png"
            alt="INKAI"
            width={160}
            height={160}
            className="mx-auto mb-6"
          />
          <h1 className="text-5xl font-extrabold text-white">INKAI</h1>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPhase("auth");
            }}
          >
            <button
              ref={loginButtonRef}
              type="submit"
              className="mt-10 px-12 py-3 font-bold bg-gradient-to-r from-yellow-300 to-red-500 rounded-xl text-black
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
