import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // สร้าง build แบบ standalone (โฟลเดอร์ .next/standalone + server.js) สำหรับรันใน Docker
  output: 'standalone',
};

export default nextConfig;
