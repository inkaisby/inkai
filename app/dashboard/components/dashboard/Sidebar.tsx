"use client";

/**
 * Sidebar dashboard: layout statis (logo + nav vertikal), item menu 100% dari DB.
 * Data dari bootstrap store (satu fetch di layout → /api/sidebar/menus).
 * RBAC: canAccessMenu filter per user (app_role, structural_level, functional_role).
 */
import { useEffect, useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { canAccessMenu } from "./canAccess";
import type { SessionUserAccess, MenuAccess } from "./canAccess";
import { useBootstrapStore } from "../../store/bootstrapStore";
import { prefetchForRoute } from "../../lib/prefetchCache";

interface MenuRow {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  color: string | null;
  order_index: number;
  is_active: boolean;
  scope: "sidebar" | "settings" | null;
  superadmin_only: boolean;
  required_structural_level: number | null;
  required_functional_role: string | null;
  context_required: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: bootstrap, loading: bootstrapLoading } = useBootstrapStore();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const sessionUser = bootstrap?.user ?? null;
  const menus: MenuRow[] = useMemo(() => {
    const raw = bootstrap?.menus ?? [];
    return raw.map((m: Record<string, unknown>) => ({
      ...m,
      required_structural_level:
        m.required_structural_level != null
          ? Number(m.required_structural_level)
          : null,
    })) as MenuRow[];
  }, [bootstrap?.menus]);

  const iconMap = Icons as unknown as Record<string, LucideIcon>;

  /* ===================== MOUNT ===================== */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const stored = localStorage.getItem("sidebar:isOpen");
    if (stored !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(stored === "true");
    }
  }, []);

  /* ===================== TOGGLE FROM TOPBAR ===================== */
  useEffect(() => {
    const handler = () => {
      setIsOpen((v) => {
        const next = !v;
        localStorage.setItem("sidebar:isOpen", String(next));
        return next;
      });
    };

    window.addEventListener("toggle-sidebar", handler);

    return () => {
      window.removeEventListener("toggle-sidebar", handler);
    };
  }, []);

  /* ===================== FILTER MENUS ===================== */
  // Layout sidebar statis; item hanya dari API (DB). Sembunyikan hanya jika is_active === false.
  const visibleMenus = useMemo(() => {
    if (!sessionUser) return [];

    return menus
      .filter((m) => m.scope === "sidebar" && m.is_active !== false)
      .filter((m) => {
        const access: MenuAccess = {
          key: m.key,
          superadmin_only: m.superadmin_only,
          required_structural_level: m.required_structural_level,
          required_functional_role: m.required_functional_role,
          context_required: m.context_required,
        };
        return canAccessMenu(access, sessionUser);
      })
      .sort((a, b) => a.order_index - b.order_index);
  }, [menus, sessionUser]);

  /* ===================== PREFETCH ===================== */
  useEffect(() => {
    visibleMenus.forEach((m) => {
      const href = m.key === "dashboard" ? "/dashboard" : `/dashboard/${m.key}`;
      router.prefetch(href);
    });
  }, [visibleMenus, router]);

  if (!mounted) return null;

  /* ===================== UI ===================== */
  return (
    <aside
      className={`h-screen bg-[#020617] border-r border-cyan-500/40 z-30
      transition-all duration-200 ${isOpen ? "w-56" : "w-16"}`}
    >
      <div className="h-16 flex items-center justify-center border-b border-cyan-500/30">
        <Image
          src="/logo/inkai-logo.png"
          alt="INKAI"
          width={28}
          height={28}
          onClick={() => {
            setIsOpen((v) => {
              localStorage.setItem("sidebar:isOpen", String(!v));
              return !v;
            });
          }}
          className="cursor-pointer"
        />
      </div>

      <nav className="flex flex-col gap-1 px-1 mt-4">
        {bootstrapLoading && !sessionUser && (
          <div className="text-xs text-white/40 px-3 py-2 animate-pulse">Memuat menu…</div>
        )}
        {!bootstrapLoading && visibleMenus.length === 0 && (
          <div className="text-xs text-white/40 px-3 py-2">Tidak ada menu</div>
        )}

        {visibleMenus.map((m) => {
          const Icon = iconMap[m.icon ?? "Circle"] ?? Icons.Circle;

          const href =
            m.key === "dashboard" ? "/dashboard" : `/dashboard/${m.key}`;

          const active =
            m.key === "dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(`/dashboard/${m.key}`);

          return (
            <Link
              key={m.id}
              href={href}
              onMouseEnter={() => prefetchForRoute(m.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md
                ${
                  active
                    ? "bg-cyan-600 text-white"
                    : "text-white/70 hover:bg-cyan-500/10"
                }`}
            >
              <Icon size={18} className={m.color ?? "text-cyan-400"} />
              {isOpen && <span>{m.name}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
