export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

type ProfileRow = {
  id: string;
  user_id?: string;
  ranting_id?: string | null;
  nama?: string | null;
  email?: string | null;
  [key: string]: unknown;
};

/**
 * GET: Daftar user (gabungan auth + profiles).
 * - Superadmin / PP: semua user.
 * - Lain (dengan scope): hanya user yang profile.ranting_id ada di scope.ranting_ids.
 * - Query ?context_ranting_id=uuid: persempit ke satu ranting (jika uuid dalam scope).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const gate = await requireSuperadmin(user);
    const isSuperadmin = gate.ok;

    const supabaseAdmin = createSupabaseAdminClient();

    // ===============================
    // 1️⃣ Ambil PROFILES (dengan user_id, ranting_id untuk scope)
    // ===============================
    const { data: profiles, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          user_id,
          ranting_id,
          nama,
          nik,
          telepon,
          jenis_kelamin,
          email,
          app_role,
          alamat,
          tanggal_lahir,
          nama_ayah,
          nama_ibu,
          pekerjaan_ortu,
          province_id,
          regency_id,
          district_id,
          village_id,
          avatar_path,
          email_allowed,
          profile_completed,
          created_at,
          updated_at,
          villages ( name )
        `)
        .order("created_at", { ascending: false });

    if (profileError) {
      console.error("[API /users] profiles error:", profileError);
      return NextResponse.json(
        { message: profileError.message },
        { status: 500 }
      );
    }

    const profileList = (profiles ?? []) as ProfileRow[];

    // ===============================
    // SCOPE + KONTEKS: filter user yang boleh dilihat
    // ===============================
    let allowedUserIds: Set<string> | null = null; // null = semua (superadmin/PP)
    if (!isSuperadmin) {
      const scope = await getUserScope(supabaseAdmin, user.id);
      if (scope.is_pp) {
        allowedUserIds = null;
      } else if (scope.ranting_ids.length === 0) {
        allowedUserIds = new Set();
      } else {
        const contextRantingId = req.nextUrl.searchParams.get("context_ranting_id");
        const rantingFilter = contextRantingId &&
          (scope.is_pp || scope.ranting_ids.includes(contextRantingId))
          ? [contextRantingId]
          : scope.ranting_ids;
        allowedUserIds = new Set(
          profileList
            .filter((p) => p.ranting_id && rantingFilter.includes(p.ranting_id))
            .map((p) => p.user_id ?? p.id)
        );
      }
    }

    // ===============================
    // 2️⃣ Ambil AUTH USERS (CARA RESMI)
    // ===============================
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("[API /users] auth error:", authError);
      return NextResponse.json(
        { message: authError.message },
        { status: 500 }
      );
    }

    const usersToShow =
      allowedUserIds === null
        ? authData.users
        : authData.users.filter((u) => allowedUserIds!.has(u.id));

    if (!isSuperadmin && allowedUserIds !== null && allowedUserIds.size === 0) {
      return NextResponse.json([]);
    }

    // ===============================
    // 3️⃣ MERGE (AUTH + PROFILES) — map by user_id untuk lookup
    // ===============================
    const profileMap = new Map(
      profileList.map((p) => [p.user_id ?? p.id, p])
    );

    const result = usersToShow.map((u) => {
      const p = profileMap.get(u.id) as ProfileRow | undefined;

      return {
        id: u.id,
        user_id: u.id,

        // IDENTITAS UTAMA
        email:
          p?.email && String(p.email).trim() !== ""
            ? p.email
            : u.email ?? "-",
        nama:
          p?.nama && String(p.nama).trim() !== ""
            ? p.nama
            : "Belum Lengkap",
        cabang:
          (Array.isArray(p?.villages)
            ? (p.villages as { name?: string }[])[0]?.name
            : (p?.villages as { name?: string } | null)?.name) ?? "-",

        // PROFILE
        nik: p?.nik ?? null,
        telepon: p?.telepon ?? null,
        jenis_kelamin: p?.jenis_kelamin ?? null,
        tanggal_lahir: p?.tanggal_lahir ?? null,
        nama_ayah: p?.nama_ayah ?? null,
        nama_ibu: p?.nama_ibu ?? null,
        pekerjaan_ortu: p?.pekerjaan_ortu ?? null,
        province_id: p?.province_id ?? null,
        regency_id: p?.regency_id ?? null,
        district_id: p?.district_id ?? null,
        village_id: p?.village_id ?? null,
        ranting_id: p?.ranting_id ?? null,

        app_role: p?.app_role ?? "USER",
        structural_level: p?.structural_level ?? null,
        structural_role: p?.structural_role ?? null,
        email_allowed: p?.email_allowed ?? false,
        profile_completed: p?.profile_completed ?? false,
        status: p ? "ACTIVE" : "INCOMPLETE",

        created_at: p?.created_at ?? u.created_at ?? null,
        updated_at: p?.updated_at ?? null,

        // LEGACY
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at ?? null,
        profile: p
          ? {
              alamat: p.alamat,
              tanggal_lahir: p.tanggal_lahir,
              nama_ayah: p.nama_ayah,
              nama_ibu: p.nama_ibu,
              province_id: p.province_id,
              regency_id: p.regency_id,
              district_id: p.district_id,
              village_id: p.village_id,
              avatar_path: p.avatar_path,
              ranting_id: p.ranting_id ?? null,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /users] fatal error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
