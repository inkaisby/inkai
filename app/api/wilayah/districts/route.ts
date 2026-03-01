import { fetchWilayahJson } from "../fetchWilayah";

export const runtime = "nodejs";

const normId = (x: string | number | undefined | null): string =>
  x == null ? "" : String(x).replace(/\./g, "").trim();

/** Format 3578 -> 35.78 agar cocok dengan sumber yang pakai titik. */
function toDottedId(id: string): string {
  const n = normId(id);
  if (n.length === 4) return `${n.slice(0, 2)}.${n.slice(2)}`;
  if (n.length === 6) return `${n.slice(0, 2)}.${n.slice(2, 4)}.${n.slice(4)}`;
  return id;
}

function normalizeItem(row: Record<string, unknown>): { id: string; name: string } {
  const id = normId((row.id ?? row.code ?? "") as string) || "";
  const name = (row.name ?? row.nama ?? id) as string;
  return { id, name };
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("regencyId");
  const regencyId = raw?.trim() ?? "";
  if (!regencyId)
    return Response.json({ error: "regencyId required" }, { status: 400 });

  try {
    let data = await fetchWilayahJson(`districts/${regencyId}.json`);
    let arr = Array.isArray(data) ? data : [];
    if (arr.length === 0 && regencyId.length === 4) {
      const dotted = toDottedId(regencyId);
      if (dotted !== regencyId) {
        data = await fetchWilayahJson(`districts/${dotted}.json`);
        arr = Array.isArray(data) ? data : [];
      }
    }
    const out = arr.map((r) => normalizeItem(r as Record<string, unknown>)).filter((r) => r.id);
    return Response.json(out);
  } catch (err) {
    console.error("Wilayah districts failed:", err);
    return Response.json([]);
  }
}
