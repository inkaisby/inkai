# Audit: Sumber Menu Sidebar (DB only)

**Tanggal:** 24 Februari 2026 (diperbarui: menuConfig dihapus)

## Kondisi saat ini

| Aspek | Sumber | Keterangan |
|-------|--------|------------|
| **Daftar menu** | **DB** | Sidebar memuat menu dari tabel `menus` via API `/api/sidebar/menus`. Tidak ada file `menuConfig.ts` di codebase. |
| **Tampilan** | Tabel `menus` | `id`, `key`, `name`, `icon` (string), `color`, `order_index`, `scope`, `is_active`, `superadmin_only`, `required_structural_level`, dll. |
| **Permission** | `canAccess.ts` + data dari DB | Setiap baris menu dari DB dicek dengan `canAccessMenu(access, sessionUser)`. UNIVERSAL_MENU_KEYS di canAccess.ts untuk menu yang tampil ke semua user. |
| **MenuList (Settings)** | Tabel `menus` | CRUD menu di Pengaturan → Menu; sumber yang sama dengan sidebar. |

**Ringkas:** Urutan, label, dan daftar menu 100% dari tabel `menus`. Perubahan lewat DB atau halaman Settings (Menu).
