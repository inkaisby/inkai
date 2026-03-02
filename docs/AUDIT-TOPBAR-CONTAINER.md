# Audit: TopbarContainer.tsx

**File:** `app/dashboard/components/topbar-premium/TopbarContainer.tsx`  
**Tanggal:** 2025-02-28

---

## 1. Ringkasan

TopbarContainer adalah komponen utama topbar dashboard. Memuat: tombol toggle sidebar, judul dinamis, dropdown konteks (scope), notifikasi, connection pulse, dan avatar menu. Dibungkus oleh NotificationProvider; ScopeProvider ada di layout.

---

## 2. Struktur & Dependensi

| Bagian | Status |
|--------|--------|
| NotificationProvider | ✅ Wrap di TopbarContainer |
| ScopeProvider | ✅ Di layout.tsx (parent) |
| useScope | ✅ contextOptions, selectedContext, setSelectedContext, loading |
| usePathname | ✅ Untuk title dinamis |

---

## 3. Temuan Audit

### 3.1 ESLint: setState dalam useEffect

```tsx
useEffect(() => setMounted(true), []);
```

**Masalah:** Rule `react-hooks/set-state-in-effect` melarang setState sinkron di dalam effect (cascading renders).

**Konteks:** Pola `mounted` umum dipakai untuk hydration-safe (hindari mismatch SSR/client). Setelah mount, `Header` di-switch ke `motion.header` agar animasi Framer Motion hanya jalan di client.

**Rekomendasi:**
- **Opsi A:** Tetap pakai pola ini, tambah `// eslint-disable-next-line react-hooks/set-state-in-effect` dengan komentar alasan (hydration).
- **Opsi B:** Ganti ke `useSyncExternalStore` atau `useEffect` + `requestAnimationFrame` agar setState tidak sinkron.
- **Opsi C:** Selalu render `motion.header` dan set `initial={false}` saat SSR (lewat `typeof window === "undefined"`), sehingga tidak perlu state `mounted`.

---

### 3.2 State `showNotification` vs Context `open`

```tsx
const [showNotification, setShowNotification] = useState(false);
// ...
<NotificationNode onClick={() => setShowNotification(true)} />
{showNotification && <NotificationPanel />}
```

**Masalah:** Ada dua sumber kebenaran:
- `showNotification` → mengontrol mount NotificationPanel (lazy)
- `open` (dari NotificationContext) → mengontrol visibilitas panel

Saat klik NotificationNode: `openNotifications()` (set `open=true`) dan `onClick` (set `showNotification=true`). Panel ter-mount dan terlihat. Saat tutup: `closeNotifications()` set `open=false`, panel hilang, tapi komponen tetap ter-mount karena `showNotification` tidak pernah di-reset.

**Rekomendasi:** 
- **Opsi A:** Hapus `showNotification`, selalu mount `<NotificationPanel />`. Panel sudah mengontrol diri lewat `open` + AnimatePresence. Lazy mount hanya menghemat mount awal, dampaknya kecil.
- **Opsi B:** Simpan pola lazy mount, sinkronkan: saat `open` jadi false, set `showNotification(false)` lewat callback di context (lebih rumit, biasanya tidak perlu).

---

### 3.3 Title Dinamis (berdasarkan pathname)

```tsx
const title = useMemo(() => {
  const key = segments[1];
  return key.replace(/-/g, " ").toUpperCase();
}, [pathname]);
```

**Catatan:** Title dari key path (e.g. "SETTINGS", "KEANGGOTAAN"). Jika ingin label Indonesia (e.g. "Pengaturan"), bisa lookup nama dari data menu yang sudah di-load (e.g. dari context/API sidebar) by key; tidak ada file menuConfig (sudah dihapus, menu dari DB).

---

### 3.4 Aksesibilitas Dropdown Konteks

```tsx
<select
  value={selectedContext}
  onChange={(e) => setSelectedContext(e.target.value)}
  className="..."
>
```

**Masalah:** Tidak ada `id`, `aria-label`, atau label terhubung. Screen reader tidak punya konteks.

**Rekomendasi:** Tambah `aria-label="Pilih konteks tampilan"` atau `<label htmlFor="scope-select">` + `id="scope-select"` pada select.

---

### 3.5 Kode yang Dikomentari

```tsx
//import ProfileModal from "./profile/ProfileModal";
//import SettingsModalProvider from "./profile/settings/modal/SettingsModalProvider";
```

**Rekomendasi:** Hapus jika tidak dipakai, atau pindah ke file terpisah jika rencananya akan dipakai. Hindari dead code di production.

---

### 3.6 Tombol Toggle Sidebar

```tsx
onClick={() =>
  window.dispatchEvent(new CustomEvent("toggle-sidebar", { detail: true }))
}
```

**Status:** ✅ Pola event-based bagus untuk decoupling. Pastikan Sidebar subscribe ke `toggle-sidebar`.

---

### 3.7 HUD (Notifikasi, Connection, Avatar)

```tsx
<div className="fixed top-3 right-6 z-50 flex items-center gap-5">
```

**Catatan:** Posisi fixed bisa menutupi konten di layar kecil. Pertimbangkan responsive (mis. `right-4` di mobile) jika diperlukan.

---

## 4. Rekomendasi Prioritas

| Prioritas | Item | Usaha |
|-----------|------|-------|
| Tinggi | 3.1 setState dalam effect | Tambah eslint-disable dengan komentar, atau refactor |
| Sedang | 3.3 Title dari label menu | Lookup nama by key dari data menu (sidebar/context) jika perlu |
| Sedang | 3.4 aria-label pada select | Satu baris |
| Rendah | 3.2 showNotification | Simplify ke always-mount jika mau |
| Rendah | 3.5 Hapus import komentar | Bersihkan dead code |

---

## 5. Checklist Perbaikan

- [ ] Handle ESLint set-state-in-effect (disable atau refactor)
- [ ] (Opsional) Title dari label menu by key
- [ ] aria-label pada select konteks
- [ ] Hapus atau aktifkan ProfileModal/SettingsModalProvider
- [ ] (Opsional) Simplify showNotification
