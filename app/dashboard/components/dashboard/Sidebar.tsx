"use client";

import { useEffect, useState, useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { canAccessMenu } from "./canAccess";
import type { SessionUserAccess, MenuAccess } from "./canAccess";

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

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [sessionUser, setSessionUser] = useState<SessionUserAccess | null>(
    null,
  );

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

  /* ===================== LOAD SESSION + MENUS ===================== */
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/sidebar/menus", { credentials: "include" });
      if (!res.ok) return;
      const json = await res.json();

      const builtUser: SessionUserAccess = json.user ?? null;
      setSessionUser(builtUser);

      const normalized = (json.menus ?? []).map((m: any) => ({
        ...m,
        required_structural_level:
          m.required_structural_level != null
            ? Number(m.required_structural_level)
            : null,
      }));
      setMenus(normalized);
    };

    load();
  }, []);

  /* ===================== FILTER MENUS ===================== */
  const visibleMenus = useMemo(() => {
    if (!sessionUser) return [];

    return menus
      .filter((m) => m.is_active && m.scope === "sidebar")
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
      className={`h-screen bg-[#020617] border-r border-cyan-500/40
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
        {visibleMenus.length === 0 && (
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
