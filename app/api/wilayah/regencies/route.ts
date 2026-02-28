import { fetchWilayahJson } from "../fetchWilayah";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const provinceId = new URL(req.url).searchParams.get("provinceId");
  if (!provinceId)
    return Response.json({ error: "provinceId required" }, { status: 400 });

  try {
    const data = await fetchWilayahJson(`regencies/${provinceId}.json`);
    const arr = Array.isArray(data) ? data : [];
    return Response.json(arr);
  } catch (err) {
    console.error("Wilayah regencies failed:", err);
    return Response.json([]);
  }
}
