-- Kwitansi per ranting: token untuk QR, scan, cetak ulang (sama seperti kwitansi perorangan).
CREATE TABLE IF NOT EXISTS public.ukt_kwitansi_ranting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tahun_ajaran_id uuid NOT NULL REFERENCES public.ukt_tahun_ajaran(id) ON DELETE CASCADE,
  ranting_id uuid NOT NULL REFERENCES public.ranting(id) ON DELETE CASCADE,
  token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  no_kwitansi text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tahun_ajaran_id, ranting_id)
);

CREATE INDEX IF NOT EXISTS idx_ukt_kwitansi_ranting_token ON public.ukt_kwitansi_ranting(token);
CREATE INDEX IF NOT EXISTS idx_ukt_kwitansi_ranting_tahun_ranting ON public.ukt_kwitansi_ranting(tahun_ajaran_id, ranting_id);

COMMENT ON TABLE public.ukt_kwitansi_ranting IS 'Kwitansi per ranting UKT; token untuk QR scan & cetak ulang';

ALTER TABLE public.ukt_kwitansi_ranting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read ukt_kwitansi_ranting" ON public.ukt_kwitansi_ranting FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read ukt_kwitansi_ranting anon" ON public.ukt_kwitansi_ranting FOR SELECT TO anon USING (true);
GRANT SELECT ON public.ukt_kwitansi_ranting TO authenticated;
GRANT SELECT ON public.ukt_kwitansi_ranting TO anon;
GRANT ALL ON public.ukt_kwitansi_ranting TO service_role;
