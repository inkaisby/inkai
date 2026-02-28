# Audit: NotificationPanel & Sistem Notifikasi Aktivitas

**File:** `app/dashboard/components/topbar-premium/components/NotificationPanel.tsx`  
**Tanggal:** 2025-02-28

---

## 0. Update: Anti-Spam & Filter (2025-02-28)

- **Migrasi** `20250228000003_events_debounce.sql`: Fungsi `insert_event_debounced(user_id, type, title, interval_seconds)` — insert hanya jika belum ada event type yang sama untuk user dalam N detik.
- **RPC save_profile**: Ganti insert langsung ke `events` dengan:
  ```sql
  PERFORM insert_event_debounced(p_user_id, 'profile.updated', 'Profil diperbarui', 60);
  ```
- **NotificationPanel**: Filter event dengan `user_id` null (safety).
- **Event user_id null**: Jangan insert event tanpa user_id; event tersebut tidak muncul untuk user manapun.

---

## 1. Ringkasan Kondisi Saat Ini

| Aspek | Status |
|-------|--------|
| **Sumber data** | Tabel `events` (user_id, type, title, created_at, read_at) |
| **Realtime** | ✅ Subscribe INSERT via `useRealtimeNotification` |
| **Mark as read** | ✅ Semua di-mark read saat panel dibuka |
| **Insert events** | ❌ **Tidak ada kode yang insert ke `events`** → panel kemungkinan kosong |

---

## 2. Temuan Audit

### 2.1 Tidak Ada Sumber Event

NotificationPanel dan useRealtimeNotification sudah siap, tapi **tidak ada modul/API yang insert ke tabel `events`**. Tabel kemungkinan kosong.

### 2.2 user_activity_logs vs events

- **user_activity_logs**: dipakai untuk audit admin (action, module, detail). Ada migrasi dari `user_login_logs`.
- **events**: dipakai untuk notifikasi user (title, read_at). Saat ini tidak diisi dari mana pun.

### 2.3 Mark-as-Read Terlalu Agresif

```tsx
await supabase
  .from("events")
  .update({ read_at: new Date().toISOString() })
  .eq("user_id", user.id)
  .is("read_at", null);
```

Semua event user langsung di-mark read begitu panel dibuka. Tidak ada opsi "baca per item".

### 2.4 Limit 20

Hanya 20 event terakhir yang diambil. Untuk user aktif, riwayat lama tidak terlihat.

### 2.5 Tidak Ada Link ke Konteks

Event hanya punya `title` dan `type`. Tidak ada `link` atau `entity_id` untuk navigasi ke halaman terkait.

### 2.6 Tipe Event Tidak Terstruktur

`type` berupa string bebas. Tidak ada enum atau mapping ke label/ikon.

---

## 3. Saran Pamungkas: Sistem Notifikasi Aktivitas Lengkap

### 3.1 Arsitektur yang Disarankan

```
[Modul/API] → insert_event() → tabel events
                                    ↓
                    Realtime (INSERT) → useRealtimeNotification
                                    ↓
                    NotificationPanel (baca + tampilkan)
```

### 3.2 Langkah Implementasi

#### A. Migrasi: Pastikan Schema `events`

```sql
-- Jika belum ada, buat tabel events
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,           -- login, profile_update, anggota_create, dll
  title text NOT NULL,
  module text,                  -- auth, keanggotaan, siswa, user, settings, dll
  detail jsonb,                 -- { entity_id, entity_type, ... }
  link text,                    -- /dashboard/keanggotaan/123
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX idx_events_user_created ON events(user_id, created_at DESC);
CREATE INDEX idx_events_user_unread ON events(user_id) WHERE read_at IS NULL;

-- RLS (sesuaikan jika beda)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own" ON events FOR SELECT USING (user_id = auth.uid());
```

#### B. Lib/Helper: `app/lib/events/insertEvent.ts`

