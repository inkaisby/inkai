"use client";

import { MenuRow } from "./useMenuCRUD";

export default function MenuDetailPanel({
  data,
  onClose,
}: {
  data: MenuRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[420px] rounded-lg border border-white/10 bg-[#0b1220] p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Detail Menu</div>
          <button
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white"
          >
            Tutup
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <Row label="ID" value={data.id} mono />
          <Row label="Key" value={data.key} mono />
          <Row label="Nama" value={data.name} />
          <Row label="Order" value={String(data.order_index)} />
          <Row label="Status" value={data.is_active ? "Aktif" : "Nonaktif"} />
          <Row
            label="Akses"
            value={
              data.superadmin_only
                ? "SUPERADMIN"
                : data.required_structural_level != null
                  ? `STRUKTURAL ≥ ${data.required_structural_level}`
                  : data.required_functional_role
                    ? `FUNGSIONAL: ${data.required_functional_role}`
                    : "PUBLIC"
            }
          />
          <Row label="Scope" value={data.scope ?? "-"} />
          <Row label="Icon" value={data.icon ?? "-"} />
          <Row label="Color" value={data.color ?? "-"} />
          <Row
            label="Context Required"
            value={data.context_required ? "Ya" : "Tidak"}
          />
          <Row
            label="Structural Level"
            value={String(data.required_structural_level ?? "-")}
          />
          <Row
            label="Functional Role"
            value={String(data.required_functional_role ?? "-")}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-white/40">{label}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{value}</div>
    </div>
  );
}
