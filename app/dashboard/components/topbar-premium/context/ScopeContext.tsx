"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useBootstrapStore } from "../../../store/bootstrapStore";

export type UserScope = {
  is_pp: boolean;
  provinsi_ids: string[];
  cabang_ids: string[];
  ranting_ids: string[];
};

export type ScopeContextOption = {
  value: string;
  label: string;
  type: "all" | "ranting" | "cabang";
};

type ScopeContextValue = {
  scope: UserScope | null;
  loading: boolean;
  /** app_role dari profile (SUPERADMIN, USER, dll.) — untuk pengecekan superadmin */
  app_role: string | null;
  /** Opsi untuk dropdown konteks (Semua + ranting/cabang yang user punya akses) */
  contextOptions: ScopeContextOption[];
  /** Nilai terpilih: "all" atau uuid (ranting/cabang) */
  selectedContext: string;
  setSelectedContext: (value: string) => void;
};

const STORAGE_KEY = "inkai:scope_context";

const defaultValue: ScopeContextValue = {
  scope: null,
  loading: true,
  app_role: null,
  contextOptions: [],
  selectedContext: "all",
  setSelectedContext: () => {},
};

const ScopeContext = createContext<ScopeContextValue>(defaultValue);

export function useScope() {
  const ctx = useContext(ScopeContext);
  return ctx ?? defaultValue;
}

type ScopeProviderProps = { children: ReactNode };

export function ScopeProvider({ children }: ScopeProviderProps) {
  const { data: bootstrap, loading: bootstrapLoading } = useBootstrapStore();
  const [contextOptions, setContextOptions] = useState<ScopeContextOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [selectedContext, setSelectedContextState] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(STORAGE_KEY) ?? "all";
  });

  const scope = (bootstrap?.user?.scope ?? null) as UserScope | null;
  const app_role = bootstrap?.user?.app_role ?? null;
  const loading = bootstrapLoading || optionsLoading;

  const setSelectedContext = useCallback((value: string) => {
    setSelectedContextState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, []);

  /* Bangun contextOptions dari scope (ranting/cabang) bila perlu */
  useEffect(() => {
    if (!bootstrap?.user?.scope) {
      setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
      return;
    }
    const sc = bootstrap.user.scope;
    if (sc.is_pp || (sc.ranting_ids.length <= 1 && sc.cabang_ids.length <= 1)) {
      setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
      return;
    }

    let cancelled = false;
    setOptionsLoading(true);

    (async () => {
      try {
        const [rantRes, cabRes] = await Promise.all([
          fetch("/api/ranting", { credentials: "include" }),
          fetch("/api/cabang", { credentials: "include" }),
        ]);
        if (cancelled) return;
        let rantingList: { id: string; nama: string }[] = [];
        let cabangList: { id: string; nama: string }[] = [];
        if (rantRes.ok) {
          const t = await rantRes.text();
          if (t.trim()) rantingList = JSON.parse(t) as { id: string; nama: string }[];
        }
        if (cabRes.ok) {
          const t = await cabRes.text();
          if (t.trim()) cabangList = JSON.parse(t) as { id: string; nama: string }[];
        }
        const options: ScopeContextOption[] = [
          { value: "all", label: "Semua", type: "all" },
          ...rantingList.map((r) => ({
            value: r.id,
            label: `Ranting: ${r.nama}`,
            type: "ranting" as const,
          })),
          ...cabangList.map((c) => ({
            value: `cabang:${c.id}`,
            label: `Cabang: ${c.nama}`,
            type: "cabang" as const,
          })),
        ];
        if (!cancelled) setContextOptions(options);
      } catch {
        if (!cancelled) setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrap?.user?.scope]);

  const value = useMemo<ScopeContextValue>(
    () => ({
      scope,
      loading,
      app_role,
      contextOptions,
      selectedContext,
      setSelectedContext,
    }),
    [scope, loading, app_role, contextOptions, selectedContext, setSelectedContext]
  );

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
}
