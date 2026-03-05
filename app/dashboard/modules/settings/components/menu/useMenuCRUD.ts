"use client";

import { useEffect, useState, useCallback } from "react";
import { useBootstrapStore } from "../../../../store/bootstrapStore";

export type MenuRow = {
  id: string;
  key: string;
  name: string;
  order_index: number;
  is_active: boolean;
  superadmin_only: boolean;
  scope: "sidebar" | "settings" | null;
  icon: string | null;
  color: string | null;
  context_required: boolean;
  required_structural_level: number | null;
  required_functional_role: string | null;
};

export function useMenuCRUD() {
  const { data: bootstrap, setBootstrap } = useBootstrapStore();
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rootEmail =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_INKAI_ROOT_EMAIL as string | undefined)?.toLowerCase() ?? null;
  const email = bootstrap?.user?.email?.toLowerCase() ?? null;
  const appRole = bootstrap?.user?.app_role ?? null;
  const isSuperadmin =
    (rootEmail && email && email === rootEmail) || (appRole ?? "").toUpperCase() === "SUPERADMIN";

  /* ================= FETCH MENUS ================= */
  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch("/api/menus", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat menu");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setMenus(list);

      // Sinkronkan ke bootstrap store supaya Sidebar ikut realtime (pakai getState agar effect tidak re-run terus)
      const current = useBootstrapStore.getState().data;
      if (current) {
        setBootstrap({
          ...current,
          menus: list,
        });
      }
    } catch (e: any) {
      setError(e.message);
      setMenus([]);
    }
  }, [setBootstrap]);

  /* ================= CRUD ================= */
const createMenu = async (payload: Partial<MenuRow>) => {
  if (!isSuperadmin) {
    throw new Error("Forbidden");
  }

  const res = await fetch("/api/menus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      key: payload.key,
      name: payload.name,
      order_index: payload.order_index ?? 0,
      is_active: payload.is_active ?? true,
      superadmin_only: payload.superadmin_only ?? false,
      scope: payload.scope ?? "sidebar",
      icon: payload.icon ?? "Circle",
      color: payload.color ?? null,
      context_required: payload.context_required ?? false,
      required_structural_level: payload.required_structural_level ?? null,
      required_functional_role: payload.required_functional_role ?? null,
    }),
  });
  if (!res.ok) throw new Error("Gagal membuat menu");
  await fetchMenus();
};



const updateMenu = async (id: string, payload: Partial<MenuRow>) => {
  if (!isSuperadmin) throw new Error("Forbidden");

  const existing = menus.find((m) => m.id === id);
  if (!existing) throw new Error("Menu tidak ditemukan");

  const res = await fetch("/api/menus", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      id,
      key: payload.key ?? existing.key,
      name: payload.name ?? existing.name,
      order_index: payload.order_index ?? existing.order_index,
      is_active: payload.is_active ?? existing.is_active,
      superadmin_only: payload.superadmin_only ?? existing.superadmin_only,
      scope: payload.scope ?? existing.scope,
      icon: payload.icon ?? existing.icon,
      color: payload.color ?? existing.color,
      context_required: payload.context_required ?? existing.context_required,
      required_structural_level: payload.required_structural_level ?? existing.required_structural_level,
      required_functional_role: payload.required_functional_role ?? existing.required_functional_role,
    }),
  });
  if (!res.ok) throw new Error("Gagal mengupdate menu");

  await fetchMenus();
};



const deleteMenu = async (id: string) => {
  if (!isSuperadmin) throw new Error("Forbidden");

  const res = await fetch(`/api/menus?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Gagal menghapus menu");

  await fetchMenus();
};


  /* ================= INIT ================= */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await fetchMenus();
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [fetchMenus]);


  return {
    menus,
    loading,
    error,
    isSuperadmin,
    createMenu,
    updateMenu,
    deleteMenu,
  };
}
