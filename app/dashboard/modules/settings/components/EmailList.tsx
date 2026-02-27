"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import JarvisLoader from "@/components/JarvisLoader";

/* ===============================
 * TYPES (1:1 dengan SQL)
 * =============================== */
export interface UserRow {
  id: string;
  user_id: string;
  email: string;
  nama: string | null;
  nik: string | null;
  telepon: string | null;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan_ortu: string | null;
  app_role: string | null;
  structural_level: number | null;
  structural_role: string | null;
  email_allowed: boolean;
  profile_completed: boolean;
  status: string | null;
  province_id: number | null;
  regency_id: number | null;
  district_id: number | null;
  village_id: string | null;
  ranting_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailListProps {
  sessionEmail: string | null;
  selectedUser: UserRow | null;
  onSelectUser: (user: UserRow) => void;
}

const PAGE_SIZE = 6;
const ROOT_EMAIL = "karateinkaisby@gmail.com";

const resolveCabang = (
  provinceId?: number | null,
  regencyId?: number | null,
) => {
  if (provinceId === 35 && regencyId === 3578) return "Jawa Timur – Surabaya";
  if (provinceId === 35) return "Jawa Timur";
  return "-";
};

export default function EmailList({
  sessionEmail,
  selectedUser,
  onSelectUser,
}: EmailListProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* ===============================
   * LOAD USERS (RPC)
   * =============================== */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("get_users_with_profile");
        if (error) throw error;
        if (mounted) setUsers(data ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  /* AUTO SELECT LOGIN USER */
  useEffect(() => {
    if (!selectedUser && sessionEmail && users.length) {
      const self = users.find((u) => u.email === sessionEmail);
      if (self) onSelectUser(self);
    }
  }, [sessionEmail, selectedUser, users, onSelectUser]);

  /* SEARCH */
  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.nama ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  useEffect(() => setPage(1), [search]);

  /* PAGINATION */
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  const handleSelect = useCallback(
    (user: UserRow) => {
      if (user.email === selectedUser?.email) return;
      onSelectUser(user);
    },
    [onSelectUser, selectedUser],
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
        placeholder="Cari email atau nama…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded bg-white/5 border border-white/10"
      />

      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-white/5 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12">No</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Nama</th>
                <th className="p-3 text-left">Cabang</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Role</th>
                <th className="p-3 text-center">Level</th>
                <th className="p-3 text-center">Allowed</th>
                <th className="p-3 text-center w-24">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {pagedUsers.map((u, i) => {
                const active = u.email === selectedUser?.email;
                const isSelf = u.email === sessionEmail;
                const no = (page - 1) * PAGE_SIZE + i + 1;

                return (
                  <tr
                    key={u.id}
                    className={`border-t border-white/10 ${
                      active ? "bg-blue-500/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => handleSelect(u)}
                  >
                    <td className="p-3">{no}</td>
                    <td className="p-3 font-mono">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-yellow-400">
                          (Anda)
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {u.nama ?? "-"}
                      {!u.profile_completed && (
                        <span className="ml-2 text-xs text-red-400">
                          (Belum Lengkap)
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {resolveCabang(u.province_id, u.regency_id)}
                    </td>

                    <td className="p-3 text-center">
                      {u.profile_completed ? "Lengkap" : "Belum"}
                    </td>

                    <td className="p-3 text-center">{u.app_role ?? "-"}</td>

                    <td className="p-3 text-center">
                      {u.structural_level ? `L${u.structural_level}` : "-"}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        disabled={
                          u.email === ROOT_EMAIL || u.email === sessionEmail
                        }
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (u.email === ROOT_EMAIL) return;

                          const newValue = !u.email_allowed;

                          const { error } = await supabase
                            .from("profiles")
                            .update({ email_allowed: newValue })
                            .eq("user_id", u.user_id);

                          if (error) return;

                          setUsers((prev) =>
                            prev.map((x) =>
                              x.user_id === u.user_id
                                ? { ...x, email_allowed: newValue }
                                : x,
                            ),
                          );
                        }}
                        className={`px-3 py-1 text-xs rounded ${
                          u.email === ROOT_EMAIL
                            ? "bg-yellow-600/70 cursor-not-allowed"
                            : u.email_allowed
                              ? "bg-emerald-600/70"
                              : "bg-red-600/70"
                        }`}
                      >
                        {u.email === ROOT_EMAIL
                          ? "ROOT"
                          : u.email_allowed
                            ? "Allowed"
                            : "Blocked"}
                      </button>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        disabled={active}
                        onClick={async (e) => {
                          e.stopPropagation();

                          await supabase
                            .from("profiles")
                            .update({ profile_completed: false })
                            .eq("user_id", u.user_id);

                          setUsers((prev) =>
                            prev.map((x) =>
                              x.user_id === u.user_id
                                ? { ...x, profile_completed: false }
                                : x,
                            ),
                          );
                        }}
                        className="px-3 py-1 text-xs rounded bg-blue-600/70 disabled:opacity-50"
                      >
                        {active ? "Aktif" : "Atur"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-4 text-center text-white/50">Tidak ada data</div>
        )}
      </div>

      {/* PAGINATION INFO */}
      <div className="text-xs text-white/40 text-right">
        Halaman {page} / {totalPages}
      </div>
    </div>
  );
}
