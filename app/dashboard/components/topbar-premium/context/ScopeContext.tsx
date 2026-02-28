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
  const [scope, setScope] = useState<UserScope | null>(null);
  const [app_role, setAppRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextOptions, setContextOptions] = useState<ScopeContextOption[]>([]);
  const [selectedContext, setSelectedContextState] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(STORAGE_KEY) ?? "all";
  });

  const setSelectedContext = useCallback((value: string) => {
    setSelectedContextState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const profileRole = (json?.profile?.app_role as string) ?? null;
        if (!cancelled) setAppRole(profileRole);
        const sc: UserScope | undefined = json?.scope;
        if (!sc || cancelled) {
          setScope(null);
          setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
          return;
        }
        setScope(sc);

        if (sc.is_pp || (sc.ranting_ids.length <= 1 && sc.cabang_ids.length <= 1)) {
          setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
          return;
        }

        const [rantRes, cabRes] = await Promise.all([
          fetch("/api/ranting", { credentials: "include" }),
          fetch("/api/cabang", { credentials: "include" }),
        ]);
        if (cancelled) return;

        const rantingList = rantRes.ok ? ((await rantRes.json()) as { id: string; nama: string }[]) : [];
        const cabangList = cabRes.ok ? ((await cabRes.json()) as { id: string; nama: string }[]) : [];

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
        setContextOptions(options);
      } catch {
        if (!cancelled) {
          setScope(null);
          setAppRole(null);
          setContextOptions([{ value: "all", label: "Semua", type: "all" }]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
