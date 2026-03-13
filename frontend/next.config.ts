import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://<your-northflank-backend-url>/:path*'
      }
    ]
  }
};

export default nextConfig;
