import type { SupabaseClient } from "@supabase/supabase-js";

export type UserScope = {
  is_pp: boolean;
  provinsi_ids: string[];
  cabang_ids: string[];
  ranting_ids: string[];
};

type StructuralRow = {
  structural_level: number;
  active: boolean;
  ranting_id: string | null;
  cabang_id: string | null;
  provinsi_id: string | null;
};

/**
 * Menghitung scope visibilitas user dari structural roles + organisasi.
 * PP (level 5) → lihat semua. Pengprov → provinsi + turunan. Ketua Cabang → cabang + ranting. Ketua Ranting → ranting.
 */
export async function getUserScope(
  admin: SupabaseClient,
  userId: string
): Promise<UserScope> {
  const { data: structural } = await admin.rpc("get_user_structural_roles", {
    p_user_id: userId,
  });

  const rows = (structural ?? []) as StructuralRow[];
  const active = rows.filter((r) => r.active);

  const is_pp = active.some((r) => r.structural_level >= 5);
  if (is_pp) {
    return {
      is_pp: true,
      provinsi_ids: [],
      cabang_ids: [],
      ranting_ids: [],
    };
  }

  const provinsi_ids = [...new Set(active.map((r) => r.provinsi_id).filter(Boolean) as string[])];
  const cabang_ids_direct = [...new Set(active.map((r) => r.cabang_id).filter(Boolean) as string[])];
  const ranting_ids_direct = [...new Set(active.map((r) => r.ranting_id).filter(Boolean) as string[])];

  let cabang_ids = [...cabang_ids_direct];
  if (provinsi_ids.length > 0) {
    const { data: cabangUnderProvinsi } = await admin
      .from("cabang")
      .select("id")
      .in("provinsi_id", provinsi_ids);
    const fromProvinsi = (cabangUnderProvinsi ?? []).map((c: { id: string }) => c.id);
    cabang_ids = [...new Set([...cabang_ids, ...fromProvinsi])];
  }

  let ranting_ids = [...ranting_ids_direct];
  if (cabang_ids.length > 0) {
    const { data: rantingUnderCabang } = await admin
      .from("ranting")
      .select("id")
      .in("cabang_id", cabang_ids);
    const fromCabang = (rantingUnderCabang ?? []).map((r: { id: string }) => r.id);
    ranting_ids = [...new Set([...ranting_ids, ...fromCabang])];
  }

  return {
    is_pp: false,
    provinsi_ids,
    cabang_ids,
    ranting_ids,
  };
}
