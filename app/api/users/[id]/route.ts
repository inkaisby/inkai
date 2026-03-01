export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { requireSuperadmin } from "@/app/lib/security/requireSuperadmin";

/* ======================
   UTIL
====================== */

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json({ message }, { status: 500 });
}

/* ======================
   ALLOWED UPDATE FIELDS
   (WHITELIST)
====================== */
const ALLOWED_FIELDS = [
  "name",
  "email",
  "telepon",
  "role",
  "status",
  "gender",
  "alamat",
  "tanggal_lahir",
  "dojoId",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

/* ======================
   PUT /api/users/:id
====================== */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  const gate = await requireSuperadmin(me);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: gate.status });
  }

  const supabase = createSupabaseAdminClient();
  const { id: userId } = await params;

  if (!userId) {
    return badRequest("User ID tidak valid");
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Payload bukan JSON valid");
  }

  if (!body || Object.keys(body).length === 0) {
    return badRequest("Payload kosong");
  }

  /* ======================
     FILTER PAYLOAD
  ====================== */
  const payload: Partial<Record<AllowedField, string | null>> = {};

  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      const value = body[key];
      payload[key] = (value as string | null) ?? null;
    }
  }

  if (Object.keys(payload).length === 0) {
    return badRequest("Tidak ada field yang boleh diupdate");
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "Gagal update user");
  }

  return NextResponse.json(data, { status: 200 });
}

/* ======================
   DELETE /api/users/:id
   (SOFT DELETE via profiles.deleted_at)
   :id = auth user_id (UUID)
====================== */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  const gate = await requireSuperadmin(me);
  if (!gate.ok) {
    return NextResponse.json({ message: "Forbidden" }, { status: gate.status });
  }

  const supabase = createSupabaseAdminClient();
  const { id: userId } = await params;

  if (!userId) {
    return badRequest("User ID tidak valid");
  }

  const now = new Date().toISOString();
  const updatePayload = {
    deleted_at: now,
    updated_at: now,
  };

  // 1) Update by user_id (auth id) — paling pasti karena client kirim auth user_id
  const { data: updatedByUserId, error: errByUser } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (!errByUser && updatedByUserId) {
    return NextResponse.json(updatedByUserId, { status: 200 });
  }
  if (errByUser) {
    return serverError(errByUser.message);
  }

  // 2) Baris tidak ketemu by user_id: coba by profile id (skema lama id = auth id)
  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (findError) {
    return serverError(findError.message);
  }
  if (profile) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profile.id)
      .select()
      .single();
    if (error) return serverError(error.message);
    return NextResponse.json(data, { status: 200 });
  }

  // 3) Tidak ada baris profile (auth-only): buat "tombstone" di profiles agar GET menyembunyikan
  // profiles.id punya FK ke auth.users(id), jadi id harus = userId (auth id)
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "";
  const { error: insertErr } = await supabase.from("profiles").insert({
    id: userId,
    user_id: userId,
    email: email || "(deleted)",
    deleted_at: now,
    updated_at: now,
  });

  if (insertErr) {
    return serverError(insertErr.message);
  }

  return NextResponse.json({ message: "Akun dihapus dari daftar.", ok: true }, { status: 200 });
}
