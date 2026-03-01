"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

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
}

export default function RoleManagementPanel({ userId }: Props) {
  const [loading, setLoading] = useState(true);
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
  }, [load]);

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
    setSelectedRole("");
    setSelectedOrgId("");
    location.reload();
  };

  /* ================= TOGGLE ACTIVE ================= */
  const toggleStructural = async (id: string, active: boolean) => {
    await supabase
      .from("user_structural_roles")
      .update({ active: !active })
      .eq("id", id);

    setUserStructural((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !active } : r)),
    );
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
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedOrgId("");
              }}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded min-w-[220px]"
            >
              <option value="">— Pilih jabatan —</option>
              {sortedLevels.map((L) => (
                <optgroup key={L} label={`${LEVEL_LABELS[L] ?? `Level ${L}`}`}>
                  {(rolesByLevel[L] ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRoleLabel(r.role_name)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {structuralMaster.length === 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-amber-400/90">Belum ada jabatan. Isi jabatan default hirarki INKAI sekali pakai:</p>
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
          </div>

          {needOrg && (
            <div>
              <label className="block text-xs text-white/50 mb-1">
                {orgLabel}
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="px-3 py-2 bg-black/40 border border-white/10 rounded min-w-[180px]"
              >
                <option value="">— Pilih {orgLabel} —</option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
                <select
                  value={manualOrgId}
                  onChange={(e) => setManualOrgId(e.target.value)}
                  className="px-3 py-2 bg-black/40 border border-white/10 rounded min-w-[180px]"
                >
                  <option value="">— Pilih {manualOrgLabel} —</option>
                  {manualOrgOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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

                <button
                  onClick={() => toggleStructural(r.id, r.active)}
                  className={`px-3 py-1 text-xs rounded ${
                    r.active ? "bg-emerald-600/70" : "bg-red-600/70"
                  }`}
                >
                  {r.active ? "Aktif" : "Nonaktif"}
                </button>
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
