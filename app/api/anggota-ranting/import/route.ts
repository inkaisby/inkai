import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { insertEvent } from "@/app/lib/events/insertEvent";

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

  /* Validasi duplikat dalam batch: NIK dan No. Anggota harus unik per entry */
  const seenNik = new Set<string>();
  const seenNomor = new Set<string>();
  for (const raw of entries) {
    const nik = (raw.nik ?? "").trim();
    const nomor = (raw.nomor ?? "").trim();
    if (nik && seenNik.has(nik)) {
      return NextResponse.json(
        { message: `NIK ${nik} duplikat dalam data. NIK harus unik.` },
        { status: 400 }
      );
    }
    if (nomor && seenNomor.has(nomor)) {
      return NextResponse.json(
        { message: `No. Anggota ${nomor} duplikat dalam data. No. Anggota harus unik.` },
        { status: 400 }
      );
    }
    if (nik) seenNik.add(nik);
    if (nomor) seenNomor.add(nomor);
  }

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
      if (nik && !existing.nik) {
        const { data: dupNik } = await admin
          .from("profiles")
          .select("id")
          .eq("nik", nik)
          .neq("id", existing.id)
          .maybeSingle();
        if (dupNik) {
          return NextResponse.json(
            { message: "NIK sudah dipakai oleh anggota lain." },
            { status: 400 }
          );
        }
        updatePayload.nik = nik;
      }
      if (nomor && !existing.nomor) {
        const { data: dupNomor } = await admin
          .from("profiles")
          .select("id")
          .eq("nomor", nomor)
          .neq("id", existing.id)
          .maybeSingle();
        if (dupNomor) {
          return NextResponse.json(
            { message: "No. Anggota sudah dipakai oleh anggota lain." },
            { status: 400 }
          );
        }
        updatePayload.nomor = nomor;
      }

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
      /* Insert profil baru: pastikan NIK/No. Anggota belum dipakai profil lain */
      if (nik) {
        const { data: dupNik } = await admin
          .from("profiles")
          .select("id")
          .eq("nik", nik)
          .maybeSingle();
        if (dupNik) {
          return NextResponse.json(
            { message: "NIK sudah dipakai oleh anggota lain." },
            { status: 400 }
          );
        }
      }
      if (nomor) {
        const { data: dupNomor } = await admin
          .from("profiles")
          .select("id")
          .eq("nomor", nomor)
          .maybeSingle();
        if (dupNomor) {
          return NextResponse.json(
            { message: "No. Anggota sudah dipakai oleh anggota lain." },
            { status: 400 }
          );
        }
      }

      const insertPayload: Record<string, unknown> = {
        user_id: null,
        email: "",
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
  }

  // Satu event ringkasan untuk seluruh impor
  const totalEntries = entries.length;
  await insertEvent(admin, {
    user_id: user.id,
    type: "anggota_ranting_import",
    title:
      totalEntries === 1
        ? `Tambah anggota ranting: ${results[0]?.nama || "1 entri"}`
        : `Impor anggota ranting: ${totalEntries} entri`,
    module: "keanggotaan",
    detail: {
      total_entries: totalEntries,
    },
  });

  return NextResponse.json({ entries: results });
}

