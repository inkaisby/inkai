# Cara Mengubah Hirarki INKAI

Hirarki INKAI di app: **PP → Provinsi (Pengprov) → Cabang → Ranting → Kohai**. Ada dua hal yang bisa diubah.

**Mengubah role/hirarki user lewat UI:** Login lewat UI sebagai **Superadmin**, lalu buka **Dashboard → Settings** → pilih user → panel Role/Hirarki. Hanya akun dengan `app_role = SUPERADMIN` yang bisa akses Settings dan mengatur jabatan struktural user lain.

**Cara login sebagai Superadmin:** Akun harus punya `app_role = 'SUPERADMIN'` di tabel `public.profiles` (dan `auth.users` untuk login). Setelah daftar/ada user, set lewat SQL: `UPDATE public.profiles SET app_role = 'SUPERADMIN' WHERE user_id = 'uuid-user-atau-pakai-email';` Lalu login di UI dengan email + password akun tersebut.

---

## 1. Data organisasi (Provinsi, Cabang, Ranting)

**Lokasi data:** Tabel `public.provinsi`, `public.cabang`, `public.ranting` (relasi: ranting.cabang_id → cabang, cabang.provinsi_id → provinsi).

**Cara mengubah:** Lewat **SQL** di Supabase (Dashboard → SQL Editor). Belum ada UI CRUD di app untuk tambah/edit/hapus provinsi/cabang/ranting.

### Tambah Provinsi
```sql
INSERT INTO public.provinsi (nama, aktif) VALUES ('Jawa Barat', true);
```

### Tambah Cabang (per provinsi)
```sql
-- Ganti PROVINSI_UUID dengan id provinsi dari SELECT * FROM public.provinsi;
INSERT INTO public.cabang (nama, provinsi_id, aktif) 
VALUES ('Cabang Bogor', 'PROVINSI_UUID', true);
```

### Tambah Ranting (atau hubungkan ke cabang)
```sql
-- Ranting baru
INSERT INTO public.ranting (nama, cabang_id, aktif) 
VALUES ('Dojo Bogor', 'CABANG_UUID', true);

-- Atau: hubungkan ranting yang sudah ada ke cabang
UPDATE public.ranting SET cabang_id = 'CABANG_UUID' WHERE id = 'RANTING_UUID';
```

### Edit / nonaktifkan
```sql
UPDATE public.provinsi SET nama = 'Nama Baru', aktif = false WHERE id = '...';
UPDATE public.cabang SET nama = 'Nama Baru', aktif = false WHERE id = '...';
UPDATE public.ranting SET nama = 'Nama Baru', aktif = false WHERE id = '...';
```

**Panduan isi wilayah ranting (province_id BPS, dll.):** lihat `docs/RANTING-WILAYAH-POPULATE.md`.

---

## 2. Role struktural per user (siapa Ketua Ranting/Cabang/Pengprov mana)

**Lokasi di menu UI:**

1. **Sidebar** → klik **Settings** (hanya tampil dan bisa diklik jika login sebagai Superadmin).
2. Di halaman Settings, pastikan mode **Users** (tombol "Users — Akun & Profil") aktif.
3. Di panel kiri **Daftar Pengguna**, klik satu user (email).
4. Di panel kanan, klik tab **Role Management** (di samping Profil, Ubah Password, Log Aktivitas).

Di panel **Role Management** Anda bisa:
- Memilih **role struktural** (dari `structural_role_master`: KOHAl, KETUA_RANTING, KETUA_CABANG, KETUA_PENGPROV, KETUA_PP, dll.).
- Memilih **organisasi** (Ranting / Cabang / Provinsi) sesuai level role.
- Menambah atau menghapus jabatan struktural user.

**Lokasi kode:** `app/dashboard/modules/settings/components/roles/RoleManagementPanel.tsx`.  
Data diambil dari API `/api/provinsi`, `/api/cabang`, `/api/ranting` dan RPC `get_user_structural_roles` / `set_user_structural_role`.

---

## 3. Definisi level/nama role (KOHAl, KETUA_RANTING, …)

**Lokasi data:** Tabel `public.structural_role_master` (id, role_name, structural_level, organization_type).

**Cara mengubah:** Lewat **SQL** di Supabase. Mengubah atau menambah baris di sini mengubah opsi yang muncul di panel Role (RoleManagementPanel).

```sql
-- Lihat role yang ada
SELECT * FROM public.structural_role_master ORDER BY structural_level;

-- Tambah role baru (contoh)
INSERT INTO public.structural_role_master (role_name, structural_level, organization_type)
VALUES ('SEKRETARIS_RANTING', 2, 'ranting');
```

Level umum: 1 = Kohai/ranting, 2 = Ranting, 3 = Cabang, 4 = Pengprov, 5 = PP.

---

## Ringkasan

| Yang diubah | Di mana | Cara |
|-------------|---------|------|
| Daftar Provinsi / Cabang / Ranting | DB: `provinsi`, `cabang`, `ranting` | SQL di Supabase (belum ada UI) |
| User A jadi Ketua Ranting X, User B jadi Ketua Cabang Y | Settings → User → Role / Hirarki | UI RoleManagementPanel |
| Nama/level role (KOHAl, KETUA_RANTING, …) | DB: `structural_role_master` | SQL di Supabase |

Referensi desain lengkap: `docs/DESAIN-HIRARKI-WILAYAH-INKAI.md` dan `app/dashboard/modules/settings/hirarki`.

---

## Jika muncul "Tidak ada data"

### 1. Daftar Pengguna (panel kiri Settings) kosong

- Pastikan Anda **login dengan akun yang `app_role = SUPERADMIN`** di tabel `profiles`. Kalau belum:  
  `UPDATE public.profiles SET app_role = 'SUPERADMIN' WHERE user_id = 'uuid-akun-anda';`
- Pastikan ada **pengguna terdaftar** di `auth.users` (minimal akun Anda sendiri). Daftar pengguna diambil dari Supabase Auth; jika project masih kosong, daftar akan kosong.

### 2. Tab Role Management: dropdown "Pilih Role" kosong

Tabel **`structural_role_master`** harus berisi role (KOHAl, KETUA_RANTING, …). Migrasi `20250227100000_add_sekretaris_bendahara_structural_roles.sql` hanya menambah Sekretaris/Bendahara. Untuk role dasar, jalankan di SQL Editor:

```sql
-- Role dasar hirarki (skip jika sudah ada)
INSERT INTO public.structural_role_master (role_name, structural_level, organization_type)
SELECT v.role_name, v.structural_level, v.organization_type
FROM (VALUES
  ('KOHAl', 1, 'KARATE'),
  ('KETUA_RANTING', 2, 'KARATE'),
  ('KETUA_CABANG', 3, 'KARATE'),
  ('KETUA_PENGPROV', 4, 'KARATE'),
  ('KETUA_PP', 5, 'KARATE')
) AS v(role_name, structural_level, organization_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.structural_role_master m WHERE m.role_name = v.role_name
);
```

Lalu jalankan migrasi Sekretaris/Bendahara jika belum (`supabase db push` atau salin isi `20250227100000_add_sekretaris_bendahara_structural_roles.sql`).

### 3. Tab Role Management: dropdown Ranting/Cabang/Provinsi kosong

Tabel **`provinsi`**, **`cabang`**, dan **`ranting`** harus berisi data. Lihat bagian **1. Data organisasi** di atas: tambah minimal satu Provinsi, satu Cabang, dan satu Ranting (atau hubungkan ranting yang sudah ada ke cabang). Tanpa itu, dropdown di Role Management akan kosong.
