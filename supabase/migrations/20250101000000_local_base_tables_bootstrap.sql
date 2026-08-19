-- Local dev bootstrap: base tables that the rest of the migrations ALTER/seed
-- but never CREATE. In the hosted (production) project these tables were created
-- manually via the SQL Editor before the migration files existed, so a
-- from-scratch `supabase db reset` / `supabase start` used to fail.
--
-- This migration is fully idempotent (CREATE TABLE IF NOT EXISTS) and only
-- defines the *base* columns. Columns added by later migrations are intentionally
-- omitted here so their guarded ALTER statements still apply cleanly. Because
-- everything uses IF NOT EXISTS, running this against a database that already has
-- these tables (e.g. production) is a no-op.
--
-- Cross-table foreign keys are intentionally NOT declared here to avoid ordering
-- issues (referenced tables are created by later migrations); the columns are
-- kept as plain uuid/integer.

-- ============================================================
-- profiles: data anggota + akun. profiles.id is an independent UUID
-- (FK to auth.users was dropped in 20250307000003); profiles.user_id -> auth.users.
-- Later migrations add: structural_level, structural_role, deleted_at, updated_at,
-- nomor, status, dan, dashboard_layout, ktp/akta/kk paths, telepon_wa_* columns.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  nama text,
  nik text,
  telepon text,
  jenis_kelamin text,
  tanggal_lahir date,
  nama_ayah text,
  nama_ibu text,
  pekerjaan_ortu text,
  alamat text,
  province_id integer,
  regency_id integer,
  district_id integer,
  village_id text,
  ranting_id uuid,
  avatar_path text,
  app_role text DEFAULT 'USER',
  email_allowed boolean DEFAULT true,
  profile_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ============================================================
-- menus: item sidebar/RBAC. Seeded by the seed_menu_* migrations
-- (INSERT ... ON CONFLICT (key)), so `key` must be unique.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  color text,
  order_index integer DEFAULT 0,
  is_active boolean DEFAULT true,
  scope text,
  superadmin_only boolean DEFAULT false,
  required_structural_level integer,
  required_functional_role text,
  context_required boolean DEFAULT false
);

-- ============================================================
-- ranting: dojo/unit terkecil. Later migrations add
-- province_id/regency_id/district_id and instagram_url.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ranting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  aktif boolean DEFAULT true,
  cabang_id uuid
);

-- ============================================================
-- events: notifikasi per user. Later migration adds `link`.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  module text,
  detail jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);

-- ============================================================
-- user_structural_roles: jabatan struktural user.
-- Later migration (20250228000001) adds ranting_id/cabang_id/provinsi_id.
-- role_id references structural_role_master (created by a later migration),
-- so no FK is declared here.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_structural_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid,
  active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_structural_roles_user_id ON public.user_structural_roles(user_id);

-- ============================================================
-- user_functional_roles: peran fungsional user (SEKRETARIS, BENDAHARA, ...).
-- Later migration (20250308000002) adds context_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_functional_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_functional_roles_user_id ON public.user_functional_roles(user_id);
