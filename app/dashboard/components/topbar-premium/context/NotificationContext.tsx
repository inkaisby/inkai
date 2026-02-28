"use client";

import { createContext, useContext, useState } from "react";
import useRealtimeNotification from "../hooks/useRealtimeNotification";

type Ctx = {
  count: number;
  hasNew: boolean;
  open: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  refreshCount?: () => void;
};

const NotificationContext = createContext<Ctx | null>(null);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const realtime = useRealtimeNotification();
  const [open, setOpen] = useState(false);

  // BUKA PANEL SAJA (TIDAK MARK READ)
  const openNotifications = () => {
    setOpen(true);
  };

  const closeNotifications = () => setOpen(false);

  return (
    <NotificationContext.Provider
      value={{ ...realtime, open, openNotifications, closeNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used inside NotificationProvider");
  }
  return ctx;
}
