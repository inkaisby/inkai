# Audit: Sidebar Dashboard

## Ringkasan

Sidebar dashboard **statis** (layout tetap) dan **mengikuti data menu di DB** (tabel `menus`). Tidak ada daftar menu hardcode di frontend untuk sidebar.

---

## Alur data

1. **Frontend** (`app/dashboard/components/dashboard/Sidebar.tsx`)
   - Layout tetap: logo INKAI di atas, di bawahnya `<nav>` berisi link vertikal.
   - Saat mount, memanggil **GET `/api/sidebar/menus`** (dengan credentials).
   - Hanya menampilkan item yang dikembalikan API (sudah filter `scope = sidebar`, `is_active = true`).
   - Filter RBAC di client: `canAccessMenu(menu, sessionUser)` (superadmin_only, structural_level, functional_role, email_allowed).
   - Urutan tampil mengikuti **`order_index`** dari DB.

2. **API** (`app/api/sidebar/menus/route.ts`)
   - Butuh user login (session).
   - Baca **tabel `menus`**:
     - `scope = 'sidebar'`
     - `is_active = true`
     - Urutan: `order_index` ascending.
   - Kolom yang dikirim: `id, key, name, icon, color, order_index, is_active, scope, superadmin_only, required_structural_level, required_functional_role, context_required`.
   - Response juga berisi **user** (email, app_role, structural_roles, functional_roles, scope) untuk RBAC di client.

3. **DB**
   - Sumber kebenaran daftar menu: **tabel `menus`**.
   - Untuk sidebar: isi `scope = 'sidebar'`, set `is_active = true`, atur `order_index` untuk urutan.
   - Icon: nama icon Lucide (string), e.g. `LayoutDashboard`, `Users`. Sidebar memetakan ke komponen via `lucide-react`.

---

## Yang statis vs yang dari DB

| Aspek              | Sumber        | Keterangan                                      |
|--------------------|---------------|-------------------------------------------------|
| Layout             | Statis        | Logo + nav vertikal, lebar collapse/expand     |
| Daftar item menu   | DB (`menus`)  | Hanya item dengan scope=sidebar, is_active=true |
| Urutan item        | DB            | Kolom `order_index`                             |
| Nama / icon / warna| DB            | Kolom `name`, `icon`, `color`                   |
| RBAC (siapa lihat) | DB + user     | `superadmin_only`, `required_structural_level`, dll. |

---

## File terkait

- **Sidebar UI:** `app/dashboard/components/dashboard/Sidebar.tsx`
- **API menu sidebar:** `app/api/sidebar/menus/route.ts`
- **RBAC menu:** `app/dashboard/components/dashboard/canAccess.ts`
- **Sumber menu:** Hanya DB (tabel `menus`) via API; tidak ada file config menu di codebase.

---

## Mengubah menu sidebar

1. Di **Supabase**: Table Editor → **menus**.
2. Pastikan ada baris dengan `scope = 'sidebar'`, `is_active = true`.
3. Atur `order_index` (0, 1, 2, …) untuk urutan tampil.
4. Isi `key` (untuk route, e.g. `dashboard` → `/dashboard`, lainnya → `/dashboard/{key}`), `name`, `icon` (nama Lucide), `color`, dan kolom RBAC sesuai kebutuhan.
5. Tidak perlu ubah kode frontend untuk menambah/mengurangi/ mengurutkan item sidebar; cukup ubah data di tabel `menus`.

---

## Menu universal (tampil semua user, tanpa wilayah)

Menu berikut **selalu tampil** ke semua user yang sudah disetujui (`email_allowed = true`), tanpa memandang wilayah, level struktural, atau role fungsional:

- **dashboard**
- **keanggotaan**
- **ujian**
- **event** (Event & Pertandingan)

Aturan ini di kode: `canAccess.ts` → `UNIVERSAL_MENU_KEYS`. Untuk user yang belum disetujui (`email_allowed = false`) hanya Dashboard yang tampil.

**Isi konten** di dalam tiap halaman (Dashboard, Keanggotaan, Ujian, Event) **tetap bisa berbeda** per user sesuai level dan role fungsional: filter data di masing-masing module (mis. pakai `getUserScope`, `structural_level`, `functional_roles`) agar tiap user hanya lihat data yang sesuai wilayah/jabatannya.
