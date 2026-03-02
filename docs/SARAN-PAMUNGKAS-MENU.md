# Saran pamungkas: Menu universal & konten beda per level/fungsional

## Yang sudah diterapkan

### 1. Menu tampil ke semua user (tanpa syarat wilayah)

Empat menu ini **muncul di sidebar untuk semua user** (kecuali yang `email_allowed = false` — mereka hanya lihat Dashboard):

| Menu           | Key           | Keterangan              |
|----------------|---------------|--------------------------|
| Dashboard      | `dashboard`   | Ringkasan, shortcut      |
| Keanggotaan    | `keanggotaan` | Data keanggotaan         |
| Ujian          | `ujian`       | Ujian KYU / audit ujian  |
| Event & Pertandingan | `event` | Event, pertandingan, kejuaraan |

- **Tidak** ada filter wilayah untuk **tampil/tidak** menu ini.
- Aturan di kode: `app/dashboard/components/dashboard/canAccess.ts` → konstanta **`UNIVERSAL_MENU_KEYS`**.
- Di **DB (tabel `menus`)** pastikan ada baris dengan `key` = `dashboard`, `keanggotaan`, `ujian`, `event`, `scope = 'sidebar'`, dan `is_active` tidak false. Nilai `superadmin_only`, `required_structural_level`, `required_functional_role` **diabaikan** untuk keempat key ini (tetap tampil ke semua user).

### 2. Isi konten berbeda per level dan fungsional

**Prinsip:** Siapa pun boleh **masuk** ke halaman (menu universal), tapi **data yang ditampilkan** beda-beda menurut:

- **Level struktural** (ranting, cabang, pengprov, PP)
- **Role fungsional** (penguji, ADM pertandingan, dll.)
- **Wilayah/scope** (ranting_id, cabang_id, dll.)

Cara yang disarankan:

1. **Di setiap module** (Dashboard, Keanggotaan, Ujian, Event):
   - Ambil konteks user: `getUserScope(admin, user.id)`, `profiles.ranting_id`, `structural_roles`, `functional_roles`.
   - **Filter data** (list, laporan, form) berdasarkan scope/wilayah dan role:
     - Kohai/ranting: data ranting sendiri.
     - Cabang: data cabang (semua ranting di cabang).
     - Pengprov/PP: data lebih luas (provinsi / nasional).
   - Jangan andalkan “sembunyikan menu” untuk membatasi data; andalkan **filter data di API dan di halaman**.

2. **API yang dipakai module** (mis. keanggotaan, ujian, event):
   - Terima header/session user.
   - Resolve scope (ranting/cabang/pengprov/PP) dari user.
   - Query hanya data yang masuk dalam scope tersebut (mis. `ranting_id IN (...)` atau `cabang_id = ...`).

3. **Role fungsional** (contoh: penguji ujian, ADM pertandingan):
   - Di halaman Ujian/Event: cek `functional_roles` (dan konteks event/ujian jika ada).
   - Tampilkan blok/aksi berbeda (mis. tombol nilai, input hasil) hanya jika user punya role yang sesuai.

---

## Ringkas

- **Menu:** Dashboard, Keanggotaan, Ujian, Event & Pertandingan → **tampil ke semua user** (tanpa filter wilayah) via `UNIVERSAL_MENU_KEYS`.
- **Konten:** Tetap **berbeda per user** dengan filter di masing-masing module berdasarkan level struktural, role fungsional, dan wilayah (scope).

Dengan pola ini, navigasi seragam untuk semua user, sementara isi tiap halaman tetap aman dan sesuai jabatan/wilayah.
