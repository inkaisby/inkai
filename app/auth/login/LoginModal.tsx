"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";

interface LoginModalProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function LoginModal({ onSuccess, onClose }: LoginModalProps) {
  const emailRef = useRef<HTMLInputElement>(null);
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
      emailRef.current?.focus();
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
          : "Email / Username atau Password salah",
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

  // ENTER = LOGIN
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="inkai-overlay">
      <div className="inkai-card" onKeyDown={onKeyDown}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-cyan-200 hover:text-white text-xl"
            aria-label="Tutup"
          >
            ×
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

        <div className="inkai-form">
          <input
            ref={emailRef}
            className="inkai-input"
            type="text"
            placeholder="Email atau Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={loading}
          />

          <div className="inkai-password">
            <input
              ref={passwordRef}
              className="inkai-input"
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />

            <button
              type="button"
              className="pwd-toggle"
              onClick={() => setShowPwd((v) => !v)}
              tabIndex={-1}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>

          <div className="inkai-options">
            <label className="inkai-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              />
              <span>Remember me</span>
            </label>

            <a href="/auth/reset-password" className="inkai-forgot">
              Lupa password?
            </a>
          </div>

          {errorMsg && <div className="inkai-error">{errorMsg}</div>}

          <button
            className="inkai-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Memproses..." : "Login"}
          </button>
          <div className="inkai-register">
            Belum punya akun?
            <a href="/auth/register">Buat akun</a>
          </div>

          <div className="inkai-admin">
            Hubungi admin:
            <a href="tel:081331053100"> 081331053100</a>
          </div>
        </div>
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
          width: 520px;
          max-width: calc(100vw - 32px);
          padding: 28px 32px 32px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.75);
          border: 1px solid rgba(0, 255, 255, 0.35);
          box-shadow:
            0 0 0 1px rgba(0, 255, 255, 0.15) inset,
            0 0 40px rgba(0, 255, 255, 0.25);
          text-align: center;
          backdrop-filter: blur(6px);
        }
        .inkai-logo {
          width: 88px;
          margin: 0 auto 8px;
          display: block;
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.6));
        }
        .inkai-title {
          color: #00ffff;
          letter-spacing: 1px;
          margin: 8px 0 2px;
        }
        .inkai-subtitle {
          color: #9aa;
          margin-bottom: 16px;
        }
        .inkai-form {
          display: grid;
          gap: 12px;
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
