# Wireframe Dashboard — Fase 1

Dashboard dinamis HomeBaseModule. Fase 1: Filter scope, tombol refresh, loading skeleton.

---

## Layout Utama

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  TOPBAR (existing)                                                                   │
│  [☰] Home                    [nama · jabatan] [🔔] [👤]                              │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (existing)                                                                   │
│  Home                                                                                 │
│  Dashboard                                                                            │
│  Keanggotaan                                                                          │
│  ...                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD — MAIN CONTENT                                      │
│                                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  HEADER BAR                                                                    │  │
│  │  Dashboard                    [Filter Scope ▼] [🔄 Refresh]   [Wilayah label]  │  │
│  │  Ringkasan wilayah, ranting, keanggotaan...                                    │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  KPI CARDS (4 kolom)                                                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │  │
│  │  │ Ranting     │ │ Anggota     │ │ Event &     │ │ Kwitansi    │              │  │
│  │  │ Aktif       │ │             │ │ Ujian      │ │             │              │  │
│  │  │     12      │ │     45      │ │     8      │ │     —       │              │  │
│  │  │ Dari 15     │ │ Aktif       │ │ Peserta    │ │ Terbaru     │              │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘              │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐   │
│  │  WIDGET: KEUANGGOTAAN                │ │  WIDGET: EVENT & UJIAN                │   │
│  │  ┌───────────────────────────────┐  │ │  ┌───────────────────────────────┐  │   │
│  │  │ 👥 Keanggotaan                 │  │ │  │ 🏆 Event & Ujian               │  │   │
│  │  │ Ringkasan anggota per ranting  │  │ │  │ UKT periode...                 │  │   │
│  │  │                                │  │ │  │                                │  │   │
│  │  │ [45] Aktif  [3] Nonaktif       │  │ │  │ Peserta: 8 orang               │  │   │
│  │  │                                │  │ │  │                                │  │   │
│  │  │ Per ranting:                   │  │ │  │ [Buka UKT →]                    │  │   │
│  │  │ • Ranting A .............. 20  │  │ │  └───────────────────────────────┘  │   │
│  │  │ • Ranting B .............. 15  │  │ └─────────────────────────────────────┘   │
│  │  │ • Ranting C .............. 10  │  │                                         │   │
│  │  │                                │  │ ┌─────────────────────────────────────┐   │
│  │  │ [Buka modul Keanggotaan →]     │  │ │  WIDGET: KWITANSI                    │   │
│  │  └───────────────────────────────┘  │ │  Terbaru, daftar pembayaran...        │   │
│  └─────────────────────────────────────┘ └─────────────────────────────────────┘   │
│                                                                                       │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │  WIDGET: RANTING (daftar + aksi)                                                │  │
│  │  Tabel ranting, filter, tambah/edit                                              │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Komponen Baru Fase 1

### 1. Header Bar — Filter & Refresh

```
┌────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                          [Semua ▼] [🔄]     │
│  Ringkasan wilayah, ranting, keanggotaan...         Kota Surabaya      │
└────────────────────────────────────────────────────────────────────────┘
```

| Elemen | Deskripsi |
|--------|-----------|
| **Filter Scope** | Dropdown: "Semua" / "Ranting: Gading" / "Ranting: X" / "Cabang: Y". Sumber: ScopeContext. |
| **Tombol Refresh** | Icon 🔄, klik → refetch semua data (ranting, anggota, UKT). |
| **Wilayah label** | Badge/teks konteks saat ini (mis. "Kota Surabaya", "Semua wilayah"). |

---

### 2. Loading Skeleton — Per Widget

**KPI Card skeleton:**
```
┌─────────────────┐
│ ░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░       │
│ ░░░░░░░░░░░░░░░ │
│ ░░░░░           │
└─────────────────┘
```

**Widget Keanggotaan skeleton:**
```
┌───────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░  ░░░░░░░  ░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└───────────────────────────────┘
```

---

### 3. Alur Filter Scope

```
User pilih "Ranting: Gading" di dropdown
         │
         ▼
selectedContext = "uuid-gading"
         │
         ▼
HomeBaseModule refetch:
  • /api/ranting?ranting_ids=uuid-gading
  • /api/ukt/anggota-aktif/summary?ranting_ids=uuid-gading
  • /api/ukt/summary?ranting_ids=uuid-gading (jika didukung)
         │
         ▼
Tampilan: hanya data Ranting Gading
```

---

### 4. Alur Refresh

```
User klik tombol Refresh
         │
         ▼
Set loading = true (skeleton tampil)
         │
         ▼
Parallel fetch semua API
         │
         ▼
Set loading = false, update state
         │
         ▼
Widget tampil data terbaru
```

---

## Responsif (Mobile)

```
┌─────────────────────────┐
│  Dashboard              │
│  [Filter ▼] [🔄]        │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ Ranting Aktif  12 │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Anggota        45 │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Event            8 │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Keanggotaan       │  │
│  │ (widget full)     │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

- KPI: 1 kolom (stack vertikal)
- Widget: full width
- Filter + Refresh: satu baris, bisa wrap

---

## Checklist Implementasi Fase 1

- [ ] Dropdown filter scope di header Dashboard (pakai ScopeContext)
- [ ] Refetch data saat selectedContext berubah
- [ ] Kirim ranting_ids ke API saat filter aktif
- [ ] Tombol refresh manual
- [ ] Loading skeleton per widget (ranting, anggota, event, kwitansi)
- [ ] Wilayah label menyesuaikan filter
