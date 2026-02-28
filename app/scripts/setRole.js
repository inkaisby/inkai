import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } =
    await supabaseAdmin.auth.admin.updateUserById(
      "88175888-8cb1-4b5f-bb44-25e3e508fd77",
      { app_metadata: { role: "admin" } }
    );

  if (error) {
    console.error("FAILED:", error.message);
    return;
  }
}

run();
