"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import { SearchableSelect } from "@/components/ui/searchable-select";

type StructuralRoleMaster = {
  id: string;
  role_name: string;
  structural_level: number;
  organization_type: string;
};

type UserStructuralRole = {
  id: string;
  role_name: string;
  structural_level: number;
  organization_type: string;
  active: boolean;
  ranting_id?: string | null;
  cabang_id?: string | null;
  provinsi_id?: string | null;
  ranting_nama?: string | null;
  cabang_nama?: string | null;
  provinsi_nama?: string | null;
};

type UserFunctionalRole = {
  id: string;
  role_name: string;
  active: boolean;
};

type OrgOption = { value: string; label: string };

/** Label level sesuai hirarki INKAI: Kohai → Ranting → Cabang → Pengprov → PP */
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

interface Props {
  userId: string;
  /** Email user (untuk log aktivitas saat role ditambah) */
  userEmail?: string | null;
  /** Domisili user (regency_id) dari Profil — untuk hint saat pilih Cabang */
  userRegencyId?: string | null;
  /** Saat berubah (Realtime), refetch data role */
  refreshTrigger?: number;
}

export default function RoleManagementPanel({ userId, userEmail, userRegencyId, refreshTrigger = 0 }: Props) {
  const [loading, setLoading] = useState(true);
  const [userRegencyName, setUserRegencyName] = useState<string | null>(null);
  const [structuralMaster, setStructuralMaster] = useState<
    StructuralRoleMaster[]
  >([]);
  const [userStructural, setUserStructural] = useState<UserStructuralRole[]>(
    [],
  );
  const [userFunctional, setUserFunctional] = useState<UserFunctionalRole[]>(
    [],
  );
  const [provinsiList, setProvinsiList] = useState<OrgOption[]>([]);
  const [cabangList, setCabangList] = useState<OrgOption[]>([]);
  const [rantingList, setRantingList] = useState<OrgOption[]>([]);

  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [provinsiSeedLoading, setProvinsiSeedLoading] = useState(false);
  const [cabangSeedLoading, setCabangSeedLoading] = useState(false);
  /* Isi manual: level 1-5, nama jabatan, org (jika level 2-4) */
  const [manualLevel, setManualLevel] = useState<number>(1);
  const [manualRoleName, setManualRoleName] = useState("");
  const [manualOrgId, setManualOrgId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const selectedRoleMeta = structuralMaster.find((r) => r.id === selectedRole);
  const level = selectedRoleMeta?.structural_level ?? 0;
  const needOrg = level >= 1 && level <= 4;
  const orgLabel =
    level <= 2 ? "Ranting" : level === 3 ? "Cabang" : "Provinsi (Pengprov)";
  const orgOptions =
    level <= 2 ? rantingList : level === 3 ? cabangList : provinsiList;

  const manualNeedOrg = manualLevel >= 2 && manualLevel <= 4;
  const manualOrgLabel =
    manualLevel <= 2 ? "Ranting" : manualLevel === 3 ? "Cabang" : "Provinsi (Pengprov)";
  const manualOrgOptions =
    manualLevel <= 2 ? rantingList : manualLevel === 3 ? cabangList : provinsiList;

  /** Kelompokkan role per level untuk dropdown (Kohai, Ranting, Cabang, Pengprov, PP) */
  const rolesByLevel = structuralMaster.reduce(
    (acc, r) => {
      const L = r.structural_level;
      if (!acc[L]) acc[L] = [];
      acc[L].push(r);
      return acc;
    },
    {} as Record<number, StructuralRoleMaster[]>,
  );
  const sortedLevels = [1, 2, 3, 4, 5].filter((L) => rolesByLevel[L]?.length);

  /** Opsi jabatan flat untuk SearchableSelect (dengan label level) */
  const jobOptions = useMemo(
    () =>
      sortedLevels.flatMap((L) =>
        (rolesByLevel[L] ?? []).map((r) => ({
          value: r.id,
          label: `${LEVEL_LABELS[L] ?? `Level ${L}`} — ${formatRoleLabel(r.role_name)}`,
        }))
      ),
    [sortedLevels, rolesByLevel]
  );

  /* ================= LOAD DATA ================= */
  const load = useCallback(async () => {
    setLoading(true);
    const [masterRes, structuralRes, functionalRes, provRes, cabRes, rantRes] =
      await Promise.all([
        supabase
          .from("structural_role_master")
          .select("*")
          .order("structural_level", { ascending: true }),
        supabase.rpc("get_user_structural_roles", { p_user_id: userId }),
        supabase
          .from("user_functional_roles")
          .select("*")
          .eq("user_id", userId),
        fetch("/api/provinsi", { credentials: "include" }).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch("/api/cabang", { credentials: "include" }).then((r) =>
          r.ok ? r.json() : []
        ),
        fetch("/api/ranting", { credentials: "include" }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]);

    setStructuralMaster(masterRes.data ?? []);
    setUserStructural((structuralRes.data as UserStructuralRole[]) ?? []);
    setUserFunctional(functionalRes.data ?? []);

    setProvinsiList(
      (Array.isArray(provRes) ? provRes : []).map((p: { id: string; nama: string }) => ({
        value: p.id,
        label: p.nama,
      }))
    );
    setCabangList(
      (Array.isArray(cabRes) ? cabRes : []).map((c: { id: string; nama: string }) => ({
        value: c.id,
        label: c.nama,
      }))
    );
    setRantingList(
      (Array.isArray(rantRes) ? rantRes : []).map((r: { id: string; nama: string }) => ({
        value: r.id,
        label: r.nama,
      }))
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  /* Resolve nama kabupaten/kota dari domisili user (untuk hint saat pilih Cabang) */
  useEffect(() => {
    if (!userRegencyId?.trim()) {
      setUserRegencyName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/wilayah/name?id=${encodeURIComponent(userRegencyId.trim())}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name?: string } | null) => {
        if (!cancelled && data?.name) setUserRegencyName(data.name);
        else if (!cancelled) setUserRegencyName(null);
      })
      .catch(() => {
        if (!cancelled) setUserRegencyName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userRegencyId]);

  /* ================= TAMBAH JABATAN MANUAL ================= */
  const addManualStructuralRole = async () => {
    const name = manualRoleName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!name) {
      alert("Isi nama jabatan (mis. KETUA_RANTING atau Ketua Ranting)");
      return;
    }
    if (manualNeedOrg && !manualOrgId) {
      alert(`Pilih ${manualOrgLabel} untuk jabatan ini`);
      return;
    }
    setManualLoading(true);
    try {
      const res = await fetch("/api/settings/ensure-structural-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role_name: name,
          structural_level: manualLevel,
        }),
      });
      const data = (await res.json()) as { id?: string; message?: string };
      if (!res.ok) {
        alert(data.message ?? "Gagal membuat jabatan");
        return;
      }
      if (!data.id) {
        alert("Gagal: id jabatan tidak dikembalikan");
        return;
      }
      const p_ranting_id = manualLevel <= 2 ? manualOrgId || null : null;
      const p_cabang_id = manualLevel === 3 ? manualOrgId || null : null;
      const p_provinsi_id = manualLevel === 4 ? manualOrgId || null : null;
      const { error } = await supabase.rpc("add_user_structural_role", {
        p_user_id: userId,
        p_role_id: data.id,
        p_ranting_id: p_ranting_id || undefined,
        p_cabang_id: p_cabang_id || undefined,
        p_provinsi_id: p_provinsi_id || undefined,
      });
      if (error) {
        alert(error.message ?? "Gagal menambah jabatan ke user");
        return;
      }
      if (userEmail?.trim()) {
        try {
          await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: userEmail.trim(),
              action: "role_added_manual",
              module: "settings",
              detail: {
                role_name: name,
                structural_level: manualLevel,
                org_id: manualNeedOrg ? manualOrgId : null,
              },
            }),
          });
        } catch {
          // ignore
        }
      }
      setManualRoleName("");
      setManualOrgId("");
      await load();
    } finally {
      setManualLoading(false);
    }
  };

  /* ================= SEED JABATAN DEFAULT ================= */
  const seedDefaultRoles = async () => {
    setSeedLoading(true);
    try {
      const res = await fetch("/api/settings/seed-structural-roles", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; inserted?: number };
      if (!res.ok) {
        alert(data.message ?? "Gagal mengisi jabatan default");
        return;
      }
      await load();
    } finally {
      setSeedLoading(false);
    }
  };

  /* ================= SEED PROVINSI DEFAULT ================= */
  const seedProvinsiDefault = async () => {
    setProvinsiSeedLoading(true);
    try {
      const res = await fetch("/api/admin/seed-provinsi", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; inserted?: number };
      if (!res.ok) {
        alert(data.message ?? "Gagal mengisi provinsi default");
        return;
      }
      await load();
      alert(data.message ?? (data.inserted ? `Provinsi default ditambahkan: ${data.inserted}.` : "Selesai."));
    } finally {
      setProvinsiSeedLoading(false);
    }
  };

  /* ================= SEED CABANG DARI WILAYAH ================= */
  const seedCabangFromWilayah = async () => {
    setCabangSeedLoading(true);
    try {
      const res = await fetch("/api/admin/seed-cabang-wilayah", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { message?: string; cabangCreated?: number; cabangUpdated?: number };
      if (!res.ok) {
        alert(data.message ?? "Gagal mengisi cabang dari wilayah");
        return;
      }
      await load();
      alert(
        data.cabangCreated != null || data.cabangUpdated != null
          ? `Cabang dari wilayah berhasil. Dibuat: ${data.cabangCreated ?? 0}, Diupdate: ${data.cabangUpdated ?? 0}.`
          : "Cabang dari wilayah selesai."
      );
    } finally {
      setCabangSeedLoading(false);
    }
  };

  /* ================= ADD STRUCTURAL ROLE ================= */
  const addStructuralRole = async () => {
    if (!selectedRole) return;
    if (needOrg && !selectedOrgId) {
      alert(`Pilih ${orgLabel} untuk jabatan ini`);
      return;
    }

    const p_ranting_id = level <= 2 ? selectedOrgId || null : null;
    const p_cabang_id = level === 3 ? selectedOrgId || null : null;
    const p_provinsi_id = level === 4 ? selectedOrgId || null : null;

    const { error } = await supabase.rpc("add_user_structural_role", {
      p_user_id: userId,
      p_role_id: selectedRole,
      p_ranting_id: p_ranting_id || undefined,
      p_cabang_id: p_cabang_id || undefined,
      p_provinsi_id: p_provinsi_id || undefined,
    });

    if (error) {
      alert(error.message ?? "Gagal menambah role");
      return;
    }
    if (userEmail?.trim()) {
      try {
        await fetch("/api/activity/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: userEmail.trim(),
            action: "role_added",
            module: "settings",
            detail: {
              role_id: selectedRole,
              role_name: selectedRoleMeta?.role_name,
              level: selectedRoleMeta?.structural_level,
              org_id: needOrg ? selectedOrgId : null,
            },
          }),
        });
      } catch {
        // ignore
      }
    }
    setSelectedRole("");
    setSelectedOrgId("");
    location.reload();
  };

  /* ================= TOGGLE ACTIVE ================= */
  const toggleStructural = async (id: string, active: boolean) => {
    const newActive = !active;
    const res = await fetch("/api/settings/structural-role", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, active: newActive }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      alert(data?.message ?? "Gagal mengubah status");
      return;
    }
    setUserStructural((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: newActive } : r)),
    );
  };

  /* ================= HAPUS JABATAN ================= */
  const deleteStructural = async (id: string) => {
    if (!confirm("Yakin hapus jabatan ini?")) return;
    const res = await fetch(
      `/api/settings/structural-role?id=${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      alert(data?.message ?? "Gagal menghapus");
      return;
    }
    setUserStructural((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return <div className="p-6 text-sm text-white/50">Memuat Role...</div>;
  }

  return (
    <div className="space-y-6">
      {/* ================= STRUCTURAL (Hirarki INKAI) ================= */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-1">Jabatan organisasi (hirarki)</h3>
        <p className="text-xs text-white/50 mb-4">Kohai → Ranting → Cabang → Pengprov → PP — set user sebagai apa di organisasi</p>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs text-white/50 mb-1">Sebagai apa (jabatan)</label>
            <SearchableSelect
              options={jobOptions}
              value={selectedRole}
              onChange={(v) => {
                setSelectedRole(v);
                setSelectedOrgId("");
              }}
              placeholder="— Pilih jabatan —"
              minWidth="min-w-[220px]"
            />
            {provinsiList.length === 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-400/90">
                  <strong>Data provinsi</strong> ada di sini: belum ada provinsi organisasi. Isi sekali pakai agar nanti &quot;Isi cabang dari wilayah&quot; bisa jalan:
                </p>
                <button
                  type="button"
                  onClick={seedProvinsiDefault}
                  disabled={provinsiSeedLoading}
                  className="px-3 py-1.5 text-sm rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-50"
                >
                  {provinsiSeedLoading ? "Mengisi…" : "Isi provinsi default"}
                </button>
              </div>
            )}
            {structuralMaster.length === 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-400/90">Belum ada jabatan. Isi jabatan default hirarki INKAI sekali pakai (setelah itu dropdown punya pilihan):</p>
                <button
                  type="button"
                  onClick={seedDefaultRoles}
                  disabled={seedLoading}
                  className="px-3 py-1.5 text-sm rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {seedLoading ? "Mengisi…" : "Isi jabatan default (hirarki INKAI)"}
                </button>
              </div>
            )}
            {cabangList.length === 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-amber-400/90">Belum ada data cabang. Isi cabang dari kabupaten/kota sekali pakai (perlu data provinsi dulu; setelah itu dropdown Pilih Cabang punya pilihan):</p>
                <button
                  type="button"
                  onClick={seedCabangFromWilayah}
                  disabled={cabangSeedLoading}
                  className="px-3 py-1.5 text-sm rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 disabled:opacity-50"
                >
                  {cabangSeedLoading ? "Mengisi…" : "Isi cabang dari wilayah"}
                </button>
              </div>
            )}
          </div>

          {needOrg && (
            <div>
              <label className="block text-xs text-white/50 mb-1">
                {orgLabel}
              </label>
              <SearchableSelect
                options={orgOptions}
                value={selectedOrgId}
                onChange={setSelectedOrgId}
                placeholder={`— Pilih ${orgLabel} —`}
                minWidth="min-w-[180px]"
              />
              {orgOptions.length === 0 && (
                <p className="text-xs text-amber-400/90 mt-1">Belum ada data. Isi tabel provinsi / cabang / ranting di DB.</p>
              )}
            </div>
          )}

          <button
            onClick={addStructuralRole}
            className="px-4 py-2 bg-emerald-600 rounded text-sm"
          >
            Tambah
          </button>
        </div>

        {/* Isi manual: set user "sebagai apa" dengan mengetik nama jabatan */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 mb-2">Atau isi manual — tentukan user ini sebagai apa:</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-white/50 mb-1">Level</label>
              <select
                value={manualLevel}
                onChange={(e) => {
                  setManualLevel(Number(e.target.value));
                  setManualOrgId("");
                }}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded"
              >
                {([1, 2, 3, 4, 5] as const).map((L) => (
                  <option key={L} value={L}>
                    {LEVEL_LABELS[L]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Nama jabatan (isi manual)</label>
              <input
                type="text"
                placeholder="mis. KETUA_RANTING atau Bendahara Khusus"
                value={manualRoleName}
                onChange={(e) => setManualRoleName(e.target.value)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded min-w-[200px]"
              />
            </div>
            {manualNeedOrg && (
              <div>
                <label className="block text-xs text-white/50 mb-1">{manualOrgLabel}</label>
                <SearchableSelect
                  options={manualOrgOptions}
                  value={manualOrgId}
                  onChange={setManualOrgId}
                  placeholder={`— Pilih ${manualOrgLabel} —`}
                  minWidth="min-w-[180px]"
                />
                {manualLevel === 3 && cabangList.length === 0 && (
                  <p className="text-xs text-amber-400/90 mt-1">
                    Belum ada data cabang. Gunakan tombol &quot;Isi cabang dari wilayah&quot; di atas (sekali pakai), atau pastikan login sebagai Superadmin.
                  </p>
                )}
                {manualLevel === 3 && (userRegencyName || userRegencyId) && (
                  <p className="text-xs text-cyan-300/90 mt-1">
                    Domisili user: {userRegencyName ?? userRegencyId}. Pilih cabang yang sesuai.
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={addManualStructuralRole}
              disabled={manualLoading}
              className="px-4 py-2 bg-cyan-600/80 hover:bg-cyan-600 rounded text-sm disabled:opacity-50"
            >
              {manualLoading ? "Memproses…" : "Tambah (manual)"}
            </button>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {userStructural.map((r) => {
            const orgName =
              r.ranting_nama ?? r.cabang_nama ?? r.provinsi_nama ?? null;
            const levelLabel = LEVEL_LABELS[r.structural_level] ?? `L${r.structural_level}`;
            return (
              <div
                key={r.id}
                className="flex justify-between items-center p-3 bg-black/40 rounded"
              >
                <div>
                  <span className="font-medium">{formatRoleLabel(r.role_name)}</span>
                  <span className="text-white/50 ml-2">— {levelLabel}</span>
                  {orgName && (
                    <span className="text-white/60 ml-2">({orgName})</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStructural(r.id, r.active)}
                    className={`px-3 py-1 text-xs rounded ${
                      r.active ? "bg-emerald-600/70" : "bg-red-600/70"
                    }`}
                  >
                    {r.active ? "Aktif" : "Nonaktif"}
                  </button>
                  <button
                    onClick={() => deleteStructural(r.id)}
                    className="px-3 py-1 text-xs rounded bg-red-900/50 text-red-300 hover:bg-red-800/60 border border-red-600/40"
                    title="Hapus jabatan"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= FUNCTIONAL ================= */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Role Fungsional</h3>

        <div className="space-y-2">
          {userFunctional.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center p-3 bg-black/40 rounded"
            >
              <div>{r.role_name}</div>

              <span
                className={`px-3 py-1 text-xs rounded ${
                  r.active ? "bg-emerald-600/70" : "bg-red-600/70"
                }`}
              >
                {r.active ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
