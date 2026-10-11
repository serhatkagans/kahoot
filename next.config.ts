import type { NextConfig } from "next";

// Alt adreste yayın için (ör. site.com/kahoot) derlemeden önce BASE_PATH=/kahoot verilir; boşsa kök adres kullanılır.
const basePath = process.env.BASE_PATH?.replace(/\/+$/, "") || "";

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
