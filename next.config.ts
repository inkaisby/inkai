import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // Di production: jangan kirim source map ke browser agar tab Network (DevTools)
  // tidak menampilkan path/file asli (mis. D:\inkai-app\app\dashboard\) ke client.
  productionBrowserSourceMaps: false,
  // Batas ukuran body (termasuk upload avatar ~2MB) agar tidak "Failed to fetch" / truncate
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
