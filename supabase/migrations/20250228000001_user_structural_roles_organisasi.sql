-- Fase 2: Jabatan user terikat organisasi (ranting/cabang/provinsi)
-- Menambah kolom organisasi di user_structural_roles + update RPC

-- ============================================================
-- 1. Kolom organisasi di user_structural_roles
-- Asumsi: tabel user_structural_roles sudah ada (id, user_id, role_id, active)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_structural_roles' AND column_name = 'ranting_id'
  ) THEN
    ALTER TABLE public.user_structural_roles
    ADD COLUMN ranting_id uuid REFERENCES public.ranting(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_structural_roles' AND column_name = 'cabang_id'
  ) THEN
    ALTER TABLE public.user_structural_roles
    ADD COLUMN cabang_id uuid REFERENCES public.cabang(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_structural_roles' AND column_name = 'provinsi_id'
  ) THEN
    ALTER TABLE public.user_structural_roles
    ADD COLUMN provinsi_id uuid REFERENCES public.provinsi(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_structural_roles_ranting ON public.user_structural_roles(ranting_id);
CREATE INDEX IF NOT EXISTS idx_user_structural_roles_cabang ON public.user_structural_roles(cabang_id);
CREATE INDEX IF NOT EXISTS idx_user_structural_roles_provinsi ON public.user_structural_roles(provinsi_id);

-- ============================================================
-- 2. RPC: get_user_structural_roles (return + org columns & names)
-- Mengembalikan role + organisasi (untuk scope & tampilan UI)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_structural_roles(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  role_name text,
  structural_level integer,
  organization_type text,
  active boolean,
  ranting_id uuid,
  cabang_id uuid,
  provinsi_id uuid,
  ranting_nama text,
  cabang_nama text,
  provinsi_nama text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    usr.id,
    m.role_name,
    m.structural_level,
    m.organization_type,
    COALESCE(usr.active, true),
    usr.ranting_id,
    usr.cabang_id,
    usr.provinsi_id,
    r.nama AS ranting_nama,
    c.nama AS cabang_nama,
    p.nama AS provinsi_nama
  FROM user_structural_roles usr
  JOIN structural_role_master m ON m.id = usr.role_id
  LEFT JOIN ranting r ON r.id = usr.ranting_id
  LEFT JOIN cabang c ON c.id = usr.cabang_id
  LEFT JOIN provinsi p ON p.id = usr.provinsi_id
  WHERE usr.user_id = p_user_id
  ORDER BY m.structural_level, m.role_name;
$$;

-- ============================================================
-- 3. RPC: add_user_structural_role (dengan organisasi opsional)
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_user_structural_role(
  p_user_id uuid,
  p_role_id uuid,
  p_ranting_id uuid DEFAULT NULL,
  p_cabang_id uuid DEFAULT NULL,
  p_provinsi_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO user_structural_roles (user_id, role_id, active, ranting_id, cabang_id, provinsi_id)
  VALUES (p_user_id, p_role_id, true, p_ranting_id, p_cabang_id, p_provinsi_id)
  RETURNING user_structural_roles.id INTO v_id;
  RETURN v_id;
END;
$$;
