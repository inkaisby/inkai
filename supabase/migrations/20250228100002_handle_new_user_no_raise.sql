-- Trigger jangan gagalkan signup: jika insert profiles error, tetap RETURN new agar user terdaftar.
-- Profil nanti dibuat lewat fallback di /api/me.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := COALESCE(trim(new.email), '');
BEGIN
  INSERT INTO public.profiles (id, user_id, email)
  VALUES (gen_random_uuid(), new.id, v_email);
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    RETURN new;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user (signup tetap lanjut): %', SQLERRM;
    RETURN new;
END;
$$;
