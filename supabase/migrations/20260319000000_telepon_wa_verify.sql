-- Verifikasi nomor telepon via WhatsApp (OTP hash di server)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telepon_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS telepon_verified_e164 text,
  ADD COLUMN IF NOT EXISTS telepon_wa_otp_hash text,
  ADD COLUMN IF NOT EXISTS telepon_wa_otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS telepon_wa_pending_e164 text;

COMMENT ON COLUMN public.profiles.telepon_verified_e164 IS 'Nomor terverifikasi format 62xxxxxxxxxx';

-- Tampilan "terverifikasi" hanya jika telepon saat ini (dinormalisasi) = telepon_verified_e164
