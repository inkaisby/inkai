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
  serverExternalPackages: ["qrcode"],
  async redirects() {
    return [
      { source: "/dashboard/audit", destination: "/dashboard/ukt", permanent: false },
      { source: "/dashboard/ujian", destination: "/dashboard/ukt", permanent: false },
      { source: "/dashboard/audit-ujian", destination: "/dashboard/ukt", permanent: false },
    ];
  },
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
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://inkai-jatim.vercel.app http://localhost:3000"
          }
        ]
      }
    ];
  },
  // Batas ukuran body (termasuk upload avatar ~2MB) agar tidak "Failed to fetch" / truncate
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
