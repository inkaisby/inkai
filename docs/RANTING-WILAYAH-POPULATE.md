# Panduan Isi Data Wilayah Ranting

Agar dropdown Ranting di ProfileModal Step 3 terfilter by wilayah user (provinsi/kabupaten/kecamatan), perlu:

1. **Jalankan migrasi** (jika belum):
   ```bash
   npx supabase db push
   ```
   Pastikan `20250228000002_ranting_wilayah.sql` sudah dijalankan (menambah kolom di ranting).

---

## Opsi A: Update Ranting Langsung (tanpa provinsi/cabang)

**Gunakan ini jika tabel `provinsi` dan `cabang` belum ada.**

```sql
-- 1. Lihat dulu daftar ranting (ambil id yang mau di-update)
SELECT id, nama FROM public.ranting;

-- 2. Update by nama (contoh: ranting "Dojo Bogor")
UPDATE public.ranting
SET province_id = 32,    -- 32 = Jawa Barat
    regency_id = 3201,   -- 3201 = Kab. Bogor (opsional)
    district_id = 320101 -- 320101 = Kecamatan (opsional)
WHERE nama ILIKE '%bogor%';

-- Atau update SEMUA ranting ke satu provinsi
UPDATE public.ranting
SET province_id = 32
WHERE province_id IS NULL;
```

---

## Opsi B: Via Provinsi/Cabang (jika hirarki sudah ada)

**Gunakan ini jika sudah menjalankan `20250228000000_hirarki_provinsi_cabang_ranting.sql`.**

2. **Isi mapping provinsi (org) ke BPS**:
   ```sql
   -- Contoh: Provinsi INKAI "Jawa Barat" -> BPS province_id 32
   UPDATE public.provinsi
   SET province_id = 32
   WHERE nama ILIKE '%jawa barat%';
   ```

3. **Isi mapping cabang** (opsional):
   ```sql
   UPDATE public.cabang
   SET regency_id = 3201, district_id = 320101
   WHERE nama ILIKE '%bogor%';
   ```

4. **Propagate ke ranting**:
   ```sql
   SELECT populate_ranting_wilayah();
   ```

---

## Verifikasi

```sql
SELECT id, nama, province_id, regency_id, district_id
FROM public.ranting
WHERE province_id IS NOT NULL
LIMIT 10;
```

## Referensi ID BPS Wilayah

- **Provinces**: `GET /api/wilayah/provinces` → `{ id, name }`
- **Regencies**: `GET /api/wilayah/regencies?provinceId=32` → `{ id, name }`
- **Districts**: `GET /api/wilayah/districts?regencyId=3201` → `{ id, name }`

## Alur Filter di Aplikasi

1. User pilih provinsi/kabupaten/kecamatan di Step 2 (alamat)
2. Step 3: `useRantingOptions` kirim `province_id`, `regency_id`, `district_id` ke `/api/ranting`
3. API filter ranting yang `province_id`/`regency_id`/`district_id` cocok
4. Jika hasil kosong → fallback tampilkan semua ranting dalam scope user
