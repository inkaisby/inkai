"use client";

import { useState } from "react";

const LEVEL_LABELS: Record<number, string> = {
  2: "2 - Ranting",
  3: "3 - Cabang",
  4: "4 - Pengprov",
  5: "5 - PP",
};

type FoundUser = {
  user_id: string;
  email: string;
  nama: string | null;
  structural_level: number | null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(text: string): string[] {
  return text
    .split(/[\n,\t]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s && EMAIL_REGEX.test(s));
}

export default function QuickLevelUpPanel() {
  const [expanded, setExpanded] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [level, setLevel] = useState<number>(2);
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<{ email: string; ok: boolean; msg?: string }[]>([]);

  const handleSearch = async () => {
    const emails = parseEmails(emailText);
    if (emails.length === 0) {
      setError("Masukkan minimal satu email (satu per baris atau pisah koma/tab)");
      setFound([]);
      return;
    }
    setError(null);
    setFound([]);
    setResults([]);
    setSearching(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      const data = (await res.json()) as FoundUser[] | { message?: string };
      if (!Array.isArray(data)) {
        setError(data?.message ?? "Gagal memuat data");
        return;
      }
      const emailSet = new Set(emails);
      const matched = data.filter((u) =>
        emailSet.has((u.email ?? "").toLowerCase())
      );
      const foundEmails = new Set(matched.map((u) => (u.email ?? "").toLowerCase()));
      const notFound = emails.filter((e) => !foundEmails.has(e));
      if (notFound.length > 0) {
        setError(`Email tidak terdaftar: ${notFound.join(", ")}`);
      }
      setFound(
        matched.map((u) => ({
          user_id: u.user_id,
          email: u.email,
          nama: u.nama ?? null,
          structural_level: u.structural_level ?? null,
        }))
      );
    } catch {
      setError("Gagal memuat data");
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (found.length === 0) return;
    setSaving(true);
    setResults([]);
    setError(null);
    const out: { email: string; ok: boolean; msg?: string }[] = [];
    for (let i = 0; i < found.length; i++) {
      const u = found[i];
      try {
        const res = await fetch("/api/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            user_id: u.user_id,
            structural_level: level,
          }),
        });
        const data = (await res.json()) as { message?: string };
        out.push({
          email: u.email,
          ok: res.ok,
          msg: res.ok ? undefined : data?.message,
        });
      } catch {
        out.push({ email: u.email, ok: false, msg: "Gagal menyimpan" });
      }
      setResults([...out]);
    }
    setSaving(false);
  };

  const reset = () => {
    setEmailText("");
    setFound([]);
    setError(null);
    setResults([]);
    setLevel(2);
  };

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-white/5"
      >
        <span className="text-left">
          <span className="font-medium text-zinc-200">
            Set Level Struktural (Cepat)
          </span>
          <span className="block text-xs text-zinc-500 font-normal">
            Banyak email sekaligus, set level 2–5. User perlu refresh agar menu
            ter-update.
          </span>
        </span>
        <span
          className={`transition-transform shrink-0 ml-2 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Email (banyak sekaligus)
            </label>
            <p className="text-xs text-zinc-500 mb-2">
              Satu per baris, atau pisahkan dengan koma/tab.
            </p>
            <textarea
              value={emailText}
              onChange={(e) => {
                setEmailText(e.target.value);
                setFound([]);
                setError(null);
                setResults([]);
              }}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono resize-y min-h-[80px]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 rounded-md bg-zinc-700 text-zinc-200 text-sm hover:bg-zinc-600 disabled:opacity-50"
            >
              {searching ? "Mencari…" : "Cari"}
            </button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {found.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-zinc-700">
              <div className="text-sm">
                <span className="text-zinc-400">Ditemukan: </span>
                <span className="text-zinc-100 font-medium">
                  {found.length} user
                </span>
                <span className="text-zinc-500 text-xs ml-1">
                  ({found.map((u) => u.email).join(", ")})
                </span>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Level Struktural
                </label>
                <div className="flex flex-wrap gap-2">
                  {([2, 3, 4, 5] as const).map((L) => (
                    <button
                      key={L}
                      type="button"
                      onClick={() => setLevel(L)}
                      className={`px-3 py-1.5 rounded-md text-sm border ${
                        level === L
                          ? "bg-emerald-600/30 border-emerald-500 text-emerald-200"
                          : "bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {LEVEL_LABELS[L]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving
                    ? `Menyimpan… ${results.length}/${found.length}`
                    : `Simpan Level (${found.length} user)`}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="px-4 py-2 rounded-md bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600"
                >
                  Reset
                </button>
              </div>
              {results.length > 0 && (
                <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                  {results.map((r) => (
                    <div
                      key={r.email}
                      className={r.ok ? "text-emerald-400" : "text-red-400"}
                    >
                      {r.email}: {r.ok ? "✓" : r.msg ?? "Gagal"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
