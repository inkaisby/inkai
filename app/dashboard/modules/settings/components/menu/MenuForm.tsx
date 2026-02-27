"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FixedSizeGrid as Grid, GridChildComponentProps } from "react-window";
import type { MenuRow } from "./useMenuCRUD";
import JarvisLoader from "@/components/JarvisLoader";

/* ================= TYPES ================= */

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Partial<MenuRow>;
  onSubmit: (payload: Partial<MenuRow>) => Promise<void>;
};

/* ================= ICON FIX ================= */

const ALL_ICONS: [string, LucideIcon][] = Object.entries(LucideIcons)
  .filter(([key]) => /^[A-Z]/.test(key))
  .map(([key, value]) => [key, value as LucideIcon])
  .sort(([a], [b]) => a.localeCompare(b))
  .slice(0, 1000);

const DEFAULT_ICON = (LucideIcons as any).Circle || ALL_ICONS[0]?.[1];

/* ================= DEFAULT FORM ================= */

const EMPTY: Partial<MenuRow> = {
  key: "",
  name: "",
  scope: "sidebar",
  icon: "Circle",
  order_index: 0,
  is_active: true,
  superadmin_only: false,
  context_required: false,
  required_structural_level: null,
  required_functional_role: null,
  color: null,
};

/* ================= MAIN ================= */

