"use client";

import { useEffect, useState } from "react";
import SettingsView from "../modules/settings/SettingsModule";
import { useBootstrapStore } from "../store/bootstrapStore";

const SUPERADMIN_EMAIL = "karateinkaisby@gmail.com";

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
      const res = await fetch(`/api/permissions?email=${selectedEmail}`);
      const json = await res.json();
      setPermissions(json.permissions ?? {});
    };

    loadPermissions();
  }, [selectedEmail]);

  const isSuperAdmin =
    sessionEmail === SUPERADMIN_EMAIL ||
    (appRole ?? "").toUpperCase() === "SUPERADMIN";

  /* ===============================
   * SAVE HANDLER
   * =============================== */
  const handleSavePermission = async () => {
    if (!selectedEmail || saving) return;

    setSaving(true);

    try {
      await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedEmail,
          permissions,
        }),
      });

      const res = await fetch(`/api/permissions?email=${selectedEmail}`);
      const json = await res.json();
      setPermissions(json.permissions ?? {});

      alert("Permission berhasil disimpan");
    } catch {
      alert("Gagal menyimpan permission");
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
