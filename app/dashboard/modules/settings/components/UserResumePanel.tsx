"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import type { UserRow } from "./EmailList";
import JarvisLoader from "@/components/JarvisLoader";

const LEVEL_LABELS: Record<number, string> = {
  1: "Kohai",
  2: "Ranting",
  3: "Cabang",
  4: "Pengprov",
  5: "PP",
};

function formatRoleLabel(roleName: string): string {
  const s = roleName.replace(/_/g, " ").toLowerCase();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

type UserStructuralRole = {
  id: string;
  role_name: string;
  structural_level: number;
  active: boolean;
  ranting_nama?: string | null;
  cabang_nama?: string | null;
  provinsi_nama?: string | null;
};

type UserFunctionalRole = { id: string; role_name: string; active: boolean };

type ActivityRow = {
  id: string;
  action: string;
  module: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type ClientInfo = {
  ip: string | null;
  user_agent: string | null;
  forwarded_for: string | null;
  vercel: {
    country: string | null;
    region: string | null;
    city: string | null;
    latitude: string | null;
    longitude: string | null;
  };
  provider: string | null;
};

interface Props {
  user: UserRow | null;
  /** Saat berubah (Realtime), refetch structural, functional, activity */
  refreshTrigger?: number;
}

export default function UserResumePanel({ user, refreshTrigger = 0 }: Props) {
  const [structural, setStructural] = useState<UserStructuralRole[]>([]);
  const [functional, setFunctional] = useState<UserFunctionalRole[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientInfoLoading, setClientInfoLoading] = useState(false);
  const [regencyName, setRegencyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) {
      queueMicrotask(() => {
        setStructural([]);
        setFunctional([]);
        setActivity([]);
        setLoading(false);
      });
      return;
    }

    let mounted = true;
    queueMicrotask(() => setLoading(true));

    (async () => {
      const [structRes, funcRes, logRes] = await Promise.all([
        supabase.rpc("get_user_structural_roles", { p_user_id: user.user_id }),
        supabase
          .from("user_functional_roles")
          .select("id, role_name, active")
          .eq("user_id", user.user_id),
        fetch(`/api/activity/logs?email=${encodeURIComponent(user.email)}`, {
          credentials: "include",
        }),
      ]);

      if (!mounted) return;

      setStructural((structRes.data as UserStructuralRole[]) ?? []);
      setFunctional((funcRes.data ?? []) as UserFunctionalRole[]);

      const logData = logRes.ok ? await logRes.json() : [];
      setActivity(Array.isArray(logData) ? logData.slice(0, 20) : []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user?.user_id, user?.email, refreshTrigger]);

  // Resolve nama domisili (regency) dari regency_id
  useEffect(() => {
    if (!user?.regency_id) {
      queueMicrotask(() => setRegencyName(null));
      return;
    }
    let cancelled = false;
    const rid = String(user.regency_id).replace(/\./g, "").trim();
    fetch(`/api/wilayah/name?id=${encodeURIComponent(rid)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name?: string } | null) => {
        if (!cancelled && data?.name) setRegencyName(data.name);
        else if (!cancelled) setRegencyName(null);
      })
      .catch(() => {
        if (!cancelled) setRegencyName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.regency_id]);

  // Info perangkat sesi yang sedang dipakai (IP, user-agent)
  useEffect(() => {
    if (!user?.user_id) {
      queueMicrotask(() => setClientInfo(null));
      return;
    }
    let mounted = true;
    queueMicrotask(() => setClientInfoLoading(true));
    fetch("/api/me/client-info", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ClientInfo | null) => {
        if (!mounted) return;
        setClientInfo(d);
      })
      .catch(() => {
        if (mounted) setClientInfo(null);
      })
      .finally(() => {
        if (mounted) setClientInfoLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user?.user_id]);

  if (!user) {
    return (
      <div className="text-sm text-white/50">
        Pilih pengguna untuk melihat resume.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <JarvisLoader label="Memuat resume…" />
      </div>
    );
  }

  const levelLabel =
    user.structural_level != null
      ? (LEVEL_LABELS[user.structural_level] ??
        `Level ${user.structural_level}`)
      : null;

  return (
    <div className="space-y-6">
      {/* ================= IDENTITAS ================= */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-cyan-300/90 mb-3">
          Identitas
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-white/50">Email</dt>
            <dd className="font-mono text-cyan-300">{user.email}</dd>
          </div>
          <div>
            <dt className="text-white/50">Nama</dt>
            <dd>{user.nama ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/50">App Role</dt>
            <dd>{user.app_role ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/50">Level (profil)</dt>
            <dd>{levelLabel ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/50">Jabatan (ringkasan profil)</dt>
            <dd>
              {user.structural_role
                ? formatRoleLabel(user.structural_role)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/50">Cabang (label)</dt>
            <dd>{user.cabang ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/50">Domisili</dt>
            <dd>{regencyName ?? (user.regency_id != null ? String(user.regency_id) : "—")}</dd>
          </div>
          <div>
            <dt className="text-white/50">Profil lengkap</dt>
            <dd>{user.profile_completed ? "Ya" : "Belum"}</dd>
          </div>
          <div>
            <dt className="text-white/50">Status</dt>
            <dd>{user.status ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-white/50">Terdaftar</dt>
            <dd>
              {user.created_at
                ? new Date(user.created_at).toLocaleString("id-ID")
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* ================= PERANGKAT SAAT INI ================= */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-cyan-300/90 mb-3">
          Perangkat saat ini (sesi yang sedang dipakai)
        </h3>
        {clientInfoLoading ? (
          <div className="flex justify-center py-4">
            <JarvisLoader label="Memuat info perangkat…" />
          </div>
        ) : !clientInfo ? (
          <p className="text-sm text-white/50">
            Info perangkat tidak tersedia.
          </p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-white/50">IP</dt>
              <dd className="font-mono text-white/90">
                {clientInfo.ip ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-white/50">Lokasi (Vercel)</dt>
              <dd className="text-white/80">
                {clientInfo.vercel?.city ||
                clientInfo.vercel?.region ||
                clientInfo.vercel?.country
                  ? [
                      clientInfo.vercel.city,
                      clientInfo.vercel.region,
                      clientInfo.vercel.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-white/50">User-Agent</dt>
              <dd className="font-mono text-[12px] text-white/70 break-words">
                {clientInfo.user_agent ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-white/50">Forwarded-For</dt>
              <dd className="font-mono text-[12px] text-white/60 break-words">
                {clientInfo.forwarded_for ?? "—"}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-3 text-[12px] text-white/45">
          Catatan: IP provider/ISP biasanya perlu lookup pihak ketiga, dan IP
          bisa berupa NAT/CGNAT.
        </p>
      </section>

      {/* ================= JABATAN STRUKTURAL ================= */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-cyan-300/90 mb-3">
          Jabatan organisasi (struktural)
        </h3>
        {structural.length === 0 ? (
          <p className="text-sm text-white/50">
            Belum ada jabatan. Atur di tab Role Management.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {structural.map((r) => {
              const org = r.ranting_nama ?? r.cabang_nama ?? r.provinsi_nama;
              const level =
                LEVEL_LABELS[r.structural_level] ??
                `Level ${r.structural_level}`;
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">
                    {formatRoleLabel(r.role_name)}
                  </span>
                  <span className="text-white/50">({level})</span>
                  {org && <span className="text-white/70">— {org}</span>}
                  {!r.active && (
                    <span className="text-amber-400/90 text-xs">
                      (nonaktif)
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ================= ROLE FUNGSIONAL ================= */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-cyan-300/90 mb-3">
          Role fungsional
        </h3>
        {functional.length === 0 ? (
          <p className="text-sm text-white/50">Belum ada role fungsional.</p>
        ) : (
          <ul className="flex flex-wrap gap-2 text-sm">
            {functional.map((f) => (
              <li key={f.id}>
                <span className={f.active ? "text-white/90" : "text-white/50"}>
                  {formatRoleLabel(f.role_name)}
                  {!f.active && " (nonaktif)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================= AKTIVITAS TERAKHIR ================= */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h3 className="text-sm font-semibold text-cyan-300/90 mb-3">
          Aktivitas terakhir (20 terbaru)
        </h3>
        {activity.length === 0 ? (
          <p className="text-sm text-white/50">Belum ada aktivitas tercatat.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="pb-2 pr-3 w-40">Waktu</th>
                  <th className="pb-2 pr-3">Aksi</th>
                  <th className="pb-2 pr-3">Modul</th>
                  <th className="pb-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td className="py-2 pr-3 font-mono text-xs text-white/70">
                      {new Date(a.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 pr-3">{a.action}</td>
                    <td className="py-2 pr-3">{a.module ?? "—"}</td>
                    <td
                      className="py-2 text-xs text-white/60 max-w-[200px] truncate"
                      title={a.detail ? JSON.stringify(a.detail) : undefined}
                    >
                      {a.detail && typeof a.detail === "object"
                        ? Object.entries(a.detail)
                            .map(
                              ([k, v]) => `${k}: ${v == null ? "" : String(v)}`,
                            )
                            .join(" · ") || "—"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
