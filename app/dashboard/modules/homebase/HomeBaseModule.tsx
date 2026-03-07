"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  CreditCard,
  MapPin,
  Building2,
  PlusCircle,
  Trash2,
  Info,
  RefreshCw,
  Award,
  Calendar,
  GripVertical,
} from "lucide-react";

import { useScope } from "@/app/dashboard/components/topbar-premium/context/ScopeContext";
import { useBootstrapStore } from "@/app/dashboard/store/bootstrapStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type RantingRow = {
  id: string;
  nama: string;
  aktif: boolean;
  cabang_id: string | null;
  province_id: number | null;
  regency_id: number | null;
  district_id: number | null;
  instagram_url: string | null;
};

type ProvinsiOption = { id: string; nama: string };

type CabangOption = {
  id: string;
  nama: string;
  provinsi_id: string;
  aktif: boolean;
};

/** Kabupaten/Kota dari API wilayah (regencies) — untuk filter manual */
type WilayahOption = { id: string; name: string };

type PaymentRow = {
  id: string;
  nama: string;
  jenis: string;
  event: string;
  nominal: number;
  tanggal: string;
};

/** KPI Card — elegan & mewah: palet gelap dengan aksen emas/champagne */
const KPI_CARD_BASE =
  "rounded-xl border border-amber-500/15 bg-slate-800/40 backdrop-blur-sm dashboard-card-glow";

const DEFAULT_KPI_ORDER = [
  "ranting",
  "anggota",
  "event",
  "kwitansi",
] as const;

