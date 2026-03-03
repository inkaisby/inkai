"use client";

import { create } from "zustand";
import type { SessionUserAccess } from "../components/dashboard/canAccess";

/** Shape scope dari API (sama dengan UserScope di ScopeContext). */
export type BootstrapScope = {
  is_pp?: boolean;
  provinsi_ids?: string[];
  cabang_ids?: string[];
  ranting_ids?: string[];
};

/** User dari bootstrap (session + scope + nama untuk AvatarMenu). */
export type BootstrapUser = SessionUserAccess & {
  scope?: BootstrapScope;
  nama?: string | null;
};

/** Satu panggilan /api/sidebar/menus mengisi ini. Dipakai layout (auth gate), Sidebar (menu), Settings (session), ScopeContext. */
export type BootstrapData = {
  user: BootstrapUser | null;
  menus: unknown[];
  profile_completed: boolean;
};

const TTL_MS = 5 * 60 * 1000; // 5 menit (memory)
const STORAGE_KEY = "inkai:bootstrap";
const STORAGE_TTL_MS = 2 * 60 * 1000; // 2 menit (sessionStorage, untuk rehydrate saat refresh)

type BootstrapState = {
  loading: boolean;
  data: BootstrapData | null;
  fetchedAt: number;
  setLoading: (v: boolean) => void;
  setBootstrap: (data: BootstrapData) => void;
  clearBootstrap: () => void;
  getValid: () => BootstrapData | null;
  /** Isi store dari sessionStorage bila ada (untuk refresh cepat). */
  rehydrateFromStorage: () => boolean;
};

export const useBootstrapStore = create<BootstrapState>((set, get) => ({
  loading: false,
  data: null,
  fetchedAt: 0,

  setLoading: (v) => set({ loading: v }),

  setBootstrap: (data) => {
    const fetchedAt = Date.now();
    set({ data, fetchedAt, loading: false });
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data, fetchedAt })
      );
    } catch {
      // ignore quota / private
    }
  },

  clearBootstrap: () => {
    set({ data: null, fetchedAt: 0 });
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },

  getValid: () => {
    const { data, fetchedAt } = get();
    if (!data) return null;
    if (Date.now() - fetchedAt > TTL_MS) return null;
    return data;
  },

  rehydrateFromStorage: () => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { data: BootstrapData; fetchedAt: number };
      if (!parsed.data || Date.now() - (parsed.fetchedAt ?? 0) > STORAGE_TTL_MS) return false;
      set({ data: parsed.data, fetchedAt: parsed.fetchedAt, loading: false });
      return true;
    } catch {
      return false;
    }
  },
}));
