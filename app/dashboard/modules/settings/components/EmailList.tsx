"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import JarvisLoader from "@/components/JarvisLoader";
import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";

/* ===============================
 * TYPES (1:1 dengan SQL)
 * =============================== */
export interface UserRow {
  id: string;
  user_id: string;
  email: string;
  nama: string | null;
  cabang: string | null;
  nik: string | null;
  telepon: string | null;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan_ortu: string | null;
  alamat: string | null;
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
  onSelectUser: (user: UserRow | null) => void;
}

const PAGE_SIZE = 6;
const ROOT_EMAIL = "karateinkaisby@gmail.com";

function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).replace(/\./g, "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

function apiRowToUserRow(r: Record<string, unknown>): UserRow {
  return {
    id: String(r.id ?? ""),
    user_id: String(r.user_id ?? r.id ?? ""),
    email: String(r.email ?? ""),
    nama: (r.nama as string) ?? null,
    cabang: (r.cabang as string) ?? null,
    nik: (r.nik as string) ?? null,
    telepon: (r.telepon as string) ?? null,
    jenis_kelamin: (r.jenis_kelamin as string) ?? null,
    tanggal_lahir: (r.tanggal_lahir as string) ?? null,
    nama_ayah: (r.nama_ayah as string) ?? null,
    nama_ibu: (r.nama_ibu as string) ?? null,
    pekerjaan_ortu: (r.pekerjaan_ortu as string) ?? null,
    alamat: (r.alamat as string) ?? null,
    app_role: (r.app_role as string) ?? null,
    structural_level: (r.structural_level as number) ?? null,
    structural_role: (r.structural_role as string) ?? null,
    email_allowed: Boolean(r.email_allowed),
    profile_completed: Boolean(r.profile_completed),
    status: (r.status as string) ?? null,
    province_id: toNumOrNull(r.province_id),
    regency_id: toNumOrNull(r.regency_id),
    district_id: toNumOrNull(r.district_id),
    village_id: r.village_id != null ? String(r.village_id).replace(/\./g, "").trim() || null : null,
    ranting_id: (r.ranting_id as string) ?? null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export default function EmailList({
  sessionEmail,
  selectedUser,
  onSelectUser,
}: EmailListProps) {
  const { selectedContext } = useScope();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Status terakhir API /api/users untuk cek DB saat daftar kosong */
  const [apiStatus, setApiStatus] = useState<{
    status: number;
    count: number;
    ok: boolean;
    message?: string;
  } | null>(null);

  const contextRantingId =
    selectedContext &&
    selectedContext !== "all" &&
    !selectedContext.startsWith("cabang:")
      ? selectedContext
      : undefined;

  /* ===============================
   * LOAD USERS (API dengan scope + konteks)
   * =============================== */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const url = contextRantingId
          ? `/api/users?context_ranting_id=${encodeURIComponent(contextRantingId)}`
          : "/api/users";
        const res = await fetch(url, { credentials: "include" });
        const data = (await res.json()) as Record<string, unknown>[] | { message?: string };
        const list = Array.isArray(data) ? data : [];
        const errMsg = !Array.isArray(data) && data?.message ? String(data.message) : undefined;
        if (mounted) {
          setApiStatus({
            status: res.status,
            count: list.length,
            ok: res.ok,
            ...(errMsg && { message: errMsg }),
          });
          setUsers(list.map((r) => apiRowToUserRow(r as Record<string, unknown>)));
        }
        if (!res.ok) return;
      } catch {
        if (mounted) {
          setApiStatus({ status: 0, count: 0, ok: false });
          setUsers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [contextRantingId]);

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
        (u.nama ?? "").toLowerCase().includes(q) ||
        (u.cabang ?? "").toLowerCase().includes(q),
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
                      {u.cabang ?? "-"}
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
                        disabled={
                          u.email === ROOT_EMAIL || u.email === sessionEmail
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            u.email === ROOT_EMAIL ||
                            u.email === sessionEmail
                          )
                            return;
                          setUserToDelete(u);
                        }}
                        className="px-3 py-1 text-xs rounded bg-red-600/70 hover:bg-red-500/70 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-4 text-center text-white/50 space-y-2">
            <p>Tidak ada data</p>
            {apiStatus && (
              <div className="text-xs text-white/40 bg-white/5 rounded px-3 py-2 text-left font-mono">
                <p>Cek DB / API:</p>
                <p>Status: {apiStatus.status} {apiStatus.status === 403 ? "(Forbidden — pastikan profiles.app_role = SUPERADMIN)" : apiStatus.status === 401 ? "(Unauthorized — login ulang)" : apiStatus.status === 500 ? "(Server error)" : apiStatus.status === 0 ? "(Network/error)" : ""}</p>
                {apiStatus.message && <p>Pesan: {apiStatus.message}</p>}
                <p>Jumlah dari API: {apiStatus.count} pengguna</p>
              </div>
            )}
            <p className="text-xs text-white/40">
              Pastikan login sebagai Superadmin. Jika daftar kosong, bisa karena belum ada pengguna terdaftar atau API /api/users tidak mengembalikan data.
            </p>
          </div>
        )}
      </div>

      {/* PAGINATION INFO */}
      <div className="text-xs text-white/40 text-right">
        Halaman {page} / {totalPages}
      </div>

      {/* Modal konfirmasi hapus */}
      {userToDelete && (
        <div className="fixed inset-0 z-[200000] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-t-xl sm:rounded-xl p-5 bg-zinc-900 border border-zinc-600 shadow-xl">
            <h3 className="text-white font-medium mb-2">Hapus pengguna</h3>
            <p className="text-sm text-white/70 mb-4">
              Yakin menghapus {userToDelete.email}
              {userToDelete.nama ? ` (${userToDelete.nama})` : ""}?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
                className="min-h-[44px] px-4 py-2 rounded-lg text-white/70 hover:text-white disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!userToDelete) return;
                  setDeleting(true);
                  try {
                    const res = await fetch(
                      `/api/users/${encodeURIComponent(userToDelete.user_id)}`,
                      { method: "DELETE", credentials: "include" }
                    );
                    if (res.ok) {
                      setUsers((prev) =>
                        prev.filter((x) => x.user_id !== userToDelete.user_id)
                      );
                      if (selectedUser?.user_id === userToDelete.user_id) {
                        onSelectUser(null);
                      }
                      setUserToDelete(null);
                    } else {
                      const data = await res.json().catch(() => ({}));
                      alert(data?.message ?? "Gagal menghapus pengguna.");
                    }
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
              >
                {deleting ? "Menghapus…" : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
