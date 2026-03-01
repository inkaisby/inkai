"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import PermissionToolbar from "./PermissionToolbar";

interface MenuRow {
  id: string;
  key: string;
  name: string;
  scope: string | null;
  icon: string | null;
  order_index: number;
}

const ACTIONS = ["read", "create", "update", "delete"] as const;
type Action = (typeof ACTIONS)[number];

type PermissionMap = Record<string, Partial<Record<Action, boolean>>>;

interface PermissionMatrixProps {
  email: string;
  sessionEmail: string | null;
  permissions: PermissionMap;
  setPermissions: (
    p: PermissionMap | ((prev: PermissionMap) => PermissionMap),
  ) => void;
  onSave: () => void;
  saving: boolean;
}

const iconMap = Icons as unknown as Record<string, LucideIcon>;

export default function PermissionMatrix({
  email,
  sessionEmail,
  permissions,
  setPermissions,
  onSave,
  saving,
}: PermissionMatrixProps) {
  const [menus, setMenus] = useState<MenuRow[]>([]);

  useEffect(() => {
    fetch("/api/menus")
      .then((r) => r.json())
      .then((data: MenuRow[]) => setMenus(Array.isArray(data) ? data : []))
      .catch(() => setMenus([]));
  }, []);

  /* ===============================
   * TOGGLE WITH NORMALIZATION
   * =============================== */
  const toggle = (scope: string, action: Action) => {
    setPermissions((prev) => {
      const current = prev?.[scope]?.[action] ?? false;

      const next: PermissionMap = {
        ...prev,
        [scope]: {
          ...prev[scope],
          [action]: !current,
        },
      };

      // 🔒 RULE: READ off → matikan turunan
      if (action === "read" && current === true) {
        next[scope].create = false;
        next[scope].update = false;
        next[scope].delete = false;
      }

      return next;
    });
  };

  /* ===============================
   * VALIDATION
   * =============================== */
  const hasAnyChecked = Object.values(permissions).some((scope) =>
    Object.values(scope ?? {}).some(Boolean),
  );

  const isSelf = sessionEmail === email;
  const forbidRemoveAllSelf = isSelf && !hasAnyChecked;

  const save = () => {
    if (saving) return;
    if (forbidRemoveAllSelf) return;
    onSave();
  };

  /* ===============================
   * RENDER
   * =============================== */
  return (
    <div className="flex flex-col h-full min-h-0">
      <p className="text-xs text-white/50 shrink-0 pb-1">Akses per menu: centang Baca / Tambah / Ubah / Hapus</p>
      {/* ===============================
       * TOOLBAR (FIXED)
       * =============================== */}
      <div className="shrink-0 pb-2">
        <PermissionToolbar
          permissions={permissions}
          setPermissions={setPermissions}
        />
      </div>

      {/* ===============================
       * MATRIX (SCROLLABLE)
       * =============================== */}
      <div className="flex-1 min-h-0 overflow-y-auto border border-white/10 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-white/5 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-left">Menu</th>
              {ACTIONS.map((a) => (
                <th key={a} className="p-3 text-center capitalize w-20">
                  {a}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {menus.map((menu) => {
              const scope = menu.scope ?? menu.key;
              const scopePerm = permissions?.[scope] ?? {};
              const canRead = scopePerm.read === true;
              const Icon =
                iconMap[menu.icon ?? "Circle"] ?? (Icons.Circle as LucideIcon);

              return (
                <tr
                  key={menu.key}
                  className="border-t border-white/10 hover:bg-white/5"
                >
                  <td className="p-3 flex items-center gap-2 font-medium">
                    <Icon className="w-4 h-4 text-white/60" />
                    {menu.name}
                  </td>

                  {ACTIONS.map((action) => (
                    <td key={action} className="text-center">
                      <input
                        type="checkbox"
                        className="cursor-pointer accent-blue-500 disabled:opacity-40"
                        checked={scopePerm?.[action] ?? false}
                        disabled={action !== "read" && !canRead}
                        onChange={() => toggle(scope, action)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===============================
       * STICKY SAVE FOOTER
       * =============================== */}
      <div className="shrink-0 pt-3 border-t border-white/10 bg-black/80 backdrop-blur">
        <button
          onClick={save}
          disabled={saving || forbidRemoveAllSelf}
          className="
            w-full py-2 rounded
            bg-emerald-600 hover:bg-emerald-700
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {saving
            ? "Menyimpan…"
            : forbidRemoveAllSelf
              ? "Minimal 1 akses untuk akun sendiri"
              : "Simpan Akses"}
        </button>
      </div>
    </div>
  );
}
