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
   (SOFT DELETE)
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

  const { data, error } = await supabase
    .from("users")
    .update({
      status: "INACTIVE",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();

  if (error || !data) {
    return serverError(error?.message ?? "User tidak ditemukan");
  }

  return NextResponse.json(data, { status: 200 });
}
