# Wireframe Dashboard per Level — PP, Pengprov, Cabang, Ranting

Dashboard HomeBaseModule menyesuaikan tampilan dan filter berdasarkan level user.

---

## Pemisahan Widget (bukan digabung)

| Widget | Isi |
|--------|-----|
| **Ujian** | UKT (Ujian Kenaikan Tingkat), Ujian Kyu, Ujian Dan |
| **Event** | Gashuku, Kejuaraan, Pelatihan, event lainnya |
| **Lainnya** | Pengumuman, dan konten lain (opsional) |

Ujian, Event, dan Lainnya tampil sebagai widget terpisah — tidak digabung dalam satu blok.

---

## Ringkasan Scope per Level

| Level | Jabatan | Scope | Filter Dropdown |
|-------|---------|-------|-----------------|
| **PP** | Pengurus Pusat (level 5) | Seluruh Indonesia | Provinsi → Cabang → Ranting |
| **Pengprov** | Pengurus Provinsi (level 4) | Satu/beberapa provinsi | Cabang → Ranting |
| **Cabang** | Ketua Cabang (level 3) | Satu/beberapa cabang | Ranting |
| **Ranting** | Ketua Ranting (level 2) | Satu/beberapa ranting | — (atau pilih ranting jika punya banyak) |

---

## 1. PP (Pengurus Pusat)

**Scope:** Lihat semua provinsi, cabang, ranting. Filter hierarkis: Provinsi → Cabang → Ranting.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD — PP                                                                      │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard — Seluruh Indonesia              [Provinsi ▼] [Cabang ▼] [🔄]        │ │
│  │  Ringkasan nasional. Filter untuk drill-down per wilayah.                       │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  KPI — NASIONAL (atau terfilter)                                                │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │ │
│  │  │Provinsi  │ │ Cabang   │ │ Ranting  │ │ Anggota  │ │ Ujian    │ │ Event    │ │ │
│  │  │   34     │ │   120    │ │   450    │ │ 12.500   │ │   45     │ │   20     │ │ │
│  │  │ Aktif    │ │ Aktif    │ │ Aktif    │ │ Aktif    │ │ UKT      │ │ Aktif    │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │  PER PROVINSI (ringkasan)            │ │  PER CABANG (jika filter provinsi)    │  │
│  │  • Jawa Timur ......... 45 cabang    │ │  • Cabang A ......... 12 ranting     │  │
│  │  • Jawa Barat ......... 38 cabang   │ │  • Cabang B ......... 8 ranting      │  │
│  │  • DKI Jakarta ........ 22 cabang   │ │  • Cabang C ......... 15 ranting     │  │
│  │  ...                                 │ │  ...                                 │  │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  TABEL RANTING (dengan kolom Provinsi, Cabang) — pagination, search              │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐          │
│  │  UJIAN (UKT, Kyu)   │ │  EVENT (Gashuku,    │ │  LAINNYA            │          │
│  │  UKT periode ...    │ │  Kejuaraan, dll)    │ │  Pengumuman, dll     │          │
│  │  Peserta nasional   │ │  Event aktif        │ │  (opsional)          │          │
│  │  [Buka UKT →]       │ │  [Buka Event →]     │ │                      │          │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Filter PP:**
- **Provinsi:** Semua / Jawa Timur / Jawa Barat / ...
- **Cabang:** Semua / (daftar cabang di provinsi terpilih)
- **Ranting:** Semua / (daftar ranting di cabang terpilih)

---

## 2. Pengprov (Pengurus Provinsi)

**Scope:** Lihat provinsi sendiri + cabang + ranting di bawahnya. Filter: Cabang → Ranting.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD — PENGPROV                                                                 │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard — Jawa Timur                   [Semua ▼] [Cabang ▼] [🔄]             │ │
│  │  Ringkasan provinsi Anda. Filter per cabang/ranting.                            │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  KPI — PROVINSI                                                                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │ │
│  │  │ Cabang   │ │ Ranting  │ │ Anggota  │ │ Ujian    │ │ Event    │             │ │
│  │  │   45     │ │   180    │ │  4.200   │ │   12     │ │    5     │             │ │
│  │  │ Aktif    │ │ Aktif    │ │ Aktif    │ │ UKT      │ │ Aktif    │             │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘             │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │  KEUANGGOTAAN per Cabang             │ │  UJIAN (UKT, Kyu)                     │  │
│  │  • Cabang Surabaya .... 1.200        │ │  UKT periode Maret 2026              │  │
│  │  • Cabang Malang ...... 800         │ │  Peserta: 85 orang                    │  │
│  │  • Cabang Jember ...... 650         │ │  [Buka UKT →]                         │  │
│  │  ...                                 │ └─────────────────────────────────────┘  │
│  └─────────────────────────────────────┘ ┌─────────────────────────────────────┐  │
│                                          │  EVENT (Gashuku, Kejuaraan, dll)     │  │
│                                          │  Event aktif: 5                       │  │
│                                          │  [Buka Event →]                       │  │
│                                          └─────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  TABEL RANTING (kolom: Nama, Cabang, Anggota, Status) — filter by cabang         │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Filter Pengprov:**
- **Scope:** Semua / Cabang A / Cabang B / ...
- **Ranting:** (jika filter cabang) Semua / Ranting X / Ranting Y

---

## 3. Cabang (Ketua Cabang)

