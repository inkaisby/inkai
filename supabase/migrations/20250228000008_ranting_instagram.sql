-- Instagram per ranting/wilayah: link akun Instagram tiap dojo
ALTER TABLE public.ranting
  ADD COLUMN IF NOT EXISTS instagram_url text;

COMMENT ON COLUMN public.ranting.instagram_url IS 'URL akun Instagram ranting/dojo (contoh: https://instagram.com/inkai_surabaya)';
