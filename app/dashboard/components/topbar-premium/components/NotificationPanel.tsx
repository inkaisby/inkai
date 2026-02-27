"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import { useNotification } from "../context/NotificationContext";

type EventItem = {
  id: string;
  type: string;
  title: string;
  created_at: string;
  read_at: string | null;
};

type GroupedEvents = {
  today: EventItem[];
  yesterday: EventItem[];
  older: EventItem[];
};

export default function NotificationPanel() {

  const { open, closeNotifications } = useNotification();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("events")
        .select("id, type, title, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const list = data ?? [];
      setEvents(list);
      setLoading(false);

      // MARK AS READ (SETELAH DATA DITAMPILKAN)
      await supabase
        .from("events")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
    };

    load();
  }, [open]);

  // ============================
  // GROUPING LOGIC
  // ============================
  const grouped = useMemo<GroupedEvents>(() => {
    const today = new Date();
    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startToday.getDate() - 1);

    const groups: GroupedEvents = {
      today: [],
      yesterday: [],
      older: [],
    };

    for (const e of events) {
      const d = new Date(e.created_at);
      if (d >= startToday) {
        groups.today.push(e);
      } else if (d >= startYesterday) {
        groups.yesterday.push(e);
      } else {
        groups.older.push(e);
      }
    }

    return groups;
  }, [events]);

  const renderGroup = (label: string, items: EventItem[]) => {
    if (items.length === 0) return null;

    return (
      <div>
        <div className="px-4 pt-3 pb-1 text-[11px] text-cyan-400 uppercase tracking-wide">
          {label}
        </div>

        {items.map((e) => (
          <div
            key={e.id}
            className={`px-4 py-3 text-xs border-b border-cyan-500/10
              ${e.read_at ? "opacity-60" : "bg-cyan-500/5"}
            `}
          >
            <div className="text-cyan-200">{e.title}</div>
            <div className="text-[10px] text-cyan-400">
              {new Date(e.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="
            fixed top-16 right-6 z-[99998]
            w-80 bg-black/75 backdrop-blur-md
            border border-cyan-500/30 rounded-xl
            shadow-[0_0_30px_rgba(0,255,255,0.2)]
          "
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
            <span className="text-sm text-cyan-300">Aktivitas</span>
            <button
              onClick={closeNotifications}
              className="text-xs text-cyan-400 hover:text-cyan-200"
            >
              Tutup
            </button>
          </div>

          {/* BODY */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-4 text-xs text-cyan-300 opacity-60">
                Memuat aktivitas…
              </div>
            )}

            {!loading && events.length === 0 && (
              <div className="p-4 text-xs text-cyan-200 opacity-60">
                Tidak ada aktivitas
              </div>
            )}

            {!loading && (
              <>
                {renderGroup("Hari Ini", grouped.today)}
                {renderGroup("Kemarin", grouped.yesterday)}
                {renderGroup("Sebelumnya", grouped.older)}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
