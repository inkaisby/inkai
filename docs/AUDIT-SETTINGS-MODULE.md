# Audit: Settings Module

## Ringkasan

- **Route:** `app/dashboard/settings/page.tsx` → import **SettingsView** dari `../modules/settings/components/SettingsView`.
- **SettingsModule.tsx** tidak di-import oleh route mana pun; isinya duplikat lama dari **EmailList** dengan sumber data dan props yang berbeda.

---

## 1. SettingsModule.tsx (Dead code / Duplikat)

**Lokasi:** `app/dashboard/modules/settings/SettingsModule.tsx`

**Temuan:**

| Aspek | SettingsModule.tsx (saat audit) | components/EmailList.tsx (yang dipakai) |
|-------|----------------------------------|----------------------------------------|
| Export | `EmailList` | `EmailList` |
| Sumber data | Langsung `supabase.from("profiles").select("id, email, nama, cabang, app_role")` | API `GET /api/users` (scope, Superadmin, auth.users) |
| Props | `selectedEmail: string \| null`, `onSelectEmail(email)` | `selectedUser: UserRow \| null`, `onSelectUser(user: UserRow)` |
| UserRow | `id, email, nama, cabang, app_role` | Lengkap: `user_id`, `email`, `nama`, `status`, `ranting_id`, dll. |
| Kolom `cabang` | Di-select dari `profiles` | Di API sekarang hardcode `"-"` (relasi villages dihapus); dari API |

**Masalah:**

1. **Tidak dipakai:** Halaman Settings mengimpor **SettingsView**, yang mengimpor **EmailList** dari `./EmailList` (components), bukan dari SettingsModule.
2. **Ketidaksesuaian:** SettingsView memakai `selectedUser` (UserRow) dan `onSelectUser`; SettingsModule mengekspor komponen dengan `selectedEmail` / `onSelectEmail` sehingga tidak cocok jika dipakai.
3. **Tabel profiles:** Kolom `cabang` mungkin tidak ada di schema; query direct ke `profiles` bisa error atau menyesatkan.
4. **Naming:** File bernama SettingsModule tapi isinya komponen EmailList — membingungkan.

**Rekomendasi:** Hapus duplikat EmailList dari SettingsModule. Jadikan SettingsModule sebagai **entry point** yang hanya re-export SettingsView (atau hapus file dan update dokumentasi). **Sudah diperbaiki:** SettingsModule.tsx diganti menjadi re-export.

---

## 2. Alur yang benar (setelah perbaikan)

```
app/dashboard/settings/page.tsx
  → SettingsView (components/SettingsView.tsx)
      → EmailList (components/EmailList.tsx)  — data dari /api/users, selectedUser/onSelectUser
      → ProfilePanel, ChangePasswordPanel, RoleManagementPanel, MenuList, DatabaseView, …
```

- **Daftar user:** dari **GET /api/users** (Superadmin check, auth.users + profiles merge, scope).
- **Pilihan user:** state `selectedUser` (UserRow) di SettingsView; panel kanan pakai `selectedUser` untuk Profil, Password, Role Management, Log.

---

## 3. Lain-lain

- **selectedEmail di page.tsx:** Dipakai untuk Permission (load/save permissions by email). Bisa saja sinkron dengan selectedUser.email jika nanti ingin disatukan.
- **ROOT_EMAIL / SUPERADMIN_EMAIL:** Ada di SettingsView (ROOT_EMAIL env) dan di settings/page (SUPERADMIN_EMAIL hardcode). Konsistenkan ke env atau satu konstanta jika perlu.

---

## 4. Tindakan yang dilakukan

- **SettingsModule.tsx:** Isi lama (duplikat EmailList) diganti dengan re-export `SettingsView` agar file berfungsi sebagai entry module dan tidak ada dead code duplikat.
