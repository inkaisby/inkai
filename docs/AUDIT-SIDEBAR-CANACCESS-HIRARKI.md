# Audit: canAccess Secara Hirarki INKAI (Sidebar + MenuList + useMenuCRUD)

## Ringkasan alur

1. **Sumber data menu**: Tabel `menus` (CRUD di Settings → MenuList, useMenuCRUD → API `/api/menus`).
2. **Sumber data user untuk akses**: API `/api/sidebar/menus` mengembalikan `user` + `menus`; Sidebar memfilter menu dengan `canAccessMenu(access, sessionUser)`.
3. **Kontrol akses di Settings**: MenuForm mengatur `superadmin_only`, `required_structural_level`, `required_functional_role`, `context_required`; nilai tersimpan ke `menus` dan dipakai lagi di Sidebar.

## Hirarki evaluasi canAccess (canAccess.ts)

Urutan pengecekan (sudah benar):

1. **Root / Superadmin** → akses penuh (ROOT_EMAIL atau `app_role === "SUPERADMIN"`).
2. **User belum disetujui** (`email_allowed === false`) → hanya menu `dashboard`.
3. **Menu superadmin_only** → non-superadmin tidak boleh.
4. **required_structural_level** → user harus punya minimal satu **structural role aktif** dengan `structural_level >= required_structural_level` (dari `get_user_structural_roles`).
5. **required_functional_role** → user harus punya **functional role aktif** yang `role_name === required_functional_role`.
6. **context_required** → **belum diimplementasi** di `canAccessMenu` (field ada di type, tidak dipakai). Untuk akses kontekstual perlu konteks (mis. `context_id`) di session/request.

## Temuan audit

### 1. functional_roles selalu kosong (kritis)

- **Lokasi**: `app/api/sidebar/menus/route.ts`, `app/api/me/route.ts`.
- **Masalah**: `functional_roles: []` di-hardcode. Menu dengan `required_functional_role` (PENGUJI, WASIT, dll.) **tidak pernah** memenuhi syarat di client.
- **Perbaikan**: Isi `functional_roles` dari tabel `user_functional_roles` (by `user_id`), format `{ role_name: string, active: boolean }[]`. Kolom di DB: `role` → map ke `role_name` untuk canAccess. Untuk menu sidebar bisa dianggap “punya role” jika user punya role aktif di **salah satu** context (agregasi per role).

### 2. context_required tidak dipakai di canAccess

- **Lokasi**: `app/dashboard/components/dashboard/canAccess.ts`.
- **Masalah**: `context_required` ada di `MenuAccess` dan dikirim Sidebar, tapi tidak ada branch di `canAccessMenu`. Akses kontekstual (per event/ujian) tidak diterapkan.
- **Rekomendasi**: Dokumentasikan sebagai “reserved”; implementasi butuh konsep “context saat ini” di session atau request. Untuk sekarang bisa dibiarkan (menu dengan context_required tetap mengandalkan structural/functional saja) atau tambah pengecekan jika context sudah tersedia.

### 3. MenuDetailPanel kolom “Akses” tidak selaras hirarki

- **Lokasi**: `app/dashboard/modules/settings/components/menu/MenuDetailPanel.tsx`.
- **Masalah**: Hanya menampilkan "SUPERADMIN" atau "PUBLIC". Tidak menampilkan `required_structural_level` / `required_functional_role` seperti di MenuList (kolom Akses).
- **Perbaikan**: Tampilkan aturan akses yang sama dengan MenuList: SUPERADMIN, atau STRUKTURAL ≥ N, atau FUNGSIONAL: role, atau PUBLIC.

### 4. Konsistensi structural level (MenuForm vs DB)

- **Lokasi**: `app/dashboard/modules/settings/components/menu/MenuForm.tsx`.
- **Status**: Opsi 1–5 (KOHAL → KETUA_PP) selaras dengan `structural_role_master` dan logika `>=` di canAccess. Tidak ada perubahan wajib.

### 5. useMenuCRUD dan API /api/menus

- **Status**: Create/Update mengirim `required_structural_level`, `required_functional_role`, `context_required`, `superadmin_only` dengan benar. GET sidebar memilih kolom yang sama. RLS/validasi nilai (1–5 untuk level, enum untuk role) bisa ditambah nanti di API.

### 6. Sidebar.tsx

- **Status**: Memakai `canAccessMenu(access, sessionUser)` dengan field yang sesuai; filter `scope === "sidebar"` dan `is_active` benar. Normalisasi `required_structural_level` ke number sudah ada.

## Rangkuman perbaikan yang dilakukan

1. **API `/api/sidebar/menus`**: Query `user_functional_roles` by `user_id`, map ke `functional_roles: { role_name, active }[]` (role dari kolom `role`).
2. **MenuDetailPanel**: Tampilkan akses sama seperti MenuList (SUPERADMIN | STRUKTURAL ≥ N | FUNGSIONAL: role | PUBLIC).
3. **Opsi**: Implementasi `context_required` di canAccess saat “context saat ini” sudah didefinisikan di app.
