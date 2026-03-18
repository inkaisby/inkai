-- Metode pembayaran pada pesanan marketplace
ALTER TABLE public.home_marketplace_orders
  ADD COLUMN IF NOT EXISTS payment_method text;

COMMENT ON COLUMN public.home_marketplace_orders.payment_method IS 'Mis. transfer_bank, ewallet, cod, other';
