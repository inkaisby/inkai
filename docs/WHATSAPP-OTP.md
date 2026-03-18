# Verifikasi nomor telepon via WhatsApp (OTP)

## 1. SQL (Supabase)

Jalankan migration `20260319000000_telepon_wa_verify.sql` atau:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telepon_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS telepon_verified_e164 text,
  ADD COLUMN IF NOT EXISTS telepon_wa_otp_hash text,
  ADD COLUMN IF NOT EXISTS telepon_wa_otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS telepon_wa_pending_e164 text;
```

## 2. Set environment variables

Tambahkan **keempat** variabel berikut (nilai asli jangan di-commit ke Git).

### Daftar

| Variabel | Keterangan |
|----------|------------|
| `TWILIO_ACCOUNT_SID` | Dari [Twilio Console](https://console.twilio.com) → Account Info |
| `TWILIO_AUTH_TOKEN` | Token yang sama di halaman Account |
| `TWILIO_WHATSAPP_FROM` | Sandbox: `whatsapp:+14155238886` — production: `whatsapp:+62...` (nomor WABA) |
| `PHONE_OTP_PEPPER` | String acak panjang (≥32 karakter), mis. output `openssl rand -hex 32`. **Wajib di production** untuk hash OTP. |

### Lokal (`.env.local`)

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PHONE_OTP_PEPPER=minimal-32-karakter-acak-jangan-pakai-ini-di-prod
```

Restart `npm run dev` setelah mengubah env.

### Vercel

1. Project → **Settings** → **Environment Variables**
2. Tambah satu per satu variabel di atas (Production + Preview jika perlu)
3. **Redeploy** deployment terakhir agar server membaca env baru

Lihat juga contoh di root: **`.env.example`** (bagian WhatsApp OTP).

### Twilio WhatsApp Sandbox (pengujian)

1. Twilio Console → Messaging → Try WhatsApp.
2. Join sandbox dengan mengirim kode ke nomor Twilio.
3. Hanya nomor yang sudah join yang bisa menerima OTP.

### Production

- Daftarkan WhatsApp Business + template pesan (jika diwajibkan Meta).
- Atur `TWILIO_WHATSAPP_FROM` ke nomor bisnis yang disetujui.

## 3. Alur

1. User isi **Nomor Telepon** (08… atau 628…).
2. **Kirim kode ke WhatsApp** → API menyimpan hash OTP, mengirim pesan via Twilio.
3. User masukkan **6 digit** → **Verifikasi** → `telepon` di DB diselaraskan ke format `08…`, `telepon_verified_e164` diset.

Jika user mengganti nomor di form menjadi nomor lain, status tampilan “terverifikasi” hilang sampai verifikasi ulang.

## 4. Endpoint

- `POST /api/profile/verify-phone/send` — body `{ "telepon": "081234567890" }`
- `POST /api/profile/verify-phone/confirm` — body `{ "telepon": "081234567890", "code": "123456" }`

Rate limit: ±5 kirim kode per 15 menit per user.
