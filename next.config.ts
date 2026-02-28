import type { NextConfig } from "next";

function getSupabaseHostname(): string {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) return new URL(url).hostname;
  } catch {
    // ignore
  }
  return "btnccdpjsduhkhuxusuf.supabase.co"; // fallback jika env belum set saat build
}
const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Di production: jangan kirim source map ke browser agar tab Network (DevTools)
  // tidak menampilkan path/file asli (mis. D:\inkai-app\app\dashboard\) ke client.
  productionBrowserSourceMaps: false,
  // Gambar dari Supabase Storage (avatar dll.)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Batas ukuran body (termasuk upload avatar ~2MB) agar tidak "Failed to fetch" / truncate
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
