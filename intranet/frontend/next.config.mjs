/** @type {import('next').NextConfig} */
// - En production (Nginx), NEXT_PUBLIC_API_BASE_URL=/api/v1 et Nginx proxifie /api/.
//   INTERNAL_API_URL n'est pas défini → aucun rewrite Next (dormant).
// - En dev (docker compose), INTERNAL_API_URL=http://backend:8000 : Next proxifie
//   /api/* vers Django, ce qui fait fonctionner aussi l'accès direct sur :3000.
const INTERNAL_API_URL = process.env.INTERNAL_API_URL;

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!INTERNAL_API_URL) return [];
    return [
      { source: "/api/:path*/", destination: `${INTERNAL_API_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${INTERNAL_API_URL}/api/:path*` },
      { source: "/media/:path*", destination: `${INTERNAL_API_URL}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
