-- Status alur pesanan marketplace
ALTER TABLE public.home_marketplace_orders
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'menunggu';

ALTER TABLE public.home_marketplace_orders
  DROP CONSTRAINT IF EXISTS home_marketplace_orders_status_check;
ALTER TABLE public.home_marketplace_orders
  ADD CONSTRAINT home_marketplace_orders_status_check
  CHECK (status IN ('menunggu', 'diproses', 'dikirim', 'selesai', 'dibatalkan'));

COMMENT ON COLUMN public.home_marketplace_orders.status IS 'Alur: menunggu → diproses → dikirim → selesai (atau dibatalkan)';
