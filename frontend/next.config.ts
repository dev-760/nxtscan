import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        // Proxy all /api/* requests to the backend, stripping the /api prefix.
        // e.g. /api/scans/free → https://backend.com/scans/free
        // This eliminates CORS entirely since the browser sees same-origin requests.
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
