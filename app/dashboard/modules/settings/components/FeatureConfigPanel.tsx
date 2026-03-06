"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

type FeatureConfig = {
  homebase_min_level_create_ranting: number;
  homebase_min_level_delete_ranting: number;
  homebase_roles_keanggotaan_block: string[];
  homebase_roles_event_block: string[];
  homebase_roles_kwitansi_block: string[];
};

const FIELDS: {
  key: string;
  label: string;
  hint: string;
  type: "number" | "roles";
}[] = [
  {
    key: "homebase.min_level_create_ranting",
    label: "Level minimal tambah ranting",
    hint: "1–5. Default 3 (Ketua Cabang ke atas)",
    type: "number",
  },
  {
    key: "homebase.min_level_delete_ranting",
    label: "Level minimal hapus ranting",
    hint: "1–5. Default 3",
    type: "number",
  },
  {
    key: "homebase.roles_keanggotaan_block",
    label: "Role blok Keanggotaan",
    hint: "Pisah koma. Contoh: SEKRETARIS",
    type: "roles",
  },
  {
    key: "homebase.roles_event_block",
    label: "Role blok Event & Ujian",
    hint: "Pisah koma. Contoh: PELATIH,SEKRETARIS",
    type: "roles",
  },
  {
    key: "homebase.roles_kwitansi_block",
    label: "Role blok Kwitansi",
    hint: "Pisah koma. Contoh: BENDAHARA",
    type: "roles",
  },
];

function configToForm(config: FeatureConfig): Record<string, string> {
  return {
    "homebase.min_level_create_ranting": String(
      config.homebase_min_level_create_ranting,
    ),
    "homebase.min_level_delete_ranting": String(
      config.homebase_min_level_delete_ranting,
    ),
    "homebase.roles_keanggotaan_block":
      config.homebase_roles_keanggotaan_block.join(", "),
    "homebase.roles_event_block": config.homebase_roles_event_block.join(", "),
    "homebase.roles_kwitansi_block":
      config.homebase_roles_kwitansi_block.join(", "),
  };
}

export default function FeatureConfigPanel() {
  const [config, setConfig] = useState<FeatureConfig | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/feature-config", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setForm(configToForm(data));
      })
      .catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    if (config) setForm(configToForm(config));
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = form[f.key]?.trim();
        if (v !== undefined) {
          body[f.key] = f.type === "roles" ? v : String(parseInt(v, 10) || 3);
        }
      }
      const res = await fetch("/api/feature-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      const data = await res.json();
      setConfig(data);
      setForm(configToForm(data));
      toast.success("Konfigurasi berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return (
      <div className="p-6 text-sm text-white/60">
        Memuat konfigurasi fitur…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Konfigurasi Fitur Dashboard
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Aturan RBAC fitur-level untuk modul Home Base. Perubahan berlaku
          setelah disimpan.
        </p>
      </div>

      <div className="space-y-4 max-w-xl">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <label className="block text-sm font-medium text-white/90">
              {f.label}
            </label>
            <input
              type={f.type === "number" ? "number" : "text"}
              min={1}
              max={5}
              value={form[f.key] ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-teal-500/50 focus:outline-none"
              placeholder={f.type === "number" ? "3" : "SEKRETARIS"}
            />
            <p className="text-[11px] text-white/50">{f.hint}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-teal-500/80 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}
