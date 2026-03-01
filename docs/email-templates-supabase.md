# Format Email Template Supabase (Confirm sign up & Reset password)

Format email diubah di **Supabase Dashboard** → **Authentication** → **Emails** → **Templates**. Klik template yang ingin diedit (mis. **Confirm sign up** atau **Reset password**).

## Variabel yang bisa dipakai

| Variabel | Keterangan |
|----------|-------------|
| `{{ .ConfirmationURL }}` | Link lengkap untuk konfirmasi (klik = langsung verifikasi) |
| `{{ .Token }}` | Kode OTP 6 digit (alternatif jika tidak pakai link) |
| `{{ .TokenHash }}` | Token ter-hash (untuk bikin link custom) |
| `{{ .SiteURL }}` | URL aplikasi Anda (dari Auth URL config) |
| `{{ .RedirectTo }}` | URL redirect setelah verifikasi |
| `{{ .Email }}` | Email user |

## 1. Confirm sign up

**Subject** (contoh):
```
Konfirmasi pendaftaran – INKAI
```

**Body** (HTML, contoh rapi):
```html
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #0d9488;">Selamat bergabung</h2>
  <p>Halo,</p>
  <p>Terima kasih telah mendaftar. Silakan konfirmasi alamat email Anda dengan mengklik tombol di bawah.</p>
  <p style="margin: 24px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Konfirmasi email</a>
  </p>
  <p style="color: #64748b; font-size: 14px;">Atau salin link ini ke browser:</p>
  <p style="color: #64748b; font-size: 12px; word-break: break-all;">{{ .ConfirmationURL }}</p>
  <p style="color: #64748b; font-size: 12px;">Jika Anda tidak mendaftar, abaikan email ini.</p>
</div>
```

## 2. Reset password

**Subject** (contoh):
```
Reset password – INKAI
```

**Body** (HTML, contoh rapi):
```html
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #0d9488;">Reset password</h2>
  <p>Halo,</p>
  <p>Kami menerima permintaan untuk mengatur ulang password akun <strong>{{ .Email }}</strong>. Klik tombol di bawah untuk memilih password baru.</p>
  <p style="margin: 24px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Atur ulang password</a>
  </p>
  <p style="color: #64748b; font-size: 14px;">Atau salin link ini ke browser:</p>
  <p style="color: #64748b; font-size: 12px; word-break: break-all;">{{ .ConfirmationURL }}</p>
  <p style="color: #64748b; font-size: 12px;">Link berlaku terbatas. Jika Anda tidak meminta reset, abaikan email ini.</p>
</div>
```

## Langkah di Dashboard

1. Buka **Supabase** → project Anda → **Authentication** → **Emails** → tab **Templates**.
2. Klik **Confirm sign up** (atau **Reset password**).
3. Isi **Subject** dengan subject di atas (atau sesuaikan).
4. Di **Body**, ganti isi dengan HTML di atas (boleh edit teks/warna).
5. Simpan.

Warna `#0d9488` (teal) bisa diganti agar sesuai branding INKAI.
