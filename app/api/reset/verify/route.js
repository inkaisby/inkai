import { supabaseServer } from "@/app/lib/supabaseServer";

export async function POST(req) {
  const supabase = supabaseServer();
  const { token } = await req.json();

  const { data } = await supabase
    .from("password_resets")
    .select("*")
    .eq("token", token)
    .single();

  if (!data) {
    return Response.json({ valid: false, reason: "Invalid token" });
  }

  if (new Date(data.expires_at) < new Date()) {
    return Response.json({ valid: false, reason: "Token expired" });
  }

  return Response.json({ valid: true, email: data.email });
}
