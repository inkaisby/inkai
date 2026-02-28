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
    handleLogin();
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
            onChange={(e) => setUsername(e.target.value)}
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

            <Link href="/auth/reset-password" className="inkai-forgot">
              Lupa password?
            </Link>
          </div>

          {errorMsg && (
            <div id="login-error" className="inkai-error" role="alert">
              {errorMsg}
            </div>
          )}

          <button type="submit" className="inkai-button" disabled={loading}>
            {loading ? "Memproses..." : "Login"}
          </button>
          <div className="inkai-register">
            Belum punya akun?
            <Link href="/auth/register">Buat akun</Link>
          </div>

          <div className="inkai-admin">
            Hubungi admin:
            <a href="tel:081331053100"> 081331053100</a>
          </div>
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
        }
        .inkai-remember {
          display: flex;
          gap: 8px;
          align-items: center;
          color: #cfe;
        }
        .inkai-forgot {
          color: #9ff;
          text-decoration: underline;
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
        .inkai-admin {
          margin-top: 10px;
          font-size: 13px;
          color: #9aa;
        }
        .inkai-admin a {
          color: #00ffff;
          text-decoration: none;
          margin-left: 4px;
        }
        .inkai-register {
          margin-top: 10px;
          font-size: 14px;
          color: #9aa;
          text-align: center;
        }

        .inkai-register a {
          margin-left: 6px;
          color: #00ffff;
          font-weight: 600;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
