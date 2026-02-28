import { fetchWilayahJson } from "../fetchWilayah";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("regencyId");
  const regencyId = raw?.trim() ?? "";
  if (!regencyId)
    return Response.json({ error: "regencyId required" }, { status: 400 });

  try {
    const data = await fetchWilayahJson(`districts/${regencyId}.json`);
    const arr = Array.isArray(data) ? data : [];
    return Response.json(arr);
  } catch (err) {
    console.error("Wilayah districts failed:", err);
    return Response.json([]);
  }
}
