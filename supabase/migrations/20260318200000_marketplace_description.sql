-- Deskripsi singkat produk marketplace (katalog Home + halaman Marketplace)
ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.home_marketplace.description IS 'Deskripsi opsional produk (tampil di katalog)';
