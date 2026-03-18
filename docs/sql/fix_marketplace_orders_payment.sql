-- Jika kolom payment_method belum ada (pesanan gagal simpan)
ALTER TABLE public.home_marketplace_orders
  ADD COLUMN IF NOT EXISTS payment_method text;

-- Opsional: nomor WA pusat toko (tombol "hubungi" jika profil penjual kosong)
-- Di .env.local: NEXT_PUBLIC_MARKETPLACE_TOKO_WA=6281234567890
