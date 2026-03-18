-- Pesanan checkout marketplace (pembeli → tercatat untuk tindak lanjut penjual/admin)
CREATE TABLE IF NOT EXISTS public.home_marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  shipping_address text,
  items jsonb NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_buyer ON public.home_marketplace_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_created ON public.home_marketplace_orders(created_at DESC);

COMMENT ON TABLE public.home_marketplace_orders IS 'Checkout marketplace: ringkasan item + data pembeli';

ALTER TABLE public.home_marketplace_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_orders_insert_own" ON public.home_marketplace_orders;
CREATE POLICY "marketplace_orders_insert_own"
  ON public.home_marketplace_orders FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "marketplace_orders_select_own" ON public.home_marketplace_orders;
CREATE POLICY "marketplace_orders_select_own"
  ON public.home_marketplace_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

GRANT SELECT, INSERT ON public.home_marketplace_orders TO authenticated;
