/**
 * Data wilayah dari paket idn-area-data (di node_modules, tanpa jaringan).
 * Format dikonversi ke bentuk EMSIFA: id, name, province_id / regency_id / district_id.
 */

import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from "idn-area-data";

function toId(code: string): string {
  return code.replace(/\./g, "");
}

export async function getProvincesFromPackage(): Promise<
  Array<{ id: string; name: string }>
> {
  const list = await getProvinces();
  return list.map((p) => ({ id: toId(p.code), name: p.name }));
}

export async function getRegenciesFromPackage(
  provinceId: string
): Promise<Array<{ id: string; province_id: string; name: string }>> {
  const list = await getRegencies();
  const pid = toId(provinceId);
  return list
    .filter((r) => toId(r.province_code) === pid)
    .map((r) => ({
      id: toId(r.code),
      province_id: toId(r.province_code),
      name: r.name,
    }));
}

function getRegencyCode(d: { regency_code?: string; regencyCode?: string }): string {
  return d.regency_code ?? (d as { regencyCode?: string }).regencyCode ?? "";
}

export async function getDistrictsFromPackage(
  regencyId: string
): Promise<Array<{ id: string; regency_id: string; name: string }>> {
  const list = await getDistricts();
  const rid = toId(regencyId);
  return list
    .filter((d) => toId(getRegencyCode(d)) === rid)
    .map((d) => ({
      id: toId(d.code),
      regency_id: toId(getRegencyCode(d)),
      name: d.name,
    }));
}

function getDistrictCode(v: { district_code?: string; districtCode?: string }): string {
  return v.district_code ?? (v as { districtCode?: string }).districtCode ?? "";
}

export async function getVillagesFromPackage(
  districtId: string
): Promise<Array<{ id: string; district_id: string; name: string }>> {
  const list = await getVillages();
  const did = toId(districtId);
  return list
    .filter((v) => toId(getDistrictCode(v)) === did)
    .map((v) => ({
      id: toId(v.code),
      district_id: toId(getDistrictCode(v)),
      name: v.name,
    }));
}