**Scope:** Lihat cabang sendiri + ranting di bawahnya. Filter: Ranting.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD — CABANG                                                                  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard — Cabang Kota Surabaya         [Semua ▼] [Ranting ▼] [🔄]            │ │
│  │  Ringkasan cabang Anda. Filter per ranting.                                     │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  KPI — CABANG                                                                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │ │
│  │  │ Ranting  │ │ Anggota  │ │ Ujian    │ │ Event    │ │ Kwitansi │             │ │
│  │  │   12     │ │  1.200   │ │    3     │ │    2     │ │    —     │             │ │
│  │  │ Aktif    │ │ Aktif    │ │ UKT      │ │ Aktif    │ │ Terbaru  │             │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘             │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │  KEUANGGOTAAN per Ranting           │ │  UJIAN (UKT, Kyu)                    │  │
│  │  • Ranting Gading ......... 85      │ │  UKT Maret 2026                       │  │
│  │  • Ranting Darmo ........... 120    │ │  Peserta: 25 orang                    │  │
│  │  • Ranting Rungkut ........ 95     │ │  [Buka UKT →]                          │  │
│  │  ...                                 │ └─────────────────────────────────────┘  │
│  └─────────────────────────────────────┘ ┌─────────────────────────────────────┐  │
│                                          │  EVENT (Gashuku, Kejuaraan, dll)     │  │
│                                          │  Event aktif: 2                      │  │
│                                          │  [Buka Event →]                      │  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  TABEL RANTING (kolom: Nama, Anggota, Ketua, Aksi) — tambah ranting jika level 3│ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Filter Cabang:**
- **Scope:** Semua / Ranting Gading / Ranting Darmo / ...

---

## 4. Ranting (Ketua Ranting)

**Scope:** Hanya ranting sendiri (atau beberapa jika punya multi-ranting). Filter minimal.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD — RANTING                                                                 │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard — Ranting Gading               [Ranting ▼] [🔄]  (jika multi)        │ │
│  │  Ringkasan ranting Anda.                                                         │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  KPI — RANTING                                                                  │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │ │
│  │  │ Anggota  │ │ Kyu/Dan  │ │ Ujian    │ │ Event    │ │ Kwitansi │             │ │
│  │  │   85     │ │   72     │ │    1     │ │    0     │ │    —     │             │ │
│  │  │ Aktif    │ │ Tercatat │ │ UKT      │ │ Aktif    │ │ Terbaru  │             │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘             │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │  KEUANGGOTAAN                       │ │  UJIAN (UKT, Kyu)                     │  │
│  │  85 aktif, 3 nonaktif               │ │  UKT Maret 2026                       │  │
│  │  [Buka modul Keanggotaan →]         │ │  Peserta: 8 orang                      │  │
│  └─────────────────────────────────────┘ │  [Buka UKT →]                         │  │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐  │
│  │  EVENT (Gashuku, Kejuaraan, dll)     │ │  LAINNYA (Pengumuman, dll)           │  │
│  │  Event aktif: 0                      │ │  (opsional)                           │  │
│  │  [Buka Event →]                      │ │                                       │  │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘  │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────┐ │
│  │  INFO RANTING — Nama, Alamat, Ketua, Kontak (read-only atau edit)                │ │
│  └────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Filter Ranting:**
- Jika satu ranting: tidak ada dropdown (atau disabled "Ranting Gading")
- Jika multi-ranting: pilih Ranting A / Ranting B

---

## Matriks Widget per Level

| Widget | PP | Pengprov | Cabang | Ranting |
|--------|----|----------|--------|---------|
| KPI Provinsi | ✅ | — | — | — |
| KPI Cabang | ✅ | ✅ | — | — |
| KPI Ranting | ✅ | ✅ | ✅ | — |
| KPI Anggota | ✅ | ✅ | ✅ | ✅ |
| KPI Ujian (UKT, Kyu) | ✅ | ✅ | ✅ | ✅ |
| KPI Event (Gashuku, Kejuaraan) | ✅ | ✅ | ✅ | ✅ |
| Widget Ujian | ✅ | ✅ | ✅ | ✅ |
| Widget Event | ✅ | ✅ | ✅ | ✅ |
| Widget Lainnya (Pengumuman, dll) | ✅ | ✅ | ✅ | ✅ |
| Ringkasan per Provinsi | ✅ | — | — | — |
| Ringkasan per Cabang | ✅ | ✅ | — | — |
| Ringkasan per Ranting | ✅ | ✅ | ✅ | ✅ (single) |
| Tabel Ranting (CRUD) | ✅ | ✅ | ✅ | ❌ (info saja) |
| Tombol Tambah Ranting | ✅ | ❌ | ✅ (jika level 3) | ❌ |

---

## Perbedaan Filter Dropdown

```
PP:        [Provinsi: Semua ▼] [Cabang: — ▼] [Ranting: — ▼]
           (cascade: pilih provinsi → cabang terisi → pilih cabang → ranting terisi)

Pengprov:  [Semua / Cabang A / Cabang B ▼] [Ranting: — ▼]

Cabang:    [Semua / Ranting A / Ranting B ▼]

Ranting:   [Ranting Gading] (fixed, atau dropdown jika multi)
```

---

## Alur Data per Level

```
PP:        API pakai scope.is_pp → return all
           Filter: ?provinsi_id=... &cabang_id=... &ranting_ids=...

Pengprov:  API pakai scope.provinsi_ids
           Filter: ?cabang_id=... &ranting_ids=...

Cabang:    API pakai scope.cabang_ids
           Filter: ?ranting_ids=...

Ranting:   API pakai scope.ranting_ids
           Filter: (optional) ?ranting_ids=... jika multi
```
