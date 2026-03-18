-- Kategori produk marketplace (filter katalog)
ALTER TABLE public.home_marketplace
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_home_marketplace_category ON public.home_marketplace(category)
  WHERE category <> '';

COMMENT ON COLUMN public.home_marketplace.category IS 'Kategori: Seragam, Sabuk, Perlengkapan, dll.';