/** Sortable wrapper untuk KPI card (drag handle + transform) */
function SortableKpiCard({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className="absolute left-1 top-3 z-10 cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60 touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag untuk mengubah urutan"
      >
        <GripVertical size={14} />
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

/** Skeleton placeholder untuk loading */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/10 ${className}`}
      aria-hidden
    />
  );
}

const EMPTY_STRUCTURAL_ROLES: { structural_level?: number }[] = [];
const EMPTY_FUNCTIONAL_ROLES: { role_name: string; active: boolean }[] = [];

export default function HomeBaseModule() {
  const router = useRouter();
  const {
    scope,
    app_role,
    selectedContext,
    setSelectedContext,
    contextOptions,
  } = useScope();
  const profileRegencyId = useBootstrapStore(
    (s) => s.data?.user?.profile_regency_id ?? null,
  );
  const profileStructuralLevel = useBootstrapStore(
    (s) => s.data?.user?.profile_structural_level ?? null,
  );
  const structuralRoles = useBootstrapStore((s) => {
    const roles = s.data?.user?.structural_roles;
    return roles ?? EMPTY_STRUCTURAL_ROLES;
  });
  const functionalRoles = useBootstrapStore((s) => {
    const roles = s.data?.user?.functional_roles;
    return roles ?? EMPTY_FUNCTIONAL_ROLES;
  });

  /** Level 2–5 (Ketua Ranting s/d PP) boleh akses Home Base. */
  const userLevelAtLeast2 = useMemo(() => {
    if (profileStructuralLevel != null && profileStructuralLevel >= 2)
      return true;
    const activeRoles = (
      structuralRoles as { structural_level?: number; active?: boolean }[]
    ).filter((r) => r.active !== false);
    const maxFromRoles = activeRoles.reduce(
      (max, r) => Math.max(max, r.structural_level ?? 0),
      0,
    );
    return maxFromRoles >= 2;
  }, [profileStructuralLevel, structuralRoles]);

  const hasActiveFunctionalRole = useMemo(
    () => functionalRoles.some((r) => r.active),
    [functionalRoles],
  );

  const [featureConfig, setFeatureConfig] = useState<{
    homebase_min_level_create_ranting: number;
    homebase_roles_keanggotaan_block: string[];
    homebase_roles_event_block: string[];
    homebase_roles_kwitansi_block: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/feature-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setFeatureConfig(data))
      .catch(() => setFeatureConfig(null));
  }, []);

  const minLevelCreateRanting =
    featureConfig?.homebase_min_level_create_ranting ?? 3;
  const userLevelAtLeastForCreate = useMemo(() => {
    if (
      profileStructuralLevel != null &&
      profileStructuralLevel >= minLevelCreateRanting
    )
      return true;
    const activeRoles = (
      structuralRoles as { structural_level?: number; active?: boolean }[]
    ).filter((r) => r.active !== false);
    const maxFromRoles = activeRoles.reduce(
      (max, r) => Math.max(max, r.structural_level ?? 0),
      0,
    );
    return maxFromRoles >= minLevelCreateRanting;
  }, [profileStructuralLevel, structuralRoles, minLevelCreateRanting]);

  const userLevelAtLeast3 = userLevelAtLeastForCreate;

  /** Boleh tambah/ubah/hapus ranting: level ≥ 3 atau Superadmin */
  const canEditDeleteRanting = useMemo(
    () => userLevelAtLeast3 || (app_role ?? "").toUpperCase() === "SUPERADMIN",
    [userLevelAtLeast3, app_role],
  );

  const canUseDomisiliPreFill = useMemo(
    () => userLevelAtLeast3 || (app_role ?? "").toUpperCase() === "SUPERADMIN",
    [userLevelAtLeast3, app_role],
  );

  const profileRegencyIdRef = useRef(profileRegencyId);
  const canUseDomisiliPreFillRef = useRef(canUseDomisiliPreFill);
  /** Set true saat user hapus filter / ganti ketikan; supaya pre-fill tidak mengisi kembali. */
  const userClearedRegencyRef = useRef(false);
  useEffect(() => {
    profileRegencyIdRef.current = profileRegencyId;
  }, [profileRegencyId]);
  useEffect(() => {
    canUseDomisiliPreFillRef.current = canUseDomisiliPreFill;
  }, [canUseDomisiliPreFill]);

  const roleNameMatchesAny = (roleName: string, patterns: string[]) =>
    patterns.some((p) => roleName?.toUpperCase().includes(p));

  const rolesKeanggotaan = useMemo(
    () => featureConfig?.homebase_roles_keanggotaan_block ?? ["SEKRETARIS"],
    [featureConfig?.homebase_roles_keanggotaan_block],
  );
  const rolesEvent = useMemo(
    () =>
      featureConfig?.homebase_roles_event_block ?? ["PELATIH", "SEKRETARIS"],
    [featureConfig?.homebase_roles_event_block],
  );
  const rolesKwitansi = useMemo(
    () => featureConfig?.homebase_roles_kwitansi_block ?? ["BENDAHARA"],
    [featureConfig?.homebase_roles_kwitansi_block],
  );

  const hasRoleForKeanggotaan = useMemo(
    () =>
      (structuralRoles as { role_name?: string }[]).some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesKeanggotaan),
      ) ||
      functionalRoles.some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesKeanggotaan),
      ),
    [structuralRoles, functionalRoles, rolesKeanggotaan],
  );
  const hasRoleForEvent = useMemo(
    () =>
      (structuralRoles as { role_name?: string }[]).some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesEvent),
      ) ||
      functionalRoles.some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesEvent),
      ),
    [structuralRoles, functionalRoles, rolesEvent],
  );
  const hasRoleForKwitansi = useMemo(
    () =>
      (structuralRoles as { role_name?: string }[]).some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesKwitansi),
      ) ||
      functionalRoles.some((r) =>
        roleNameMatchesAny(r.role_name ?? "", rolesKwitansi),
      ),
    [structuralRoles, functionalRoles, rolesKwitansi],
  );

  const showKeanggotaanBlock = userLevelAtLeast2 || hasRoleForKeanggotaan;
  const showEventBlock = userLevelAtLeast2 || hasRoleForEvent;
  const showKwitansiBlock = userLevelAtLeast2 || hasRoleForKwitansi;

  const isSuperadmin = (app_role ?? "").toUpperCase() === "SUPERADMIN";
  const canAccessHomeBase =
    isSuperadmin || userLevelAtLeast2 || hasActiveFunctionalRole;

  const bootstrapData = useBootstrapStore((s) => s.data);
  useEffect(() => {
    if (bootstrapData && canAccessHomeBase === false) {
      router.replace("/dashboard");
    }
  }, [bootstrapData, canAccessHomeBase, router]);

  const [rantingList, setRantingList] = useState<RantingRow[]>([]);
  const [rantingLoading, setRantingLoading] = useState(true);
  const [provinsiList, setProvinsiList] = useState<ProvinsiOption[]>([]);
  const [cabangList, setCabangList] = useState<CabangOption[]>([]);
  /** Filter manual: daftar kabupaten/kota (regency) untuk search */
  const [wilayahOptions, setWilayahOptions] = useState<WilayahOption[]>([]);
  const [wilayahSearch, setWilayahSearch] = useState("");
  const [selectedRegencyId, setSelectedRegencyId] = useState<string | null>(
    null,
  );
  const [selectedRegencyName, setSelectedRegencyName] = useState<string | null>(
    null,
  );
  /** Selector wilayah bertingkat: Provinsi → Cabang → Ranting (tampilan: Jawa Timur / Surabaya / Gading) */
  const [wilayahProvinsiId, setWilayahProvinsiId] = useState<string | null>(null);
  const [wilayahCabangId, setWilayahCabangId] = useState<string | null>(null);
  const [wilayahRantingId, setWilayahRantingId] = useState<string | null>(null);
  const [selectedRanting, setSelectedRanting] = useState<RantingRow | null>(
    null,
  );
  const [rantingSearch, setRantingSearch] = useState("");
  const [rantingModalOpen, setRantingModalOpen] = useState(false);
  const [rantingFormMode, setRantingFormMode] = useState<"edit" | "create">(
    "edit",
  );
  const [rantingForm, setRantingForm] = useState<{
    nama: string;
    aktif: boolean;
    cabang_id: string;
    province_id: string;
    regency_id: string;
    district_id: string;
    instagram_url: string;
    alamat: string;
    ketua_nama: string;
    sekretaris_nama: string;
    bendahara_nama: string;
    pelatih_nama: string;
  }>({
    nama: "",
    aktif: true,
    cabang_id: "",
    province_id: "",
    regency_id: "",
    district_id: "",
    instagram_url: "",
    alamat: "",
    ketua_nama: "",
    sekretaris_nama: "",
    bendahara_nama: "",
    pelatih_nama: "",
  });
  const [rantingFormError, setRantingFormError] = useState<string | null>(null);
  const [rantingFormSaving, setRantingFormSaving] = useState(false);

  const loadRanting = useCallback(() => {
    return fetch("/api/ranting", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return [];
        try {
          const text = await res.text();
          return text.trim() ? (JSON.parse(text) as RantingRow[]) : [];
        } catch {
          return [];
        }
      })
      .then((data: RantingRow[]) => {
        if (Array.isArray(data)) setRantingList(data);
        return data;
      })
      .catch(() => []);
  }, []);

  const handleRantingFormSubmit = useCallback(() => {
    const nama = rantingForm.nama.trim();
    if (!nama) {
      setRantingFormError("Nama ranting wajib diisi.");
      return;
    }
    setRantingFormError(null);
    setRantingFormSaving(true);
    const base = {
      nama,
      aktif: rantingForm.aktif,
      cabang_id: rantingForm.cabang_id || null,
      province_id: rantingForm.province_id
        ? parseInt(rantingForm.province_id, 10)
        : null,
      regency_id: rantingForm.regency_id
        ? parseInt(rantingForm.regency_id, 10)
        : null,
      district_id: rantingForm.district_id
        ? parseInt(rantingForm.district_id, 10)
        : null,
      instagram_url: rantingForm.instagram_url.trim() || null,
    };

    const isEdit = rantingFormMode === "edit" && selectedRanting;
    const url = "/api/ranting";
    const method = isEdit ? "PATCH" : "POST";
    const body = isEdit ? { id: selectedRanting!.id, ...base } : base;

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data?.message as string) || "Gagal menyimpan.");
        }
      })
      .then(() => {
        loadRanting();
        setRantingModalOpen(false);
        if (isEdit) {
          setSelectedRanting((prev) =>
            prev
              ? {
                  ...prev,
                  ...base,
                }
              : null,
          );
        } else {
          setSelectedRanting(null);
        }
      })
      .catch((err: Error) => {
        setRantingFormError(err.message || "Gagal menyimpan.");
      })
      .finally(() => {
        setRantingFormSaving(false);
      });
  }, [rantingForm, rantingFormMode, selectedRanting, loadRanting]);

  // Demo data kwitansi; nanti bisa diganti hasil fetch dari API pembayaran
  const [payments] = useState<PaymentRow[]>([
    {
      id: "kw-001",
      nama: "Budi Santoso",
      jenis: "Event",
      event: "Kejuaraan Kota Surabaya 2026",
      nominal: 250_000,
      tanggal: new Date().toISOString(),
    },
    {
      id: "kw-002",
      nama: "Siti Aminah",
      jenis: "Ujian Kyu",
      event: "Ujian Kyu Periode Maret",
      nominal: 150_000,
      tanggal: new Date().toISOString(),
    },
  ]);

  // Ringkasan UKT (Event & Ujian) untuk blok Home Base
  const [uktSummary, setUktSummary] = useState<{
    tahun_ajaran: { id: string; nama: string } | null;
    total_peserta: number;
  }>({ tahun_ajaran: null, total_peserta: 0 });
  const [uktSummaryLoading, setUktSummaryLoading] = useState(false);

  // Load ranting (dibatasi scope dari API)
  useEffect(() => {
    let cancelled = false;
    loadRanting().finally(() => {
      if (!cancelled) setRantingLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadRanting]);

  // Load ringkasan UKT untuk blok Ujian (dengan filter ranting_ids)
  const loadUktSummary = useCallback((rantingIds: string[]) => {
    setUktSummaryLoading(true);
    const params = new URLSearchParams();
    if (rantingIds.length > 0) params.set("ranting_ids", rantingIds.join(","));
    return fetch(`/api/ukt/summary?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d.total_peserta === "number") {
          setUktSummary({
            tahun_ajaran: d.tahun_ajaran ?? null,
            total_peserta: d.total_peserta,
          });
        }
      })
      .catch(() => {})
      .finally(() => setUktSummaryLoading(false));
  }, []);

  // Ringkasan anggota per ranting untuk blok Keanggotaan
  const [anggotaSummary, setAnggotaSummary] = useState<{
    items: {
      ranting_id: string;
      ranting_nama: string;
      count_aktif: number;
      count_nonaktif: number;
    }[];
    total_aktif: number;
    total_nonaktif: number;
  }>({ items: [], total_aktif: 0, total_nonaktif: 0 });
  const [anggotaSummaryLoading, setAnggotaSummaryLoading] = useState(false);

  const loadAnggotaSummary = useCallback(
    (rantingIds: string[]) => {
      if (!showKeanggotaanBlock) return Promise.resolve();
      setAnggotaSummaryLoading(true);
      const params = new URLSearchParams();
      if (rantingIds.length > 0)
        params.set("ranting_ids", rantingIds.join(","));
      return fetch(`/api/ukt/anggota-aktif/summary?${params}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && Array.isArray(d.items)) {
            setAnggotaSummary({
              items: d.items,
              total_aktif: d.total_aktif ?? 0,
              total_nonaktif: d.total_nonaktif ?? 0,
            });
          }
        })
        .catch(() => {})
        .finally(() => setAnggotaSummaryLoading(false));
    },
    [showKeanggotaanBlock],
  );

  // Load provinsi + cabang sesuai scope (PP melihat semua)
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/provinsi", { credentials: "include" }),
      fetch("/api/cabang", { credentials: "include" }),
    ])
      .then(async ([provRes, cabRes]) => {
        let prov: ProvinsiOption[] = [];
        let cab: CabangOption[] = [];

        if (provRes.ok) {
          try {
            const t = await provRes.text();
            prov = t.trim()
              ? (JSON.parse(t) as { id: string; nama: string }[])
              : [];
          } catch {
            prov = [];
          }
        }

        if (cabRes.ok) {
          try {
            const t = await cabRes.text();
            cab = t.trim()
              ? (JSON.parse(t) as {
                  id: string;
                  nama: string;
                  provinsi_id: string;
                  aktif: boolean;
                }[])
              : [];
          } catch {
            cab = [];
          }
        }

        if (!cancelled) {
          setProvinsiList(prov);
          setCabangList(cab);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProvinsiList([]);
          setCabangList([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Kabupaten/kota HANYA yang ada di ranting user (scope) — cegah ganti wilayah ke luar akses
  const allowedRegencyIds = useMemo(
    () =>
      Array.from(
        new Set(
          rantingList
            .map((r) => (r.regency_id != null ? String(r.regency_id) : null))
            .filter((id): id is string => id != null),
        ),
      ),
    [rantingList],
  );

  // Load nama kabupaten/kota: PP/Superadmin = semua kab/kota dari API wilayah (kode provinsi 11-96); lainnya = hanya yang ada ranting (scope).
  const expandWilayahForPp = Boolean(scope?.is_pp || isSuperadmin);
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const all: WilayahOption[] = [];

      if (expandWilayahForPp) {
        // PP/Superadmin: ambil daftar provinsi dari API wilayah (kode numerik), lalu regencies per provinsi.
        try {
          const provRes = await fetch("/api/wilayah/provinces", {
            credentials: "include",
          });
          if (!provRes.ok) {
            if (!cancelled) setWilayahOptions([]);
            return;
          }
          const provData = await provRes.json();
          const provinces = Array.isArray(provData) ? provData : [];
          const provinceIds = provinces
            .map((p: { id?: string; code?: string }) =>
              String((p as { id?: string }).id ?? (p as { code?: string }).code ?? "").trim(),
            )
            .filter((id) => id !== "");

          for (const pid of provinceIds) {
            if (cancelled) return;
            try {
              const res = await fetch(
                `/api/wilayah/regencies?provinceId=${encodeURIComponent(pid)}`,
                { credentials: "include" },
              );
              if (!res.ok) continue;
              const data = await res.json();
              const arr = Array.isArray(data) ? data : [];
              for (const r of arr) {
                const id = String(
                  (r as { id?: string }).id ?? (r as { code?: string }).code ?? "",
                );
                if (!id) continue;
                const name =
                  (r as { name?: string }).name ??
                  (r as { nama?: string }).nama ??
                  id;
                all.push({ id, name });
              }
            } catch {
              // skip province
            }
          }
        } catch {
          // fallback empty
        }
      } else {
        // Bukan PP: hanya regency yang ada di rantingList (scope).
        const provinceIds = Array.from(
          new Set(
            rantingList
              .map((r) => r.province_id)
              .filter((id): id is number => id != null),
          ),
        );
        if (provinceIds.length === 0 || allowedRegencyIds.length === 0) {
          if (!cancelled) setWilayahOptions([]);
          return;
        }
        const allowedSet = new Set(allowedRegencyIds);
        for (const pid of provinceIds) {
          try {
            const res = await fetch(
              `/api/wilayah/regencies?provinceId=${encodeURIComponent(String(pid))}`,
              { credentials: "include" },
            );
            if (!res.ok) continue;
            const data = await res.json();
            const arr = Array.isArray(data) ? data : [];
            for (const r of arr) {
              const id = String(
                (r as { id?: string }).id ?? (r as { code?: string }).code ?? "",
              );
              if (!id || !allowedSet.has(id)) continue;
              const name =
                (r as { name?: string }).name ??
                (r as { nama?: string }).nama ??
                id;
              all.push({ id, name });
            }
          } catch {
            // skip province
          }
        }
      }

      if (!cancelled) setWilayahOptions(all);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    expandWilayahForPp,
    rantingList,
    allowedRegencyIds,
  ]);

  // Pre-fill kabupaten/kota: Superadmin atau level ≥ 3 pakai domisili profil; else satu cabang saja.
  // Jangan isi lagi setelah user sengaja hapus/ubah (supaya filter sesuai yang diketik).
  useEffect(() => {
    if (userClearedRegencyRef.current) return;
    if (wilayahOptions.length === 0 || allowedRegencyIds.length === 0) return;
    const allowedSet = new Set(allowedRegencyIds);
    const domisiliId = profileRegencyIdRef.current;
    const useDomisili = canUseDomisiliPreFillRef.current;
    const idByDomisili =
      useDomisili && domisiliId && allowedSet.has(domisiliId)
        ? domisiliId
        : allowedRegencyIds.length === 1
          ? allowedRegencyIds[0]
          : null;
    if (!idByDomisili || selectedRegencyId === idByDomisili) return;
    const opt = wilayahOptions.find((w) => w.id === idByDomisili);
    if (!opt) return;
    const displayName = opt.name || opt.id;
    const t = setTimeout(() => {
      setSelectedRegencyId(idByDomisili);
      setSelectedRegencyName(displayName);
      setWilayahSearch(displayName);
    }, 0);
    return () => clearTimeout(t);
  }, [allowedRegencyIds, wilayahOptions, selectedRegencyId]);

  const wilayahLabel = useMemo(() => {
    if (!scope) return "Wilayah belum ter-set";
    if (scope.is_pp) return "PP — seluruh Indonesia";
    if (scope.cabang_ids.length > 0) return "Cabang";
    if (scope.ranting_ids.length > 0) return "Ranting";
    if (scope.provinsi_ids.length > 0) return "Pengprov";
    return "Wilayah";
  }, [scope]);

  /** Opsi kabupaten/kota yang cocok dengan search (untuk dropdown) */
  const filteredWilayahOptions = useMemo(() => {
    const q = wilayahSearch.trim().toLowerCase();
    if (!q) return wilayahOptions.slice(0, 50);
    return wilayahOptions
      .filter((w) => w.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [wilayahOptions, wilayahSearch]);

  /** Ranting IDs untuk filter API (dari selectedContext) */
  const rantingIdsForFilter = useMemo(() => {
    if (!selectedContext || selectedContext === "all") return [] as string[];
    if (selectedContext.startsWith("cabang:")) {
      const cabangId = selectedContext.replace("cabang:", "");
      return rantingList
        .filter((r) => r.cabang_id === cabangId)
        .map((r) => r.id);
    }
    return [selectedContext];
  }, [selectedContext, rantingList]);

  /** Ranting list terfilter untuk tampilan (tabel, dll) */
  const rantingListFiltered = useMemo(() => {
    if (rantingIdsForFilter.length === 0) return rantingList;
    const set = new Set(rantingIdsForFilter);
    return rantingList.filter((r) => set.has(r.id));
  }, [rantingList, rantingIdsForFilter]);

  /** Ranting yang masuk filter: by kabupaten/kota (regency) yang dipilih */
  const filteredRanting = useMemo(() => {
    if (!selectedRegencyId) return rantingListFiltered;
    return rantingListFiltered.filter(
      (r) => String(r.regency_id ?? "") === String(selectedRegencyId),
    );
  }, [rantingListFiltered, selectedRegencyId]);

  /** Satu baris per cabang (per kabupaten/kota) untuk tabel atas */
  const cabangRows = useMemo(() => {
    const map = new Map<
      string,
      {
        displayName: string;
        isActive: boolean;
        representative: RantingRow;
      }
    >();

    filteredRanting.forEach((r) => {
      const key = String(r.regency_id ?? r.cabang_id ?? r.id);
      if (!key) return;

      const cabangName = cabangList.find((c) => c.id === r.cabang_id)?.nama;
      const namaKabupaten = wilayahOptions.find(
        (w) => w.id === String(r.regency_id ?? ""),
      )?.name;
      const cabangDisplay = cabangName ?? namaKabupaten ?? "—";

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          displayName: cabangDisplay,
          isActive: r.aktif,
          representative: r,
        });
      } else if (r.aktif && !existing.isActive) {
        existing.isActive = true;
      }
    });

    return Array.from(map.values());
  }, [filteredRanting, cabangList, wilayahOptions]);

  /** Ranting di panel (cabang terpilih) + search nama ranting */
  const panelRanting = useMemo(() => {
    if (!selectedRanting) return [] as RantingRow[];
    const base = rantingListFiltered.filter(
      (r) =>
        String(r.regency_id ?? "") === String(selectedRanting.regency_id ?? ""),
    );
    const q = rantingSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => r.nama.toLowerCase().includes(q));
  }, [rantingListFiltered, selectedRanting, rantingSearch]);

  /** Nama cabang yang aktif di form (untuk modal tambah/ubah) */
  const currentCabangName = useMemo(() => {
    const cabangName = cabangList.find(
      (c) => c.id === rantingForm.cabang_id,
    )?.nama;
    const namaKabupaten = wilayahOptions.find(
      (w) => w.id === String(rantingForm.regency_id || selectedRegencyId || ""),
    )?.name;
    return cabangName ?? namaKabupaten ?? selectedRegencyName ?? "—";
  }, [
    cabangList,
    wilayahOptions,
    rantingForm.cabang_id,
    rantingForm.regency_id,
    selectedRegencyId,
    selectedRegencyName,
  ]);

  const totalRanting = rantingListFiltered.length;
  const totalRantingAktif = rantingListFiltered.filter((r) => r.aktif).length;

  /** Ringkasan per provinsi (untuk PP/Superadmin): cabang & ranting count. Nama dari provinsiList agar terbaca. */
  const summaryPerProvinsi = useMemo(() => {
    if (!scope?.is_pp && !isSuperadmin) return [];
    const byProv: Map<
      string,
      { nama: string; cabang: number; ranting: number }
    > = new Map();
    for (const c of cabangList) {
      const pid = String(c.provinsi_id ?? "").trim();
      if (!pid) continue;
      const curr = byProv.get(pid);
      const prov = provinsiList.find((p) => String(p.id).trim() === pid);
      const nama =
        prov?.nama?.trim() ||
        (pid.length > 20 ? `Provinsi (${pid.slice(0, 8)}…)` : pid);
      const rantingCount = rantingListFiltered.filter(
        (r) => r.cabang_id === c.id,
      ).length;
      if (!curr) {
        byProv.set(pid, { nama, cabang: 1, ranting: rantingCount });
      } else {
        curr.cabang += 1;
        curr.ranting += rantingCount;
      }
    }
    return Array.from(byProv.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
      .slice(0, 12);
  }, [
    scope?.is_pp,
    isSuperadmin,
    cabangList,
    provinsiList,
    rantingListFiltered,
  ]);

  /** Ringkasan per cabang: ranting count + anggota. Nama dari cabangList agar terbaca. */
  const summaryPerCabang = useMemo(() => {
    const byCabang: Map<
      string,
      { nama: string; ranting: number; anggota: number }
    > = new Map();
    for (const r of rantingListFiltered) {
      const cid = String(r.cabang_id ?? "").trim();
      const cab = cabangList.find((c) => String(c.id).trim() === cid);
      const nama =
        cab?.nama?.trim() ||
        (cid.length > 20 ? `Cabang (${cid.slice(0, 8)}…)` : cid) ||
        "—";
      const item = anggotaSummary.items.find((i) => i.ranting_id === r.id);
      const anggota = item ? item.count_aktif + item.count_nonaktif : 0;
      const curr = byCabang.get(cid);
      if (!curr) byCabang.set(cid, { nama, ranting: 1, anggota });
      else {
        curr.ranting += 1;
        curr.anggota += anggota;
      }
    }
    return Array.from(byCabang.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => a.nama.localeCompare(b.nama))
      .slice(0, 15);
  }, [rantingListFiltered, cabangList, anggotaSummary.items]);

  /** Data untuk mini bar chart: anggota per ranting */
  const chartAnggotaPerRanting = useMemo(() => {
    return anggotaSummary.items
      .map((i) => ({
        name: i.ranting_nama,
        jumlah: i.count_aktif,
        key: i.ranting_id,
      }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);
  }, [anggotaSummary.items]);

  // Load UKT & anggota summary saat filter berubah (defer agar setState tidak sync di effect)
  useEffect(() => {
    const t = setTimeout(() => {
      loadUktSummary(rantingIdsForFilter);
      loadAnggotaSummary(rantingIdsForFilter);
    }, 0);
    return () => clearTimeout(t);
  }, [rantingIdsForFilter, loadUktSummary, loadAnggotaSummary]);

  /** Realtime: auto-refresh setiap 45 detik */
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const POLL_INTERVAL_MS = 45_000;

  /** Layout dashboard (drag-and-drop): urutan KPI cards, tersimpan di DB */
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => [
    ...DEFAULT_KPI_ORDER,
  ]);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/layout", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { kpiOrder?: string[] }) => {
        if (Array.isArray(data?.kpiOrder) && data.kpiOrder.length > 0) {
          setKpiOrder(data.kpiOrder);
        }
      })
      .catch(() => {})
      .finally(() => setLayoutLoaded(true));
  }, []);

  const saveLayout = useCallback((newKpiOrder: string[]) => {
    fetch("/api/dashboard/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ kpiOrder: newKpiOrder }),
    }).catch(() => {});
  }, []);

  const handleRefresh = useCallback(() => {
    setRantingLoading(true);
    loadRanting()
      .then(() => {
        loadUktSummary(rantingIdsForFilter);
        loadAnggotaSummary(rantingIdsForFilter);
      })
      .finally(() => {
        setRantingLoading(false);
        setLastUpdated(new Date());
      });
  }, [loadRanting, loadUktSummary, loadAnggotaSummary, rantingIdsForFilter]);

  useEffect(() => {
    const t = setTimeout(() => setLastUpdated(new Date()), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!canAccessHomeBase) return;
    const interval = setInterval(() => {
      loadRanting().then(() => {
        loadUktSummary(rantingIdsForFilter);
        loadAnggotaSummary(rantingIdsForFilter);
        setLastUpdated(new Date());
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    canAccessHomeBase,
    rantingIdsForFilter,
    loadRanting,
    loadUktSummary,
    loadAnggotaSummary,
  ]);

  const formatLastUpdated = (d: Date | null) => {
    if (!d) return "";
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const visibleKpiSet = useMemo(() => {
    const set = new Set<string>();
    set.add("ranting");
    if (showKeanggotaanBlock) set.add("anggota");
    if (showEventBlock) set.add("event");
    if (showKwitansiBlock) set.add("kwitansi");
    return set;
  }, [showKeanggotaanBlock, showEventBlock, showKwitansiBlock]);

  const orderedKpiIds = useMemo(
    () => kpiOrder.filter((id) => visibleKpiSet.has(id)),
    [kpiOrder, visibleKpiSet],
  );

  const handleKpiDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = orderedKpiIds.indexOf(String(active.id));
      const newIndex = orderedKpiIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(orderedKpiIds, oldIndex, newIndex);
      const newKpiOrder = [
        ...reordered,
        ...kpiOrder.filter((id) => !reordered.includes(id)),
      ];
      setKpiOrder(newKpiOrder);
      saveLayout(newKpiOrder);
    },
    [orderedKpiIds, kpiOrder, saveLayout],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  if (bootstrapData && !canAccessHomeBase) {
    return null;
  }

  return (
    <div className="relative min-h-screen -m-4 sm:-m-6 p-4 sm:p-6 rounded-2xl overflow-x-hidden">
      {/* Background — elegan & mewah: gelap dengan sentuhan emas halus */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(198,166,103,0.06),transparent)] pointer-events-none" />

      <div className="relative space-y-8 pb-8">
        {/* HEADER — tetap di atas saat scroll */}
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 -mx-4 px-4 -mt-4 pt-4 sm:-mx-6 sm:px-6 sm:-mt-6 sm:pt-6 bg-slate-950/95 backdrop-blur-md border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white/95 tracking-tight">
                Dashboard
              </h1>
              {lastUpdated && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 px-2.5 py-0.5 text-[10px] font-medium text-amber-200/90 dashboard-live-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/90 animate-pulse" />
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-white/70 mt-1">
              Ringkasan wilayah, ranting, keanggotaan, event, dan kwitansi di
              wilayah Anda.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contextOptions.length > 1 && (
              <Select
                value={selectedContext || "all"}
                onValueChange={(v) => setSelectedContext(v)}
              >
                <SelectTrigger className="w-[180px] h-9 border-white/10 bg-slate-800/60 text-white/95 hover:bg-slate-800/80 transition-colors">
                  <SelectValue placeholder="Filter scope" />
                </SelectTrigger>
                <SelectContent>
                  {contextOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={rantingLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2 text-xs font-medium text-white/90 hover:bg-slate-700/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Segarkan data"
            >
              <RefreshCw
                size={14}
                className={rantingLoading ? "animate-spin" : undefined}
              />
              Segarkan
            </button>
            <div className="flex items-center gap-2 text-xs text-white/80 bg-slate-800/50 border border-white/10 px-3 py-1.5 rounded-xl">
              <MapPin size={14} className="text-amber-400/70" />
              <span>{wilayahLabel}</span>
              {isSuperadmin && (
                <span className="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-200/90 border border-amber-400/20">
                  Superadmin
                </span>
              )}
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-white/40">
                {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {/* SUMMARY CARDS — Elegan & Mewah (drag-and-drop, urutan tersimpan di DB) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleKpiDragEnd}
          >
            <SortableContext
              items={orderedKpiIds}
              strategy={horizontalListSortingStrategy}
            >
              {layoutLoaded &&
                orderedKpiIds.map((kpiId) => (
                  <SortableKpiCard key={kpiId} id={kpiId}>
                    <div className={`${KPI_CARD_BASE} p-5`}>
                      {kpiId === "ranting" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/70">
                              Ranting Aktif
                            </span>
                            <UserCheck
                              size={18}
                              className="text-amber-400/80"
                            />
                          </div>
                          <div className="mt-3 text-3xl font-bold text-amber-100/95">
                            {rantingLoading ? (
                              <Skeleton className="h-9 w-14" />
                            ) : (
                              totalRantingAktif
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1">
                            Dari total {rantingLoading ? "…" : totalRanting}{" "}
                            ranting di wilayah yang Anda kelola.
                          </div>
                          <Link
                            href="/dashboard/ranting"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                          >
                            Lihat ranting →
                          </Link>
                        </>
                      )}
                      {kpiId === "anggota" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/70">
                              Anggota
                            </span>
                            <Users size={18} className="text-amber-400/80" />
                          </div>
                          <div className="mt-3 text-3xl font-bold text-amber-100/95">
                            {anggotaSummaryLoading ? (
                              <Skeleton className="h-9 w-14" />
                            ) : (
                              anggotaSummary.total_aktif
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1">
                            Anggota aktif di wilayah terfilter.
                          </div>
                          <Link
                            href="/dashboard/keanggotaan"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                          >
                            Buka Keanggotaan →
                          </Link>
                        </>
                      )}
                      {kpiId === "event" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/70">
                              UKT (Ujian Kenaikan Tingkat)
                            </span>
                            <Award size={18} className="text-amber-400/80" />
                          </div>
                          <div className="mt-3 text-3xl font-bold text-amber-100/95">
                            {uktSummaryLoading ? (
                              <Skeleton className="h-9 w-14" />
                            ) : (
                              uktSummary.total_peserta
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1">
                            Peserta UKT
                            {uktSummary.tahun_ajaran
                              ? ` ${uktSummary.tahun_ajaran.nama}`
                              : ""}{" "}
                            di wilayah terfilter.
                          </div>
                          <Link
                            href="/dashboard/ujian"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                          >
                            Buka UKT →
                          </Link>
                        </>
                      )}
                      {kpiId === "kwitansi" && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white/70">
                              Kwitansi
                            </span>
                            <CreditCard
                              size={18}
                              className="text-amber-400/80"
                            />
                          </div>
                          <div className="mt-3 text-3xl font-bold text-amber-100/95">
                            {payments.length}
                          </div>
                          <div className="text-[11px] text-white/50 mt-1">
                            Kwitansi siap dicetak (contoh data demo).
                          </div>
                          <Link
                            href="/dashboard/keuangan"
                            className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                          >
                            Buka Kwitansi →
                          </Link>
                        </>
                      )}
                    </div>
                  </SortableKpiCard>
                ))}
              {(!layoutLoaded || orderedKpiIds.length === 0) && (
                <>
                  <div className={`${KPI_CARD_BASE} p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white/70">
                        Ranting Aktif
                      </span>
                      <UserCheck size={18} className="text-amber-400/80" />
                    </div>
                    <div className="mt-3 text-3xl font-bold text-amber-100/95">
                      {rantingLoading ? (
                        <Skeleton className="h-9 w-14" />
                      ) : (
                        totalRantingAktif
                      )}
                    </div>
                    <div className="text-[11px] text-white/50 mt-1">
                      Dari total {rantingLoading ? "…" : totalRanting} ranting
                      di wilayah yang Anda kelola.
                    </div>
                    <Link
                      href="/dashboard/ranting"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                    >
                      Lihat ranting →
                    </Link>
                  </div>
                  {showKeanggotaanBlock && (
                    <div className={`${KPI_CARD_BASE} p-5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/70">
                          Anggota
                        </span>
                        <Users size={18} className="text-amber-400/80" />
                      </div>
                      <div className="mt-3 text-3xl font-bold text-amber-100/95">
                        {anggotaSummaryLoading ? (
                          <Skeleton className="h-9 w-14" />
                        ) : (
                          anggotaSummary.total_aktif
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1">
                        Anggota aktif di wilayah terfilter.
                      </div>
                      <Link
                        href="/dashboard/keanggotaan"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                      >
                        Buka Keanggotaan →
                      </Link>
                    </div>
                  )}
                  {showEventBlock && (
                    <>
                      <div className={`${KPI_CARD_BASE} p-5`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-white/70">
                            UKT (Ujian Kenaikan Tingkat)
                          </span>
                          <Award size={18} className="text-amber-400/80" />
                        </div>
                        <div className="mt-3 text-3xl font-bold text-amber-100/95">
                          {uktSummaryLoading ? (
                            <Skeleton className="h-9 w-14" />
                          ) : (
                            uktSummary.total_peserta
                          )}
                        </div>
                        <div className="text-[11px] text-white/50 mt-1">
                          Peserta UKT
                          {uktSummary.tahun_ajaran
                            ? ` ${uktSummary.tahun_ajaran.nama}`
                            : ""}{" "}
                          di wilayah terfilter.
                        </div>
                        <Link
                          href="/dashboard/ujian"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                        >
                          Buka UKT →
                        </Link>
                      </div>
                    </>
                  )}
                  {showKwitansiBlock && (
                    <div className={`${KPI_CARD_BASE} p-5`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white/70">
                          Kwitansi
                        </span>
                        <CreditCard size={18} className="text-amber-400/80" />
                      </div>
                      <div className="mt-3 text-3xl font-bold text-amber-100/95">
                        {payments.length}
                      </div>
                      <div className="text-[11px] text-white/50 mt-1">
                        Kwitansi siap dicetak (contoh data demo).
                      </div>
                      <Link
                        href="/dashboard/keuangan"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                      >
                        Buka Kwitansi →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </SortableContext>
          </DndContext>
        </div>

        {/* GRAFIK — Anggota per Ranting (full lebar, di bawah KPI drag-and-drop) */}
        <div className="w-full">
          <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Users size={18} className="text-amber-400/80" />
              </div>
              <h2 className="text-sm font-semibold text-white/95">
                Anggota per Ranting (top 10)
              </h2>
            </div>
            <p className="text-[11px] text-white/50">
              Anggota aktif per ranting di wilayah terfilter.
            </p>
            {anggotaSummaryLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-48 w-full" />
              </div>
            ) : chartAnggotaPerRanting.length === 0 ? (
              <p className="text-xs text-white/50 h-48 flex items-center justify-center">
                Belum ada data anggota per ranting.
              </p>
            ) : (
              <div className="h-72 w-full min-h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartAnggotaPerRanting}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 10 }}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v.length > 12 ? v.slice(0, 10) + "…" : v
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgb(15 23 42)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                      formatter={(value: number) => [value, "Anggota aktif"]}
                      labelFormatter={(label) => `Ranting: ${label}`}
                    />
                    <Bar
                      dataKey="jumlah"
                      fill="rgba(245, 158, 11, 0.6)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* RINGKASAN PER WILAYAH — Cabang per kab/kota di kiri */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cabang per kabupaten/kota (kiri) */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-6 space-y-4">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <Building2 size={18} className="text-amber-400/80" />
                  </div>
                  <h2 className="text-sm font-semibold text-white/95">
                    Cabang per kabupaten/kota
                  </h2>
                </div>
                <p className="text-[11px] text-white/50">
                  {expandWilayahForPp
                    ? "Pilih kabupaten/kota untuk melihat cabang dan ranting di wilayah tersebut. PP/Superadmin dapat memilih wilayah mana saja."
                    : "Hanya cabang di wilayah Anda (sesuai profil). Data dibatasi di server."}
                </p>
                <div className="relative">
                  <input
                    type="text"
                    suppressHydrationWarning
                    value={wilayahSearch}
                    onChange={(e) => {
                      const v = e.target.value;
                      setWilayahSearch(v);
                      if (selectedRegencyId && v !== selectedRegencyName) {
                        setSelectedRegencyId(null);
                        setSelectedRegencyName(null);
                        userClearedRegencyRef.current = true;
                      }
                    }}
                    placeholder={
                      wilayahOptions.length > 0
                        ? "Pilih kabupaten/kota Anda…"
                        : "Memuat daftar kabupaten/kota…"
                    }
                    className={`w-full rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2.5 text-xs text-white placeholder:text-white/40 focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20 focus:outline-none transition-all ${selectedRegencyId ? "pr-20" : ""}`}
                  />
                  {selectedRegencyId && (
                    <button
                      type="button"
                      onClick={() => {
                        userClearedRegencyRef.current = true;
                        setSelectedRegencyId(null);
                        setSelectedRegencyName(null);
                        setWilayahSearch("");
                        setSelectedRanting(null);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-200/80 hover:text-amber-100"
                    >
                      Hapus filter
                    </button>
                  )}
                  {filteredWilayahOptions.length > 0 &&
                    wilayahSearch.trim() &&
                    !selectedRegencyId && (
                      <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm py-1 text-xs shadow-xl shadow-black/30">
                        {filteredWilayahOptions.map((w) => (
                          <li key={w.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-white/90 hover:bg-white/5 rounded-lg transition-colors"
                              onClick={() => {
                                setSelectedRegencyId(w.id);
                                setSelectedRegencyName(w.name);
                                setWilayahSearch(w.name);
                                setSelectedRanting(null);
                              }}
                            >
                              {w.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
                {selectedRegencyName && (
                  <p className="text-[11px] text-amber-200/80">
                    Menampilkan ranting di:{" "}
                    <strong>{selectedRegencyName}</strong>
                  </p>
                )}
              </div>
              {rantingLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : filteredRanting.length === 0 ? (
                <p className="text-xs text-white/50">
                  {selectedRegencyId
                    ? "Cabang ini belum memiliki ranting."
                    : "Pilih kabupaten/kota di atas atau lihat semua ranting di wilayah Anda di bawah."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-white/60 border-b border-white/10">
                        <th className="pb-2 pr-4">Cabang</th>
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2">Instagram</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cabangRows.map((row) => (
                        <tr
                          key={row.representative.id}
                          className={`border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors ${
                            selectedRanting &&
                            String(selectedRanting.regency_id ?? "") ===
                              String(row.representative.regency_id ?? "")
                              ? "bg-white/5"
                              : "bg-transparent"
                          }`}
                          onClick={() => setSelectedRanting(row.representative)}
                        >
                          <td className="py-2 pr-4 text-white/90">
                            {row.displayName}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={
                                row.isActive
                                  ? "text-amber-300/90"
                                  : "text-white/40 italic"
                              }
                            >
                              {row.isActive ? "Aktif" : "Nonaktif"}
                            </span>
                          </td>
                          <td className="py-2 text-white/60">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedRanting && (
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-800/40 p-4 text-xs text-white/85 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-amber-200/90">
                          Ranting di cabang ini
                        </div>
                        {canEditDeleteRanting && (
                          <button
                            type="button"
                            onClick={() => {
                              setRantingFormMode("create");
                              setRantingForm({
                                nama: "",
                                aktif: true,
                                cabang_id: String(
                                  selectedRanting.cabang_id ?? "",
                                ),
                                province_id: String(
                                  selectedRanting.province_id ?? "",
                                ),
                                regency_id: String(
                                  selectedRanting.regency_id ?? "",
                                ),
                                district_id: "",
                                instagram_url: "",
                                alamat: "",
                                ketua_nama: "",
                                sekretaris_nama: "",
                                bendahara_nama: "",
                                pelatih_nama: "",
                              });
                              setRantingFormError(null);
                              setRantingModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-2 py-1 text-[10px] text-amber-200/90 hover:bg-amber-500/10"
                          >
                            <PlusCircle size={11} />
                            Tambah ranting
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-white/60">
                        Cabang:{" "}
                        <span className="font-medium text-amber-200/90">
                          {panelRanting.length > 0
                            ? (panelRanting[0]?.regency_id ?? "—")
                            : (selectedRegencyName ?? "—")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedRanting(null)}
                      className="text-[10px] text-white/60 hover:text-white/90"
                    >
                      Tutup
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      suppressHydrationWarning
                      value={rantingSearch}
                      onChange={(e) => setRantingSearch(e.target.value)}
                      placeholder="Cari ranting di cabang ini…"
                      className="w-full rounded-md border border-white/10 bg-slate-900/50 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:border-amber-500/30 focus:outline-none"
                    />
                    <div className="text-[11px] text-white/50 whitespace-nowrap">
                      {panelRanting.length} ranting
                    </div>
                  </div>

                  {panelRanting.length === 0 ? (
                    <p className="text-[11px] text-white/60">
                      Cabang ini belum memiliki ranting.
                    </p>
                  ) : (
                    <div className="border border-white/10 rounded-md overflow-hidden">
                      <table className="w-full table-fixed text-[11px]">
                        <thead className="bg-slate-800/60 text-amber-100/90">
                          <tr>
                            <th className="px-2 py-1.5 text-left w-[40%]">
                              Nama ranting
                            </th>
                            <th className="px-2 py-1.5 text-left w-[20%]">
                              Status
                            </th>
                            <th className="px-2 py-1.5 text-right w-[40%]">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {panelRanting.map((r) => (
                            <tr
                              key={r.id}
                              className="border-t border-white/5 hover:bg-white/5"
                            >
                              <td className="px-2 py-1.5 text-white/90">
                                {r.nama}
                              </td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={
                                    r.aktif
                                      ? "text-amber-300/90"
                                      : "text-white/45 italic"
                                  }
                                >
                                  {r.aktif ? "Aktif" : "Nonaktif"}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-right space-x-1">
                                <a
                                  href={`/dashboard/anggota-ranting?ranting_id=${encodeURIComponent(
                                    r.id,
                                  )}&ranting_nama=${encodeURIComponent(
                                    r.nama ?? "",
                                  )}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] text-amber-200/90 hover:bg-amber-500/10"
                                >
                                  Kelola anggota
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRanting(r);
                                    setRantingFormMode("edit");
                                    setRantingForm({
                                      nama: r.nama ?? "",
                                      aktif: r.aktif ?? true,
                                      cabang_id: String(r.cabang_id ?? ""),
                                      province_id: String(r.province_id ?? ""),
                                      regency_id: String(r.regency_id ?? ""),
                                      district_id: String(r.district_id ?? ""),
                                      instagram_url: r.instagram_url ?? "",
                                      alamat: "",
                                      ketua_nama: "",
                                      sekretaris_nama: "",
                                      bendahara_nama: "",
                                      pelatih_nama: "",
                                    });
                                    setRantingFormError(null);
                                    setRantingModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-200/90 hover:bg-amber-500/10"
                                  title="Lihat detail & ubah"
                                >
                                  <Info size={10} />
                                  Detail & Ubah
                                </button>
                                {canEditDeleteRanting && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const ok = window.confirm(
                                        `Hapus ranting \"${r.nama}\"?`,
                                      );
                                      if (!ok) return;
                                      try {
                                        const res = await fetch(
                                          `/api/ranting?id=${encodeURIComponent(
                                            r.id,
                                          )}`,
                                          {
                                            method: "DELETE",
                                            credentials: "include",
                                          },
                                        );
                                        if (!res.ok) {
                                          console.error(
                                            "[HomeBase] Gagal hapus ranting",
                                            await res.text(),
                                          );
                                          return;
                                        }
                                        setRantingList((prev) =>
                                          prev.filter((x) => x.id !== r.id),
                                        );
                                        if (selectedRanting.id === r.id) {
                                          setSelectedRanting(null);
                                        }
                                      } catch (e) {
                                        console.error(
                                          "[HomeBase] Error hapus ranting",
                                          e,
                                        );
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-red-500/60 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 size={10} />
                                    Hapus
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Ringkasan per wilayah — otomatis sesuai level */}
          <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <MapPin size={18} className="text-amber-400/80" />
              </div>
              <h2 className="text-sm font-semibold text-white/95">
                Ringkasan per Wilayah
              </h2>
            </div>
            <p className="text-[11px] text-white/50">
              Terfilter otomatis sesuai level login. PP/Superadmin: per
              provinsi. Pengprov: per cabang. Cabang/Ranting: per ranting.
            </p>
            {scope?.is_pp || isSuperadmin ? (
              summaryPerProvinsi.length === 0 ? (
                <p className="text-xs text-white/50">Memuat data provinsi…</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {summaryPerProvinsi.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                    >
                      <span className="font-medium text-white/90 truncate">
                        {p.nama}
                      </span>
                      <span className="flex-shrink-0 text-amber-200/80">
                        {p.cabang} cabang · {p.ranting} ranting
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : summaryPerCabang.length === 0 ? (
              <p className="text-xs text-white/50">Tidak ada data cabang.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {summaryPerCabang.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
                  >
                    <span className="font-medium text-white/90 truncate">
                      {c.nama}
                    </span>
                    <span className="flex-shrink-0 text-amber-200/80">
                      {c.ranting} ranting · {c.anggota} anggota
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: KEANGGOTAAN */}
          <div className="lg:col-span-2 space-y-6">
            {showKeanggotaanBlock && (
              <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <UserCheck size={18} className="text-amber-400/80" />
                  </div>
                  <h2 className="text-sm font-semibold text-white/95">
                    Keanggotaan
                  </h2>
                </div>
                <p className="text-xs text-white/55">
                  Ringkasan anggota per ranting di wilayah Anda.
                </p>
                {anggotaSummaryLoading ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3 transition-colors hover:bg-slate-800/60">
                        <div className="text-amber-100/95 font-semibold text-lg">
                          {anggotaSummary.total_aktif}
                        </div>
                        <div className="text-white/60 mt-1">Anggota aktif</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-800/40 p-3 transition-colors hover:bg-slate-800/60">
                        <div className="text-amber-100/95 font-semibold text-lg">
                          {anggotaSummary.total_nonaktif}
                        </div>
                        <div className="text-white/60 mt-1">
                          Anggota nonaktif
                        </div>
                      </div>
                    </div>
                    {anggotaSummary.items.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        <div className="text-[11px] text-white/50 mt-1">
                          Per ranting
                        </div>
                        {anggotaSummary.items.map((item) => (
                          <div
                            key={item.ranting_id}
                            className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-white/[0.03] border border-transparent hover:border-amber-500/15 text-white/80"
                          >
                            <span className="truncate">
                              {item.ranting_nama}
                            </span>
                            <span className="flex-shrink-0 text-amber-200/90 font-medium">
                              {item.count_aktif}
                              {item.count_nonaktif > 0 && (
                                <span className="text-white/50">
                                  {" "}
                                  / {item.count_nonaktif}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <a
                      href="/dashboard/keanggotaan"
                      className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                    >
                      Buka modul Keanggotaan →
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: UJIAN + EVENT + LAINNYA + KWITANSI */}
          <div className="space-y-6">
            {showEventBlock && (
              <>
                {/* Widget UKT */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <Award size={18} className="text-amber-400/80" />
                    </div>
                    <h2 className="text-sm font-semibold text-white/95">
                      UKT
                    </h2>
                  </div>
                  <p className="text-xs text-white/55">
                    UKT (Ujian Kenaikan Tingkat), Ujian Kyu, Ujian Dan.
                  </p>
                  {uktSummaryLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-xs text-white/70">
                      <div>
                        {uktSummary.tahun_ajaran ? (
                          <span>
                            <span className="text-white/50">Peserta UKT </span>
                            <span className="font-medium text-amber-200/90">
                              {uktSummary.tahun_ajaran.nama}
                            </span>
                            <span className="text-white/50">: </span>
                            <span className="font-semibold text-slate-100">
                              {uktSummary.total_peserta}
                            </span>
                            <span className="text-white/50"> orang</span>
                          </span>
                        ) : (
                          <span className="text-white/50">
                            Belum ada tahun ajaran UKT aktif.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <Link
                    href="/dashboard/ujian"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                  >
                    Buka UKT →
                  </Link>
                </div>
                {/* Widget Event */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-amber-400/80" />
                    <h2 className="text-sm font-medium text-white/90">
                      Event (Gashuku, Kejuaraan)
                    </h2>
                  </div>
                  <p className="text-xs text-white/55">
                    Gashuku, Kejuaraan, Pelatihan, event lainnya.
                  </p>
                  <div className="text-xs text-white/50">
                    Integrasi modul Event.
                  </div>
                  <a
                    href="/dashboard/event"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                  >
                    Buka Event →
                  </a>
                </div>
                {/* Widget Lainnya */}
                <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <Info size={18} className="text-amber-400/80" />
                    </div>
                    <h2 className="text-sm font-semibold text-white/95">
                      Lainnya
                    </h2>
                  </div>
                  <p className="text-xs text-white/55">
                    Pengumuman dan konten lain (opsional).
                  </p>
                </div>
              </>
            )}

            {showKwitansiBlock && (
              <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-amber-500/10 p-2">
                        <CreditCard size={18} className="text-amber-400/80" />
                      </div>
                      <h2 className="text-sm font-semibold text-white/95">
                        Kwitansi Pembayaran
                      </h2>
                    </div>
                    <p className="text-xs text-white/55">
                      Ringkasan aktivitas pembayaran di wilayah Anda. Detail
                      lengkap dan cetak kwitansi ada di modul Keuangan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/70">
                  <div>
                    <div className="text-[11px] text-white/50">
                      Contoh data demo — nantinya bisa diisi dari tabel
                      pembayaran.
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-white/40">
                      Total demo kwitansi
                    </div>
                    <div className="text-lg font-semibold text-slate-100">
                      {payments.length}
                    </div>
                  </div>
                </div>
                <a
                  href="/dashboard/keuangan"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-200/90 hover:text-amber-100 no-underline transition-colors"
                >
                  Buka modul Keuangan untuk kelola kwitansi →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal tambah / ubah ranting */}
      {rantingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60"
          onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ranting-modal-title"
        >
          <div
            className="w-full max-w-md max-h-[90vh] sm:max-h-[85vh] rounded-t-xl sm:rounded-xl border border-white/10 bg-slate-900 shadow-xl text-white flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 flex-shrink-0">
              <h2
                id="ranting-modal-title"
                className="text-sm font-semibold text-teal-200"
              >
                {rantingFormMode === "edit"
                  ? "Detail & ubah ranting"
                  : "Tambah ranting baru"}
              </h2>
              <button
                type="button"
                onClick={() => !rantingFormSaving && setRantingModalOpen(false)}
                className="text-white/60 hover:text-white/90 text-lg leading-none"
                aria-label="Tutup"
              >
                ×
              </button>
            </div>
            <form
              className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1 min-h-0 overscroll-contain"
              style={
                { WebkitOverflowScrolling: "touch" } as React.CSSProperties
              }
              onSubmit={(e) => {
                e.preventDefault();
                handleRantingFormSubmit();
              }}
            >
              {rantingFormError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {rantingFormError}
                </p>
              )}
              {rantingFormMode === "edit" && selectedRanting && (
                <div className="rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 text-[11px] text-white/85 space-y-1">
                  <div className="font-medium text-amber-200/90 mb-1">
                    Ringkasan ranting (lihat & edit di bawah)
                  </div>
                  <div>
                    <span className="text-white/60">Status: </span>
                    <span
                      className={
                        selectedRanting.aktif
                          ? "text-amber-300/90"
                          : "text-white/50 italic"
                      }
                    >
                      {selectedRanting.aktif ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div>
                    Wilayah: Provinsi ID {selectedRanting.province_id ?? "—"},
                    Kab/Kota ID {selectedRanting.regency_id ?? "—"}, Kec ID{" "}
                    {selectedRanting.district_id ?? "—"}
                  </div>
                  <div>
                    <span className="text-white/60">Instagram: </span>
                    {selectedRanting.instagram_url || "—"}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Nama ranting
                </label>
                <input
                  type="text"
                  value={rantingForm.nama}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, nama: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none"
                  placeholder="Nama ranting"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ranting-aktif"
                  checked={rantingForm.aktif}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, aktif: e.target.checked }))
                  }
                  className="rounded border-white/20 text-amber-400 focus:ring-amber-500/30"
                />
                <label
                  htmlFor="ranting-aktif"
                  className="text-xs text-white/80"
                >
                  Aktif
                </label>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Cabang
                </label>
                <div className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/85">
                  {currentCabangName}
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Alamat ranting
                </label>
                <textarea
                  value={rantingForm.alamat}
                  onChange={(e) =>
                    setRantingForm((f) => ({ ...f, alamat: e.target.value }))
                  }
                  className="w-full min-h-[110px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none resize-y"
                  placeholder={`1. Alamat dojo utama, ${currentCabangName}\n2. Catatan akses lokasi...\n3. ...`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama ketua ranting
                  </label>
                  <input
                    type="text"
                    value={rantingForm.ketua_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        ketua_nama: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none"
                    placeholder="Nama ketua"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama sekretaris ranting
                  </label>
                  <textarea
                    value={rantingForm.sekretaris_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        sekretaris_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none resize-y"
                    placeholder="Daftar nama sekretaris ranting..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama bendahara ranting
                  </label>
                  <textarea
                    value={rantingForm.bendahara_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        bendahara_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none resize-y"
                    placeholder="Daftar nama bendahara ranting..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/70 mb-1">
                    Nama pelatih ranting
                  </label>
                  <textarea
                    value={rantingForm.pelatih_nama}
                    onChange={(e) =>
                      setRantingForm((f) => ({
                        ...f,
                        pelatih_nama: e.target.value,
                      }))
                    }
                    className="w-full min-h-[80px] rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none resize-y"
                    placeholder="Daftar nama pelatih ranting..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={rantingForm.instagram_url}
                  onChange={(e) =>
                    setRantingForm((f) => ({
                      ...f,
                      instagram_url: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-amber-500/40 focus:outline-none"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="flex gap-2 pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    !rantingFormSaving && setRantingModalOpen(false)
                  }
                  className="flex-1 min-h-[44px] rounded-lg border border-white/20 px-3 py-2.5 text-xs sm:text-sm text-white/80 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rantingFormSaving}
                  className="flex-1 min-h-[44px] rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white px-3 py-2.5 text-xs sm:text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {rantingFormSaving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
