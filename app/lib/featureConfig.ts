import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

export type FeatureConfig = {
  homebase_min_level_create_ranting: number;
  homebase_min_level_delete_ranting: number;
  homebase_roles_keanggotaan_block: string[];
  homebase_roles_event_block: string[];
  homebase_roles_kwitansi_block: string[];
};

const DEFAULTS: FeatureConfig = {
  homebase_min_level_create_ranting: 3,
  homebase_min_level_delete_ranting: 3,
  homebase_roles_keanggotaan_block: ["SEKRETARIS"],
  homebase_roles_event_block: ["PELATIH", "SEKRETARIS"],
  homebase_roles_kwitansi_block: ["BENDAHARA"],
};

function parseRoles(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export async function getFeatureConfig(): Promise<FeatureConfig> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("app_feature_config")
    .select("key, value");

  if (error || !data) return DEFAULTS;

  const map = Object.fromEntries(
    (data as { key: string; value: string }[]).map((r) => [r.key, r.value]),
  );

  return {
    homebase_min_level_create_ranting: parseInt(
      map["homebase.min_level_create_ranting"] ?? "3",
      10,
    ) || 3,
    homebase_min_level_delete_ranting: parseInt(
      map["homebase.min_level_delete_ranting"] ?? "3",
      10,
    ) || 3,
    homebase_roles_keanggotaan_block: parseRoles(
      map["homebase.roles_keanggotaan_block"] ?? "SEKRETARIS",
    ),
    homebase_roles_event_block: parseRoles(
      map["homebase.roles_event_block"] ?? "PELATIH,SEKRETARIS",
    ),
    homebase_roles_kwitansi_block: parseRoles(
      map["homebase.roles_kwitansi_block"] ?? "BENDAHARA",
    ),
  };
}
