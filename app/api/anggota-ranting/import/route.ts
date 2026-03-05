import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ImportEntry = {
  nik?: string | null;
  nomor?: string | null;
  nama?: string | null;
  ranting_id?: string | null;
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { entries?: ImportEntry[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const entries = Array.isArray(body.entries) ? body.entries : [];
  if (entries.length === 0) {
    return NextResponse.json({ message: "entries wajib diisi" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);

  const results: Array<{ id: string; nama: string; nik: string | null; nomor: string | null }> = [];

  for (const raw of entries) {
    const nik = (raw.nik ?? "").trim();
    const nomor = (raw.nomor ?? "").trim();
    const nama = (raw.nama ?? "").trim();
    const rantingId = (raw.ranting_id ?? "").trim();

    if (!rantingId) {
      return NextResponse.json({ message: "ranting_id wajib di setiap entry" }, { status: 400 });
    }
    const can =
      scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
    if (!can) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!nik && !nomor) {
      return NextResponse.json(
        { message: "Setiap entry minimal harus punya NIK atau No. Anggota" },
        { status: 400 },
      );
    }
    if (!nama) {
      return NextResponse.json({ message: "Nama wajib diisi" }, { status: 400 });
    }

    // Cari profil berdasarkan NIK atau No. Anggota
    let existing:
      | {
          id: string;
          nik: string | null;
          nomor: string | null;
        }
      | null = null;

    if (nik) {
      const { data } = await admin
        .from("profiles")
        .select("id, nik, nomor")
        .eq("nik", nik)
        .maybeSingle();
      if (data) existing = data as typeof existing;
    }
    if (!existing && nomor) {
      const { data } = await admin
        .from("profiles")
        .select("id, nik, nomor")
        .eq("nomor", nomor)
        .maybeSingle();
      if (data) existing = data as typeof existing;
    }

    if (existing) {
      // Update profil yang sudah ada
      const updatePayload: Record<string, unknown> = {
        nama,
        ranting_id: rantingId,
      };
      if (nik && !existing.nik) updatePayload.nik = nik;
      if (nomor && !existing.nomor) updatePayload.nomor = nomor;

      const { error: updateErr } = await admin
        .from("profiles")
        .update(updatePayload)
        .eq("id", existing.id);
      if (updateErr) {
        return NextResponse.json({ message: updateErr.message }, { status: 500 });
      }
      results.push({
        id: existing.id,
        nama,
        nik: nik || existing.nik || null,
        nomor: nomor || existing.nomor || null,
      });
    } else {
      // Insert profil baru (belum punya user_id)
      const insertPayload: Record<string, unknown> = {
        nama,
        nik: nik || null,
        nomor: nomor || null,
        ranting_id: rantingId,
        status: "AKTIF",
      };
      const { data: inserted, error: insertErr } = await admin
        .from("profiles")
        .insert(insertPayload)
        .select("id, nik, nomor")
        .single();
      if (insertErr || !inserted) {
        return NextResponse.json(
          { message: insertErr?.message ?? "Gagal menyimpan profil" },
          { status: 500 },
        );
      }
      results.push({
        id: String(inserted.id),
        nama,
        nik: (inserted as { nik?: string | null }).nik ?? null,
        nomor: (inserted as { nomor?: string | null }).nomor ?? null,
      });
    }

    // Insert event notifikasi untuk user yang melakukan impor
    const titleBase = entries.length === 1 ? "Tambah anggota ranting" : "Impor anggota ranting";
    await admin.from("events").insert({
      user_id: user.id,
      type: "anggota_ranting_import",
      title:
        entries.length === 1
          ? `${titleBase}: ${nama || nomor || nik || "tanpa nama"}`
          : `${titleBase}: ${entries.length} entri`,
      module: "keanggotaan",
      detail: {
        ranting_id: rantingId,
        entries: entries.length,
      },
    });
  }

  return NextResponse.json({ entries: results });
}

