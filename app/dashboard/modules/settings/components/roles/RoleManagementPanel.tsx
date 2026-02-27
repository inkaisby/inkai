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
};

type UserFunctionalRole = {
  id: string;
  role_name: string;
  active: boolean;
};

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

  const [selectedRole, setSelectedRole] = useState<string>("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: master } = await supabase
        .from("structural_role_master")
        .select("*")
        .order("structural_level", { ascending: true });

      const { data: structural } = await supabase.rpc(
        "get_user_structural_roles",
        { p_user_id: userId },
      );

      const { data: functional } = await supabase
        .from("user_functional_roles")
        .select("*")
        .eq("user_id", userId);

      setStructuralMaster(master ?? []);
      setUserStructural(structural ?? []);
      setUserFunctional(functional ?? []);
      setLoading(false);
    };

    load();
  }, [userId]);

  /* ================= ADD STRUCTURAL ROLE ================= */
  const addStructuralRole = async () => {
    if (!selectedRole) return;

    await supabase.rpc("add_user_structural_role", {
      p_user_id: userId,
      p_role_id: selectedRole,
    });

    setSelectedRole("");
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

        <div className="flex gap-3 mb-4">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded"
          >
            <option value="">Pilih Role</option>
            {structuralMaster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_name} (L{r.structural_level})
              </option>
            ))}
          </select>

          <button
            onClick={addStructuralRole}
            className="px-4 py-2 bg-emerald-600 rounded text-sm"
          >
            Tambah
          </button>
        </div>

        <div className="space-y-2">
          {userStructural.map((r) => (
            <div
              key={r.id}
              className="flex justify-between items-center p-3 bg-black/40 rounded"
            >
              <div>
                {r.role_name} — L{r.structural_level}
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
          ))}
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
