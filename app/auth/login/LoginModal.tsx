"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

const ID_USERNAME = "login-username";
const ID_PASSWORD = "login-password";

export default function LoginModal({
  onSuccess,
  onClose,
}: {
  onSuccess?: () => void;
  onClose?: () => void;
}) {
  const loginIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // ===== RESTORE EMAIL + AUTO FOCUS =====
  useEffect(() => {
    const remember = localStorage.getItem("inkai:remember");
    const savedEmail = localStorage.getItem("inkai:last_email");

    if (remember === "1" && savedEmail) {
      setUsername(savedEmail);

      // tunggu render selesai lalu fokus ke password
      setTimeout(() => {
        passwordRef.current?.focus();
      }, 0);
    } else {
      loginIdRef.current?.focus();
    }
  }, []);

  const handleLogin = async () => {
    if (loading) return;

    setLoading(true);
    setErrorMsg("");

    try {
      if (!username || !password) {
        throw new Error("EMPTY_CREDENTIALS");
      }

      let email = username;

      // ===== USERNAME → EMAIL (RPC) =====
      if (!username.includes("@")) {
        const { data, error } = await supabase.rpc("get_email_by_username", {
          p_username: username,
        });

        if (error || !data) {
          throw new Error("INVALID_CREDENTIALS");
        }

        email = data;
      }

      // ===== AUTH LOGIN =====
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        const isEmailNotConfirmed =
          error?.message?.toLowerCase().includes("email not confirmed") ||
          error?.message?.toLowerCase().includes("email_not_confirmed");
        if (isEmailNotConfirmed) {
          setErrorMsg("Email belum dikonfirmasi. Cek inbox atau kirim ulang link aktivasi di bawah.");
          setEmailNotConfirmed(email);
          setResendSuccess(false);
          setLoading(false);
          return;
        }
        throw new Error("INVALID_CREDENTIALS");
      }

      // ===== REFRESH SESSION =====
      await supabase.auth.refreshSession();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const appRole = session?.user?.app_metadata?.app_role;
      if (!appRole) {
        throw new Error("ROLE_MISSING");
      }

      // ===== REMEMBER EMAIL =====
      if (rememberMe) {
        localStorage.setItem("inkai:last_email", email);
        localStorage.setItem("inkai:remember", "1");
      } else {
        localStorage.removeItem("inkai:last_email");
        localStorage.setItem("inkai:remember", "0");
      }

      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "";

      setErrorMsg(
        message === "ROLE_MISSING"
          ? "Akun belum memiliki hak akses. Hubungi administrator."
          : message === "EMPTY_CREDENTIALS"
            ? "Email/Username dan Password wajib diisi."
            : "Email / Username atau Password salah.",
      );
      setEmailNotConfirmed(null);

      // ===== LOGIN LOG (NON-BLOCKING) =====
      try {
        await supabase.rpc("insert_login_log", {
          p_status: "FAILED",
          p_failure_reason: message || "UNKNOWN",
          p_device: navigator.userAgent,
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResendSuccess(false);
    handleLogin();
  };

  const handleResendActivation = async () => {
    if (!emailNotConfirmed || resendLoading) return;
    setResendLoading(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailNotConfirmed,
      });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        setErrorMsg(
          msg.includes("rate limit") || msg.includes("rate_limit")
            ? "Batas pengiriman email tercapai. Coba lagi dalam 1 jam, atau cek inbox/spam untuk link konfirmasi."
            : error.message || "Gagal mengirim ulang. Coba lagi nanti.",
        );
        return;
      }
      setResendSuccess(true);
      setErrorMsg("");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="inkai-overlay">
      <div className="inkai-card">
        <header className="inkai-header">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inkai-back"
              aria-label="Kembali"
            >
              ← Kembali
            </button>
          )}
          <Image
            src="/logo/inkai-logo.png"
            alt="INKAI"
            width={88}
            height={88}
            className="inkai-logo"
          />
          <h1 className="inkai-title">LOGIN SYSTEM</h1>
          <p className="inkai-subtitle">Masuk ke akun Anda</p>
        </header>

        <form className="inkai-form" onSubmit={onSubmit} noValidate>
          <label htmlFor={ID_USERNAME} className="sr-only">
            Email atau Username
          </label>
          <input
            ref={loginIdRef}
            id={ID_USERNAME}
            className="inkai-input"
            type="text"
            placeholder="Email atau Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setEmailNotConfirmed(null);
              setResendSuccess(false);
            }}
            autoComplete="username"
            disabled={loading}
            aria-invalid={!!errorMsg}
            aria-describedby={errorMsg ? "login-error" : undefined}
          />

          <div className="inkai-password">
            <label htmlFor={ID_PASSWORD} className="sr-only">
              Password
            </label>
            <input
              ref={passwordRef}
              id={ID_PASSWORD}
              className="inkai-input"
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={!!errorMsg}
              aria-describedby={errorMsg ? "login-error" : undefined}
            />

            <button
              type="button"
              className="pwd-toggle"
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
              aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="inkai-options">
            <label className="inkai-remember" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Ingat saya</span>
            </label>

            <a href="/auth/reset-password" className="inkai-forgot">
              Lupa password?
            </a>
          </div>

          {errorMsg && (
            <div id="login-error" className="inkai-error" role="alert">
              {errorMsg}
            </div>
          )}

          {emailNotConfirmed && (
            <div className="inkai-resend">
              <button
                type="button"
                onClick={handleResendActivation}
                disabled={resendLoading}
                className="inkai-resend-btn"
              >
                {resendLoading ? "Mengirim..." : "Kirim ulang email aktivasi"}
              </button>
              {resendSuccess && (
                <p className="inkai-resend-ok">Email aktivasi terkirim. Cek inbox (dan folder spam) Anda.</p>
              )}
            </div>
          )}

          <button type="submit" className="inkai-button" disabled={loading}>
            {loading ? "Memproses..." : "Login"}
          </button>

          <p className="inkai-register">
            <span className="inkai-register-text">Belum punya akun? </span>
            <Link href="/auth/register" className="inkai-register-cta">
              Buat akun
            </Link>
          </p>

          <p className="inkai-admin">
            <span className="inkai-admin-text">Hubungi admin: </span>
            <a href="tel:081331053100" className="inkai-admin-cta">
              081331053100
            </a>
          </p>
        </form>
      </div>

      <style jsx>{`
        .inkai-overlay {
          position: fixed;
          inset: 0;
          display: grid;
          place-items: center;
          background: radial-gradient(transparent, #000 70%);
          z-index: 50;
        }
        .inkai-card {
          position: relative;
          width: 520px;
          max-width: calc(100vw - 32px);
          padding: 28px 32px 32px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid rgba(0, 255, 255, 0.35);
          box-shadow:
            0 0 0 1px rgba(0, 255, 255, 0.15) inset,
            0 0 40px rgba(0, 255, 255, 0.25);
          backdrop-filter: blur(6px);
        }
        .inkai-back {
          position: absolute;
          left: 16px;
          top: 16px;
          background: transparent;
          border: none;
          color: #9ff;
          cursor: pointer;
          font-size: 14px;
          text-decoration: underline;
        }
        .inkai-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 4px;
        }
        .inkai-logo {
          width: 88px;
          height: 88px;
          flex-shrink: 0;
          margin: 0 0 8px;
          display: block;
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.6));
        }
        .inkai-title {
          color: #00ffff;
          letter-spacing: 1px;
          margin: 0 0 2px;
        }
        .inkai-subtitle {
          color: #9aa;
          margin: 0 0 16px;
        }
        .inkai-form {
          display: grid;
          gap: 12px;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }
        .inkai-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 255, 0.35);
          color: #eaffff;
          outline: none;
        }
        .inkai-input::placeholder {
          color: #7aa;
        }
        .inkai-password {
          position: relative;
        }
        .pwd-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #9ff;
        }
        .inkai-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          gap: 12px;
        }
        .inkai-remember {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #cfe;
          flex-shrink: 0;
        }
        .inkai-forgot {
          color: #9ff;
          text-decoration: underline;
          cursor: pointer;
          position: relative;
          z-index: 2;
          padding: 6px 4px;
          margin: -6px -4px;
        }
        .inkai-forgot:hover {
          color: #b3ffff;
        }
        .inkai-error {
          color: #ff6b6b;
          font-size: 14px;
        }
        .inkai-button {
          margin-top: 8px;
          padding: 12px;
          border-radius: 10px;
          background: #00ffff;
          color: #001b1b;
          font-weight: 700;
          border: none;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(0, 255, 255, 0.6);
        }
        .inkai-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .inkai-resend {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .inkai-resend-btn {
          padding: 10px 16px;
          border-radius: 10px;
          background: rgba(0, 255, 255, 0.15);
          border: 1px solid rgba(0, 255, 255, 0.4);
          color: #9ff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .inkai-resend-btn:hover:not(:disabled) {
          background: rgba(0, 255, 255, 0.25);
        }
        .inkai-resend-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .inkai-resend-ok {
          margin: 0;
          font-size: 13px;
          color: #6ee7b7;
        }
        .inkai-admin {
          margin-top: 12px;
          margin-bottom: 0;
          text-align: center;
          font-size: 13px;
        }
        .inkai-admin-text {
          color: #9aa;
        }
        .inkai-admin-cta {
          display: inline-block;
          margin-left: 4px;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(0, 255, 255, 0.1);
          border: 1px solid rgba(0, 255, 255, 0.4);
          color: #00ffff !important;
          font-weight: 600;
          font-size: 13px;
          text-decoration: none;
          box-shadow: 0 0 8px rgba(0, 255, 255, 0.15);
          transition: background 0.2s, box-shadow 0.2s;
          vertical-align: middle;
        }
        .inkai-admin-cta:hover {
          background: rgba(0, 255, 255, 0.18);
          color: #e0ffff !important;
          box-shadow: 0 0 12px rgba(0, 255, 255, 0.25);
        }
        .inkai-register {
          margin-top: 14px;
          margin-bottom: 0;
          text-align: center;
          font-size: 14px;
        }
        .inkai-register-text {
          color: #9aa;
        }
        .inkai-register-cta {
          display: inline-block;
          margin-left: 6px;
          padding: 8px 18px;
          border-radius: 8px;
          background: rgba(0, 255, 255, 0.12);
          border: 1px solid #00ffff;
          color: #00ffff !important;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
          transition: background 0.2s, box-shadow 0.2s;
          vertical-align: middle;
        }
        .inkai-register-cta:hover {
          background: rgba(0, 255, 255, 0.22);
          color: #e0ffff !important;
          box-shadow: 0 0 16px rgba(0, 255, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