```ts
// Helper untuk insert event (dipanggil dari API/server)
export async function insertEvent(
  admin: SupabaseClient,
  payload: {
    user_id: string;
    type: string;
    title: string;
    module?: string;
    detail?: Record<string, unknown>;
    link?: string;
  }
) {
  await admin.from("events").insert({
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    module: payload.module ?? null,
    detail: payload.detail ?? null,
    link: payload.link ?? null,
  });
}
```

#### C. Titik Insert Event (Checklist)

| Lokasi | Event Type | Title Contoh |
|--------|------------|--------------|
| LoginModal (success) | `login_success` | Berhasil masuk ke akun |
| Register (success) | `register_success` | Akun baru berhasil dibuat |
| ProfileModal (save) | `profile_update` | Profil diperbarui |
| Reset password (success) | `password_reset` | Password berhasil direset |
| Keanggotaan: create | `anggota_create` | Anggota baru: [nama] |
| Keanggotaan: update | `anggota_update` | Anggota diperbarui: [nama] |
| Keanggotaan: kyu/pelatihan | `kyu_update` / `pelatihan_update` | Kyu/Pelatihan diperbarui |
| User create (admin) | `user_create` | User baru: [email] |
| Settings: menu CRUD | `menu_create` / `menu_update` | Menu diperbarui |
| Settings: role/jabatan | `role_update` | Jabatan diperbarui |
| Siswa: create/update | `siswa_create` / `siswa_update` | Data siswa diperbarui |
| Absensi, Jadwal, Penilaian, Keuangan | Sesuai aksi | [Modul]: [aksi] |

#### D. Integrasi di Login (Contoh)

Setelah login sukses, panggil API atau RPC:

```ts
// Di LoginModal, setelah onSuccess
await fetch("/api/events", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "login_success",
    title: "Berhasil masuk ke akun",
    module: "auth",
  }),
});
```

Atau buat RPC `insert_event` di Supabase, dipanggil dari client (perlu RLS INSERT).

#### E. API Route: `app/api/events/route.ts`

```ts
// POST: Insert event untuk user yang login (server-side, aman)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, title, module, detail, link } = body ?? {};

  if (!type || !title) {
    return NextResponse.json({ message: "type dan title wajib" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  await admin.from("events").insert({
    user_id: user.id,
    type: String(type),
    title: String(title),
    module: module ?? null,
    detail: detail ?? null,
    link: link ?? null,
  });

  return NextResponse.json({ ok: true });
}
```

Modul client memanggil `POST /api/events` setelah aksi sukses.

#### F. Perbaikan NotificationPanel (Opsional)

1. **Link per event**: Jika `link` ada, jadikan title bisa diklik → `router.push(link)`.
2. **Ikon per type**: Mapping `type` → ikon (login=LogIn, profile=User, anggota=IdCard, dll).
3. **Mark read per item**: Tambah tombol "Tandai dibaca" per event, update `read_at` untuk id tersebut.
4. **Pagination / load more**: Tombol "Muat lebih banyak" untuk event lama.
5. **Filter**: Tab "Semua" / "Belum dibaca".

---

## 4. Prioritas Implementasi

| Prioritas | Item | Usaha |
|-----------|------|-------|
| **P0** | Migrasi schema events (jika belum) | 1 migrasi |
| **P0** | API POST /api/events | 1 route |
| **P0** | Insert event di LoginModal (success) | 1 baris |
| **P0** | Insert event di ProfileModal (save) | 1 baris |
| **P1** | Insert di Keanggotaan CRUD | Beberapa titik |
| **P1** | Insert di User create, Settings | Beberapa titik |
| **P2** | Link klik, ikon per type | UI |
| **P2** | Mark read per item, load more | UI |

---

## 5. Ringkasan

**Masalah utama:** Tabel `events` tidak diisi oleh aplikasi, sehingga NotificationPanel kosong.

**Solusi:** Tambah helper/API `insertEvent`, lalu panggil dari setiap titik aksi penting (login, profil, keanggotaan, user, settings, dll). Realtime dan UI NotificationPanel sudah siap; yang kurang hanya pengisian data.
