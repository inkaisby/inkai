"use client";

import { create } from "zustand";

interface ProfileModalState {
  isOpen: boolean;
  /** Saat true: modal dipaksa terbuka (profil belum lengkap), user tidak boleh tutup sampai lengkap */
  requireComplete: boolean;
  open: () => void;
  openForced: () => void;
  close: () => void;
  toggle: () => void;
}

const useProfileModal = create<ProfileModalState>((set) => ({
  isOpen: false,
  requireComplete: false,

  open: () => set({ isOpen: true, requireComplete: false }),
  openForced: () => set({ isOpen: true, requireComplete: true }),
  close: () => set({ isOpen: false, requireComplete: false }),
  toggle: () =>
    set((state) => ({
      isOpen: !state.isOpen,
      requireComplete: state.isOpen ? state.requireComplete : false,
    })),
}));

export default useProfileModal;
