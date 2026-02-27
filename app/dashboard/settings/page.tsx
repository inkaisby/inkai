"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/app/lib/supabaseBrowser";
import SettingsView from "../modules/settings/components/SettingsView";

const SUPERADMIN_EMAIL = "karateinkaisby@gmail.com";

export default function SettingsPage() {
  /* ===============================
   * SESSION
   * =============================== */
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  /* ===============================
   * UI STATE
   * =============================== */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ===============================
   * PERMISSION CONTEXT
   * =============================== */
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, unknown>>({});

  /* ===============================
   * LOAD SESSION
   * =============================== */
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user?.email ?? null);
      setLoading(false);
    };

    loadSession();
  }, []);

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

  const isSuperAdmin = sessionEmail === SUPERADMIN_EMAIL;

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
    } catch (_e) {
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
    />
  );
}
