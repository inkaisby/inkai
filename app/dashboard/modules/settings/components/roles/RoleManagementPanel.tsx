"use client";

import { useEffect, useState } from "react";
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

  const selectedRoleMeta = structuralMaster.find((r) => r.id === selectedRole);
  const level = selectedRoleMeta?.structural_level ?? 0;
  const needOrg = level >= 1 && level <= 4;
  const orgLabel =
    level <= 2 ? "Ranting" : level === 3 ? "Cabang" : "Provinsi";
  const orgOptions =
    level <= 2 ? rantingList : level === 3 ? cabangList : provinsiList;

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const load = async () => {
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
    };

    load();
  }, [userId]);

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
      {/* ================= STRUCTURAL ================= */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Structural Roles</h3>

        <div className="flex flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs text-white/50 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedOrgId("");
              }}
              className="px-3 py-2 bg-black/40 border border-white/10 rounded"
            >
              <option value="">Pilih Role</option>
              {structuralMaster.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name} (L{r.structural_level})
                </option>
              ))}
            </select>
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
                <option value="">Pilih {orgLabel}</option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={addStructuralRole}
            className="px-4 py-2 bg-emerald-600 rounded text-sm"
          >
            Tambah
          </button>
        </div>

        <div className="space-y-2">
          {userStructural.map((r) => {
            const orgName =
              r.ranting_nama ?? r.cabang_nama ?? r.provinsi_nama ?? null;
            return (
              <div
                key={r.id}
                className="flex justify-between items-center p-3 bg-black/40 rounded"
              >
                <div>
                  {r.role_name} — L{r.structural_level}
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
        <h3 className="text-lg font-semibold mb-4">Functional Roles</h3>

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
