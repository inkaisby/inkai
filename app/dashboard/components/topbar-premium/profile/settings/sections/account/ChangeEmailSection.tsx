"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

import { changeEmail, reAuth } from "../../services/authService";
import { useToast } from "../../ui";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function ChangeEmailSection() {

  const toast = useToast();

  const [currentEmail, setCurrentEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  /* ===============================
   * Load email & pending email
   * =============================== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;

      setCurrentEmail(user.email ?? "");

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const pending =
        (meta?.email_change as string | undefined) ??
        (meta?.new_email as string | undefined) ??
        null;

      setPendingEmail(pending);
    });
  }, []);

  // dianggap sama hanya jika user sudah mengetik
  const isSameEmail = email.trim() !== "" && email === currentEmail;

  /* ===============================
   * Submit logic (dipanggil SETELAH confirm)
   * =============================== */
  async function submit() {
    setLoading(true);

    // Re-auth
    const re = await reAuth(currentEmail, password);
    if (re.error) {
      setLoading(false);
      toast.show({
        message: "Password salah",
        type: "error",
      });
      return;
    }

    // Change email
    const { error } = await changeEmail(email);
    setLoading(false);

    if (error) {
      toast.show({
        message: error.message,
        type: "error",
      });
      return;
    }

    toast.show({
      message: "Email verifikasi dikirim ke alamat baru",
      type: "success",
    });

    setPendingEmail(email);
    setEmail("");
    setPassword("");
  }

  /* ===============================
   * Button click validation
   * =============================== */
  function handleClick() {
    if (!email.trim()) {
      toast.show({
        message: "Email baru wajib diisi",
        type: "error",
      });
      return;
    }

    if (!password.trim()) {
      toast.show({
        message: "Password saat ini wajib diisi",
        type: "error",
      });
      return;
    }

    if (isSameEmail) {
      toast.show({
        message: "Email baru sama dengan email saat ini",
        type: "error",
      });
      return;
    }

    setConfirmOpen(true);
  }

  return (
    <section>
      <h3 className="text-cyan-300 text-sm mb-3">Akun</h3>

      <p className="text-xs text-white/40 mb-2">
        Isi hanya jika ingin mengganti email.
      </p>

      {/* Email saat ini */}
      <div className="text-xs text-white/50 mb-1">
        Email saat ini:
        <span className="ml-1 text-cyan-300">{currentEmail}</span>
      </div>

      {/* Pending email */}
      {pendingEmail && (
        <div className="text-xs text-yellow-400 mb-2">
          Menunggu verifikasi:
          <span className="ml-1">{pendingEmail}</span>
        </div>
      )}

      {/* Input email baru */}
      <input
        type="email"
        placeholder="Masukkan email baru"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="
          w-full rounded-md
          bg-black/40 border border-cyan-500/30
          px-3 py-2 text-white mb-2
        "
      />

      {/* Password re-auth */}
      <input
        type="password"
        placeholder="Password saat ini"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="
          w-full rounded-md
          bg-black/40 border border-cyan-500/30
          px-3 py-2 text-white mb-2
        "
      />

      <button
        onClick={handleClick}
        disabled={loading}
        className="
          mt-1 text-sm
          text-cyan-300 hover:text-cyan-200
          disabled:opacity-40 disabled:cursor-not-allowed
        "
      >
        {loading ? "Memproses..." : "Ubah Email"}
      </button>

      {/* ===============================
       * Confirm Dialog
       * =============================== */}
      <ConfirmDialog
        open={confirmOpen}
        title="Ubah Email"
        message="Email akan berubah setelah verifikasi. Lanjutkan?"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submit();
        }}
      />
    </section>
  );
}
