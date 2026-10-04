import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Build Docker minimal (k8s/site) : ne copie que les fichiers tracés
  // nécessaires au runtime, pas tout node_modules.
  output: "standalone",
  images: {
    remotePatterns: [
      // Directus local dev
      { protocol: "http", hostname: "localhost", port: "8055" },
      // Directus on Render (production) — replace once the service is created
      { protocol: "https", hostname: "wagadu-directus.onrender.com" },
      // Cloudflare R2 bucket for Directus media — replace <ACCOUNT_ID> once known
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
  // Redirections 301 depuis les anciennes URLs WordPress (brief section 7) —
  // pour ne pas perdre le référencement acquis sur wagadu-africa.org. Le
  // middleware i18n prend ensuite le relais pour préfixer /fr ou /en.
  async redirects() {
    return [
      { source: "/about", destination: "/qui-sommes-nous", permanent: true },
      { source: "/about/", destination: "/qui-sommes-nous", permanent: true },
      { source: "/thematics", destination: "/thematiques", permanent: true },
      { source: "/thematics/", destination: "/thematiques", permanent: true },
      { source: "/donnation", destination: "/don", permanent: true },
      { source: "/donnation/", destination: "/don", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
