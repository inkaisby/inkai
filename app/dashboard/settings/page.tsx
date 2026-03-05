"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import SettingsView from "../modules/settings/SettingsModule";
import { useBootstrapStore } from "../store/bootstrapStore";

const ROOT_EMAIL = (process.env.NEXT_PUBLIC_INKAI_ROOT_EMAIL ?? "").toLowerCase();

export default function SettingsPage() {
  const { data: bootstrap, loading: bootstrapLoading } = useBootstrapStore();

  /* ===============================
   * SESSION + APP_ROLE (dari bootstrap store, tanpa fetch /api/me)
   * =============================== */
  const sessionEmail = bootstrap?.user?.email ?? null;
  const appRole = bootstrap?.user?.app_role ?? null;
  const loading = bootstrapLoading;

  /* ===============================
   * UI STATE
   * =============================== */
  const [saving, setSaving] = useState(false);

  /* ===============================
   * PERMISSION CONTEXT
   * =============================== */
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, unknown>>({});

  /* ===============================
   * LOAD PERMISSIONS BY EMAIL
   * =============================== */
  useEffect(() => {
    if (!selectedEmail) {
      setPermissions({});
      return;
    }

    const loadPermissions = async () => {
      const q = new URLSearchParams({ email: selectedEmail });
      const res = await fetch(`/api/permissions?${q.toString()}`);
      const json = await res.json();
      setPermissions(json.permissions ?? {});
    };

    loadPermissions();
  }, [selectedEmail]);

  const isSuperAdmin =
    (ROOT_EMAIL && sessionEmail?.toLowerCase() === ROOT_EMAIL) ||
    (appRole ?? "").toUpperCase() === "SUPERADMIN";

  /* ===============================
   * SAVE HANDLER
   * =============================== */
  const handleSavePermission = async () => {
    if (!selectedEmail || saving) return;

    setSaving(true);

    try {
      const saveRes = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedEmail,
          permissions,
        }),
      });

      const q = new URLSearchParams({ email: selectedEmail });
      const res = await fetch(`/api/permissions?${q.toString()}`);
      const json = await res.json();
      setPermissions(json.permissions ?? {});

      if (saveRes.ok) {
        toast.success("Permission berhasil disimpan");
      } else {
        const msg = (await saveRes.json().catch(() => ({})))?.message ?? "Gagal menyimpan permission";
        toast.error(msg);
      }
    } catch {
      toast.error("Gagal menyimpan permission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsView
      loading={loading}
      isSuperAdmin={isSuperAdmin}
      sessionEmail={sessionEmail}
      selectedEmail={selectedEmail}
      onSelectEmail={setSelectedEmail}
      permissions={permissions}
      setPermissions={setPermissions}
      onSavePermission={handleSavePermission}
      saving={saving}
    />
  );
}
