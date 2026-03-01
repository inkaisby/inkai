export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

/** Kriteria sama dengan useCompletionScore: semua field wajib terisi + avatar. */
function isProfileCompleted(row: Record<string, unknown> | null): boolean {
  if (!row) return false;
  const required = [
    "nik",
    "nama",
    "email",
    "telepon",
    "jenis_kelamin",
    "tanggal_lahir",
    "nama_ayah",
    "nama_ibu",
    "pekerjaan_ortu",
    "alamat",
    "province_id",
    "regency_id",
    "district_id",
    "village_id",
    "ranting_id",
    "avatar_path",
  ];
  for (const key of required) {
    const v = row[key];
    if (v === null || v === undefined || String(v).trim() === "") return false;
  }
  return true;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  let { data: profileRow } = await admin
    .from("profiles")
    .select(
      "id, user_id, nama, email, email_allowed, app_role, nik, telepon, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Fallback: jika trigger signup gagal, buat profil saat pertama kali /api/me
  if (!profileRow) {
    const { data: inserted } = await admin
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        email: user.email ?? "",
        nama: user.email ?? "",
        app_role: "USER",
        email_allowed: true,
      })
      .select("id, user_id, nama, email, email_allowed, app_role, nik, telepon, jenis_kelamin, tanggal_lahir, nama_ayah, nama_ibu, pekerjaan_ortu, alamat, province_id, regency_id, district_id, village_id, ranting_id, avatar_path")
      .single();
    if (inserted) profileRow = inserted;
  }

  const { data: structural } = await admin.rpc("get_user_structural_roles", {
    p_user_id: user.id,
  });

  const scope = await getUserScope(admin, user.id);

  const profile = profileRow
    ? {
        id: profileRow.id,
        user_id: profileRow.user_id,
        nama: profileRow.nama,
        email_allowed: profileRow.email_allowed,
        app_role: profileRow.app_role,
        profile_completed: isProfileCompleted(profileRow as Record<string, unknown>),
      }
    : null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile,
    structural_roles: structural ?? [],
    functional_roles: [],
    scope,
  });
}

