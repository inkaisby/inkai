export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getSessionUser } from "@/app/lib/supabase/session";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

const ALLOWED_KEYS = [
  "nama",
  "nik",
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
  "app_role",
  "structural_level",
  "structural_role",
  "email_allowed",
] as const;

/**
 * PUT: Update profil user (hanya Superadmin).
 * Body: { user_id: string, ...fields }
 *
 * Mencari baris profil dengan: (1) profiles.user_id = body.user_id, (2) profiles.id = body.user_id.
 * Jika tidak ketemu → 404 "Profil tidak ditemukan" + detail. Penyebab umum: baris profiles belum ada
 * (user belum pernah trigger signup yang buat baris), atau user_id di DB beda/ kosong.
 */
export async function PUT(req: NextRequest) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const gate = await requireSuperadmin(me);
    if (!gate.ok) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : "";
    if (!userId) {
      return NextResponse.json(
        { message: "user_id wajib" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        const v = body[key];
        if (key === "structural_level" && (v === null || v === "")) {
          payload[key] = null;
        } else if (key === "email_allowed") {
          payload[key] = Boolean(v);
        } else if (key === "province_id" || key === "regency_id" || key === "district_id") {
          payload[key] = v === null || v === "" ? null : Number(v);
        } else {
          payload[key] = v === null || v === "" ? null : v;
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { message: "Tidak ada field yang diubah" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Cari profile: dulu by user_id (auth id), lalu by id (skema lama id = auth id)
    let profile: { id: string } | null = null;
    const { data: byUserId, error: errUser } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (errUser) {
      return NextResponse.json(
        { message: errUser.message },
        { status: 500 }
      );
    }
    if (byUserId) {
      profile = byUserId;
    }
    if (!profile) {
      const { data: byId, error: errId } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .limit(1)
        .maybeSingle();
      if (errId) {
        return NextResponse.json(
          { message: errId.message },
          { status: 500 }
        );
      }
      profile = byId;
    }
    if (!profile) {
      // Fallback: buat baris profil minimal dari Auth agar profil "Belum Lengkap" bisa disimpan
      const { data: authUser } = await admin.auth.admin.getUserById(userId);
      const email = authUser?.user?.email ?? (body?.email as string) ?? "";
      const { error: insertErr } = await admin.from("profiles").insert({
        id: userId,
        user_id: userId,
        email: email || "(no-email)",
        updated_at: new Date().toISOString(),
      });
      if (insertErr) {
        return NextResponse.json(
          {
            message: "Profil tidak ditemukan",
            detail:
              "Tidak ada baris di tabel profiles yang cocok dengan user_id (auth id) yang dikirim. " +
              "Profil biasanya dibuat otomatis saat user mendaftar. Gagal membuat baris baru: " +
              insertErr.message,
            code: "PROFILE_NOT_FOUND",
          },
          { status: 404 }
        );
      }
      profile = { id: userId };
    }

    const { error } = await admin
      .from("profiles")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API settings/profile]", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
