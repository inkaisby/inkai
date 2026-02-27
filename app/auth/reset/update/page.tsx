\"use client\";

import { useState } from \"react\";
import Image from \"next/image\";
import { useRouter } from \"next/navigation\";
import { supabaseBrowser as supabase } from \"@/app/lib/supabaseBrowser\";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUpdate = async () => {
    if (!password || !confirm) {
      setError("Password wajib diisi");
      return;
    }

    if (password !== confirm) {
      setError("Password tidak sama");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);

    // Redirect ke login setelah sukses
    setTimeout(() => {
      router.replace("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-xl text-white px-6">
      <div className="bg-black/40 p-8 rounded-2xl border border-cyan-400/40 w-[380px] shadow-xl">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/logo/inkai-logo.png"
            alt="INKAI Logo"
            width={80}
            height={80}
            className="w-20 h-20 object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl font-bold mt-3 tracking-wide">
            Password Baru
          </h1>
        </div>

        {/* CONTENT */}
        {success ? (
          <p className="text-center text-cyan-300">
            Password berhasil diperbarui. Mengalihkan ke login…
          </p>
        ) : (
          <>
            {/* PASSWORD BARU */}
            <div className="relative mb-3">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Password baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full p-3 pr-16 bg-white/10 border border-white/20 rounded-lg outline-none focus:bg-white/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="
                  absolute right-0 top-0 h-full
                  px-4
                  flex items-center justify-center
                  text-cyan-300 text-2xl
                  hover:text-cyan-200 transition-colors
                  focus:outline-none
                "
                aria-label="Toggle password"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>

            {/* KONFIRMASI PASSWORD */}
            <div className="relative mb-3">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Konfirmasi password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                className="w-full p-3 pr-16 bg-white/10 border border-white/20 rounded-lg outline-none focus:bg-white/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="
                  absolute right-0 top-0 h-full
                  px-4
                  flex items-center justify-center
                  text-cyan-300 text-2xl
                  hover:text-cyan-200 transition-colors
                  focus:outline-none
                "
                aria-label="Toggle confirm password"
              >
                {showConfirm ? "🙈" : "👁️"}
              </button>
            </div>

            {/* ERROR */}
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            {/* SUBMIT */}
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
            >
              {loading ? "Memproses..." : "Simpan Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
