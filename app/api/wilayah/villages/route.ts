import { fetchWilayahJson } from "../fetchWilayah";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("districtId");
  const districtId = raw?.trim() ?? "";
  if (!districtId)
    return Response.json({ error: "districtId required" }, { status: 400 });

  try {
    const data = await fetchWilayahJson(`villages/${districtId}.json`);
    const arr = Array.isArray(data) ? data : [];
    return Response.json(arr);
  } catch (err) {
    console.error("Wilayah villages failed:", err);
    return Response.json([]);
  }
}
