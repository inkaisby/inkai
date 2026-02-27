"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import JarvisLoader from "@/components/JarvisLoader";

interface UserRow {
  id: string;
  email: string;
  nama: string | null;
  cabang: string | null;
  app_role: string | null;
}

interface EmailListProps {
  sessionEmail: string | null;
  selectedEmail: string | null;
  onSelectEmail: (email: string) => void;
}

export default function EmailList({
  sessionEmail,
  selectedEmail,
  onSelectEmail,
}: EmailListProps) {

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ===============================
   * LOAD USERS (DIRECT FROM PROFILES)
   * =============================== */
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, email, nama, cabang, app_role")
          .order("email");

        if (error) throw error;
        if (mounted) setUsers(data ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  /* Auto-select akun login saat pertama load */
  useEffect(() => {
    if (!selectedEmail && sessionEmail) {
      onSelectEmail(sessionEmail);
    }
  }, [sessionEmail, selectedEmail, onSelectEmail]);

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.nama ?? "").toLowerCase().includes(q) ||
        (u.cabang ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const handleSelect = useCallback(
    (email: string) => {
      if (email === selectedEmail) return;
      onSelectEmail(email);
    },
    [onSelectEmail, selectedEmail],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[160px]">
        <JarvisLoader label="Memuat daftar pengguna…" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Cari email, nama, atau cabang…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-white/10 outline-none focus:border-blue-500"
      />

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="p-3 text-left w-12">No</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Nama</th>
              <th className="p-3 text-left">Cabang</th>
              <th className="p-3 text-center w-24">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u, i) => {
              const active = u.email === selectedEmail;
              const isSelf = u.email === sessionEmail;

              return (
                <tr
                  key={u.id}
                  className={[
                    "border-t border-white/10 cursor-pointer",
                    active ? "bg-blue-500/10" : "hover:bg-white/5",
                  ].join(" ")}
                  onClick={() => handleSelect(u.email)}
                >
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3 font-mono">
                    {u.email}
                    {isSelf && (
                      <span className="ml-2 text-xs text-yellow-400">
                        (Anda)
                      </span>
                    )}
                  </td>
                  <td className="p-3">{u.nama ?? "-"}</td>
                  <td className="p-3">{u.cabang ?? "-"}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(u.email);
                      }}
                      disabled={active}
                      className={[
                        "px-3 py-1 text-xs rounded",
                        active
                          ? "bg-blue-600 opacity-80 cursor-default"
                          : "bg-blue-600/70 hover:bg-blue-600",
                      ].join(" ")}
                    >
                      {active ? "Aktif" : "Atur"}
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-white/50">
                  Pengguna tidak ditemukan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
