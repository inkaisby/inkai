/**
 * GET: Daftar pendaftaran UKT (resume panel). Query: tahun_ajaran_id, ranting_id.
 * POST: Daftarkan peserta. Body: tahun_ajaran_id, profile_id, ranting_id, kyu_dan_terakhir.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/supabase/session";
import { createSupabaseAdminClient } from "@/app/lib/supabase/admin";
import { getUserScope } from "@/app/lib/scope/getUserScope";
import { getPublicUrl } from "@/app/lib/storage/ijazah";
import { insertEvent } from "@/app/lib/events/insertEvent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PendaftaranRow = {
  id: string;
  profile_id: string;
  ranting_id: string;
  kyu_dan_terakhir: string;
  status_bayar: string;
  total_bayar: number | null;
  bukti_transfer_path: string | null;
  file_url: string | null;
  dikonfirmasi_at: string | null;
  created_at: string;
  nama: string;
  nomor: string;
  kwitansi_token: string | null;
};

type BatalRow = PendaftaranRow & {
  batal_at: string | null;
  alasan_batal: string | null;
  refund_jumlah: number | null;
  refund_status: string;
  refund_at: string | null;
  refund_catatan: string | null;
  refund_bukti_path: string | null;
  refund_bukti_file_url: string | null;
};

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tahunAjaranId = searchParams.get("tahun_ajaran_id")?.trim();
  const rantingId = searchParams.get("ranting_id")?.trim();
  const includeBatal = searchParams.get("include_batal") === "true";

  if (!tahunAjaranId || !rantingId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id dan ranting_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess =
    scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error } = await admin
    .from("ukt_pendaftaran")
    .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, total_bayar, bukti_transfer_path, dikonfirmasi_at, created_at, kwitansi_token")
    .eq("tahun_ajaran_id", tahunAjaranId)
    .eq("ranting_id", rantingId)
    .neq("status_bayar", "batal")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ukt/pendaftaran GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const rawList = (rows ?? []) as Array<{ profile_id: string }>;
  const profileIds = Array.from(new Set(rawList.map((r) => r.profile_id)));
  const profileMap = new Map<string, { nama?: string; nomor?: string }>();
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, nama, nomor")
      .in("id", profileIds);
    (profiles ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) => {
      profileMap.set(p.id, { nama: p.nama ?? undefined, nomor: p.nomor ?? undefined });
    });
  }

  const list: PendaftaranRow[] = (rawList as any[]).map((r) => {
    const profile = profileMap.get(String(r.profile_id));
    const buktiPath = (r as any).bukti_transfer_path ?? null;
    return {
      id: String(r.id),
      profile_id: String(r.profile_id),
      ranting_id: String(r.ranting_id),
      kyu_dan_terakhir: (r as any).kyu_dan_terakhir ?? "",
      status_bayar: (r as any).status_bayar ?? "menunggu_bayar",
      total_bayar:
        (r as any).total_bayar != null ? Number((r as any).total_bayar) : null,
      bukti_transfer_path: buktiPath,
      file_url: getPublicUrl(buktiPath) ?? null,
      dikonfirmasi_at: (r as any).dikonfirmasi_at ?? null,
      created_at: String((r as any).created_at ?? ""),
      nama: profile?.nama ?? "",
      nomor: profile?.nomor ?? "",
      kwitansi_token: (r as any).kwitansi_token ? String((r as any).kwitansi_token) : null,
    };
  });

  const total_bayar = list.reduce((sum, r) => {
    return r.status_bayar === "lunas" && r.total_bayar != null
      ? sum + Number(r.total_bayar)
      : sum;
  }, 0);
  const belum_bayar = list.filter((r) => r.status_bayar === "menunggu_bayar").length;
  const lunas = list.filter((r) => r.status_bayar === "lunas").length;

  let listBatal: BatalRow[] = [];
  if (includeBatal) {
    const { data: batalRows } = await admin
      .from("ukt_pendaftaran")
      .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, total_bayar, bukti_transfer_path, dikonfirmasi_at, created_at, batal_at, alasan_batal, refund_jumlah, refund_status, refund_at, refund_catatan, refund_bukti_path")
      .eq("tahun_ajaran_id", tahunAjaranId)
      .eq("ranting_id", rantingId)
      .eq("status_bayar", "batal")
      .order("batal_at", { ascending: false });
    const batalProfileIds = Array.from(new Set((batalRows ?? []).map((r: { profile_id: string }) => r.profile_id)));
    const batalProfileMap = new Map<string, { nama?: string; nomor?: string }>();
    if (batalProfileIds.length > 0) {
      const { data: batalProfiles } = await admin
        .from("profiles")
        .select("id, nama, nomor")
        .in("id", batalProfileIds);
      (batalProfiles ?? []).forEach((p: { id: string; nama?: string; nomor?: string }) => {
        batalProfileMap.set(p.id, { nama: p.nama ?? undefined, nomor: p.nomor ?? undefined });
      });
    }
    listBatal = (batalRows ?? []).map((r: Record<string, unknown>) => {
      const profile = batalProfileMap.get(String(r.profile_id));
      const buktiPath = r.bukti_transfer_path as string | null ?? null;
      const rbp = (r.refund_bukti_path as string | null) ?? null;
      return {
        id: String(r.id),
        profile_id: String(r.profile_id),
        ranting_id: String(r.ranting_id),
        kyu_dan_terakhir: String(r.kyu_dan_terakhir ?? ""),
        status_bayar: "batal",
        total_bayar: r.total_bayar != null ? Number(r.total_bayar) : null,
        bukti_transfer_path: buktiPath,
        file_url: getPublicUrl(buktiPath) ?? null,
        dikonfirmasi_at: r.dikonfirmasi_at as string | null ?? null,
        created_at: String(r.created_at ?? ""),
        nama: profile?.nama ?? "",
        nomor: profile?.nomor ?? "",
        batal_at: r.batal_at as string | null ?? null,
        alasan_batal: (r.alasan_batal as string | null) ?? null,
        refund_jumlah: r.refund_jumlah != null ? Number(r.refund_jumlah) : null,
        refund_status: String(r.refund_status ?? "tidak_ada"),
        refund_at: r.refund_at as string | null ?? null,
        refund_catatan: (r.refund_catatan as string | null) ?? null,
        refund_bukti_path: rbp,
        refund_bukti_file_url: getPublicUrl(rbp) ?? null,
      };
    });
  }

  const res: { list: PendaftaranRow[]; summary: { total: number; belum_bayar: number; lunas: number; total_bayar: number }; list_batal?: BatalRow[] } = {
    list,
    summary: { total: list.length, belum_bayar, lunas, total_bayar },
  };
  if (includeBatal) res.list_batal = listBatal;
  return NextResponse.json(res);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    tahun_ajaran_id?: string;
    profile_id?: string;
    ranting_id?: string;
    kyu_dan_terakhir?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body harus JSON" }, { status: 400 });
  }

  const tahunAjaranId = body.tahun_ajaran_id?.trim();
  const profileId = body.profile_id?.trim();
  const rantingId = body.ranting_id?.trim();
  const kyuDanTerakhir = body.kyu_dan_terakhir?.trim() ?? null;

  if (!tahunAjaranId || !profileId || !rantingId) {
    return NextResponse.json(
      { message: "tahun_ajaran_id, profile_id, ranting_id wajib" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdminClient();
  const scope = await getUserScope(admin, user.id);
  const canAccess =
    scope.is_pp || (scope.ranting_ids.length > 0 && scope.ranting_ids.includes(rantingId));
  if (!canAccess) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { data: tahunRow } = await admin
    .from("ukt_tahun_ajaran")
    .select("id, cabang_id, ditutup_at")
    .eq("id", tahunAjaranId)
    .maybeSingle();
  if (!tahunRow) {
    return NextResponse.json({ message: "Tahun ajaran UKT tidak ditemukan" }, { status: 404 });
  }
  const ditutupAt = (tahunRow as { ditutup_at?: string | null }).ditutup_at;
  if (ditutupAt) {
    return NextResponse.json(
      { message: "Tahun ajaran ini sudah ditutup oleh cabang. Tidak bisa daftar atau daftar ulang." },
      { status: 403 }
    );
  }
  const { data: rantingRow } = await admin
    .from("ranting")
    .select("id, cabang_id")
    .eq("id", rantingId)
    .maybeSingle();
  if (!rantingRow) {
    return NextResponse.json({ message: "Ranting tidak ditemukan" }, { status: 404 });
  }
  const uktCabangId = (tahunRow as { cabang_id?: string | null }).cabang_id ?? null;
  const rantingCabangId = (rantingRow as { cabang_id?: string | null }).cabang_id ?? null;
  if (uktCabangId != null && uktCabangId !== rantingCabangId) {
    return NextResponse.json(
      { message: "Ranting hanya dapat mendaftarkan anggota ke UKT cabang sendiri atau UKT global" },
      { status: 403 }
    );
  }

  // Daftar ulang: jika sudah ada baris dengan status batal, aktifkan lagi (cabang belum tutup tahun)
  const { data: existingBatal } = await admin
    .from("ukt_pendaftaran")
    .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar")
    .eq("tahun_ajaran_id", tahunAjaranId)
    .eq("profile_id", profileId)
    .eq("status_bayar", "batal")
    .maybeSingle();

  if (existingBatal) {
    const now = new Date().toISOString();
    const { data: updated, error: updateErr } = await admin
      .from("ukt_pendaftaran")
      .update({
        ranting_id: rantingId,
        kyu_dan_terakhir: kyuDanTerakhir,
        status_bayar: "menunggu_bayar",
        batal_at: null,
        alasan_batal: null,
        refund_jumlah: null,
        refund_status: "tidak_ada",
        refund_at: null,
        refund_catatan: null,
        refund_bukti_path: null,
        updated_at: now,
      })
      .eq("id", (existingBatal as { id: string }).id)
      .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, created_at")
      .single();

    if (updateErr) {
      console.error("[ukt/pendaftaran POST re-register]", updateErr);
      return NextResponse.json({ message: updateErr.message }, { status: 500 });
    }

    await insertEvent(admin as any, {
      user_id: user.id,
      type: "ukt_pendaftaran_create",
      title: "Daftar ulang peserta UKT (sebelumnya batal)",
      module: "ukt",
      detail: {
        tahun_ajaran_id: tahunAjaranId,
        ranting_id: rantingId,
        profile_id: profileId,
        id: (updated as any).id,
      },
    });

    return NextResponse.json(updated);
  }

  const { data, error } = await admin
    .from("ukt_pendaftaran")
    .insert({
      tahun_ajaran_id: tahunAjaranId,
      profile_id: profileId,
      ranting_id: rantingId,
      kyu_dan_terakhir: kyuDanTerakhir,
      status_bayar: "menunggu_bayar",
    })
    .select("id, profile_id, ranting_id, kyu_dan_terakhir, status_bayar, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { message: "Peserta sudah terdaftar untuk tahun ajaran ini" },
        { status: 409 }
      );
    }
    console.error("[ukt/pendaftaran POST]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await insertEvent(admin as any, {
    user_id: user.id,
    type: "ukt_pendaftaran_create",
    title: "Mendaftarkan peserta UKT",
    module: "ukt",
    detail: {
      tahun_ajaran_id: tahunAjaranId,
      ranting_id: rantingId,
      profile_id: profileId,
      id: (data as any).id,
    },
  });

  return NextResponse.json(data);
}