export default function MenuForm({ open, onClose, initial, onSubmit }: Props) {
  const [form, setForm] = useState<Partial<MenuRow>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
      setIconSearch("");
    }
  }, [open, initial]);

  const filteredIcons = useMemo(() => {
    if (!iconSearch) return ALL_ICONS;
    return ALL_ICONS.filter(([name]) =>
      name.toLowerCase().includes(iconSearch.toLowerCase()),
    );
  }, [iconSearch]);

  const PreviewIcon =
    ALL_ICONS.find(
      ([name]) => name.toLowerCase() === (form.icon || "").toLowerCase(),
    )?.[1] ?? DEFAULT_ICON;

  const columnCount = 8;
  const rowCount = Math.ceil(filteredIcons.length / columnCount);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
      const index = rowIndex * columnCount + columnIndex;
      if (index >= filteredIcons.length) return null;

      const [name, Icon] = filteredIcons[index];
      const active = name.toLowerCase() === (form.icon || "").toLowerCase();

      return (
        <div style={style} className="p-1">
          <button
            type="button"
            title={name}
            onClick={() => setForm((prev) => ({ ...prev, icon: name }))}
            className={`w-full h-full flex items-center justify-center rounded-xl border transition-all duration-200
              ${
                active
                  ? "border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-500/30"
                  : "border-white/10 hover:bg-white/5 hover:border-cyan-500/40"
              }`}
          >
            <Icon size={18} />
          </button>
        </div>
      );
    },
    [filteredIcons, form.icon],
  );

  if (!open) return null;

  async function submit() {
    if (!form.name?.trim() || !form.key?.trim()) {
      alert("Nama dan Key wajib diisi");
      return;
    }

    try {
      setSaving(true);

      // 🔒 Jika superadmin_only aktif → hapus restriction lain
      const sanitizedForm = form.superadmin_only
        ? {
            ...form,
            required_structural_level: null,
            required_functional_role: null,
          }
        : form;

      const payload: Partial<MenuRow> = {
        ...sanitizedForm,
        key: sanitizedForm.key?.trim().toLowerCase(),
        name: sanitizedForm.name?.trim(),
        order_index: Number(sanitizedForm.order_index ?? 0),
        scope:
          sanitizedForm.key === "dashboard" ? "sidebar" : sanitizedForm.scope,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      alert(err?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  const isDashboard = form.key === "dashboard";

  return (
    <>
      {saving && <JarvisLoader label="Menyimpan..." />}

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        onClick={onClose}
      >
        <div
          className="w-[880px] max-h-[94vh] flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#0b1220] shadow-2xl shadow-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                {initial?.id ? "Edit Menu" : "Tambah Menu"}
              </h2>
              <p className="text-xs text-white/40">
                Konfigurasi menu dan akses sistem
              </p>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <PreviewIcon size={20} />
              <span className="text-sm text-white/70">
                {form.name || "Preview"}
              </span>
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <Section title="Informasi Dasar">
              <div className="grid grid-cols-2 gap-6">
                <InputField
                  icon="Type"
                  label="Nama Menu"
                  value={form.name ?? ""}
                  onChange={(v) => setForm({ ...form, name: v })}
                />

                <InputField
                  icon="KeyRound"
                  label="Key"
                  value={form.key ?? ""}
                  disabled={!!initial?.id}
                  onChange={(v) => setForm({ ...form, key: v.toLowerCase() })}
                />

                <SelectField
                  icon="Layout"
                  label="Scope"
                  value={form.scope ?? "sidebar"}
                  disabled={isDashboard}
                  onChange={(v) => setForm({ ...form, scope: v as any })}
                  options={[
                    { value: "sidebar", label: "Sidebar" },
                    { value: "settings", label: "Settings Only" },
                  ]}
                />

                <InputField
                  icon="ArrowUpDown"
                  label="Order Index"
                  type="number"
                  value={form.order_index ?? 0}
                  onChange={(v) => setForm({ ...form, order_index: Number(v) })}
                />
              </div>
            </Section>
            <Section title="Access Control">
              <div className="grid grid-cols-2 gap-6">
                <SelectField
                  icon="Layers"
                  label="Required Structural Level"
                  value={form.required_structural_level ?? ""}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      required_structural_level: v ? Number(v) : null,
                    })
                  }
                  options={[
                    { value: "", label: "Tidak dibatasi" },
                    { value: 1, label: "KOHAL" },
                    { value: 2, label: "KETUA_RANTING" },
                    { value: 3, label: "KETUA_CABANG" },
                    { value: 4, label: "KETUA_PENGPROV" },
                    { value: 5, label: "KETUA_PP" },
                  ]}
                />

                <SelectField
                  icon="UserCog"
                  label="Required Functional Role"
                  value={form.required_functional_role ?? ""}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      required_functional_role: v || null,
                    })
                  }
                  options={[
                    { value: "", label: "Tidak dibatasi" },
                    { value: "PENGUJI", label: "PENGUJI" },
                    { value: "ADM_PERTANDINGAN", label: "ADM_PERTANDINGAN" },
                    { value: "WASIT", label: "WASIT" },
                    { value: "PANITIA", label: "PANITIA" },
                    { value: "OPERATOR_EVENT", label: "OPERATOR_EVENT" },
                  ]}
                />
              </div>
            </Section>

            <Section title="Flags">
              <div className="grid grid-cols-3 gap-4">
                <CheckboxCard
                  icon="CheckCircle2"
                  label="Aktif"
                  checked={!!form.is_active}
                  onChange={(v) => setForm({ ...form, is_active: v })}
                />
                <CheckboxCard
                  icon="Shield"
                  label="Superadmin Only"
                  checked={!!form.superadmin_only}
                  onChange={(v) => setForm({ ...form, superadmin_only: v })}
                />
                <CheckboxCard
                  icon="Workflow"
                  label="Context Required"
                  checked={!!form.context_required}
                  onChange={(v) => setForm({ ...form, context_required: v })}
                />
              </div>
            </Section>

            <Section title="Icon">
              <input
                type="text"
                placeholder="Cari icon..."
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-cyan-400 outline-none transition"
              />

              <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
                {filteredIcons.map(([name, Icon]) => {
                  const active =
                    name.toLowerCase() === (form.icon || "").toLowerCase();

                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() =>
                        setForm((prev) => ({ ...prev, icon: name }))
                      }
                      className={`h-14 flex items-center justify-center rounded-xl border transition-all duration-200
            ${
              active
                ? "border-cyan-400 bg-cyan-400/20 shadow-lg shadow-cyan-500/30"
                : "border-white/10 hover:bg-white/5 hover:border-cyan-500/40"
            }`}
                    >
                      <Icon size={18} />
                    </button>
                  );
                })}
              </div>
            </Section>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-4 bg-black/30">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-white/20 hover:bg-white/5 transition"
            >
              Batal
            </button>

            <button
              onClick={submit}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 transition disabled:opacity-50 shadow-lg"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= UI COMPONENTS ================= */

function Section({ title, children }: any) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-cyan-400 tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}

function InputField({
  icon,
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: any) {
  const Icon = (LucideIcons as any)[icon] || LucideIcons.Circle;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Icon size={14} className="text-cyan-400" />
        {label}
      </div>
      <input
        type={type}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-cyan-400 outline-none transition"
      />
    </div>
  );
}

function SelectField({ icon, label, value, onChange, options, disabled }: any) {
  const Icon = (LucideIcons as any)[icon] || LucideIcons.Circle;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Icon size={14} className="text-cyan-400" />
        {label}
      </div>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 rounded-xl bg-black/30 border border-white/10 focus:border-cyan-400 outline-none transition"
      >
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxCard({ icon, label, checked, onChange }: any) {
  const Icon = (LucideIcons as any)[icon] || LucideIcons.Circle;

  return (
    <label
      className={`flex items-center justify-between p-4 rounded-xl border transition
      ${
        checked
          ? "border-cyan-400 bg-cyan-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        <Icon size={16} className="text-cyan-400" />
        {label}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
