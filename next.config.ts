import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Mandat wurde zu Projekt umbenannt (Phase 5) - alte Links/Lesezeichen
      // sollen nicht einfach ins Leere laufen.
      {
        source: "/mandate",
        destination: "/projekte",
        permanent: false,
      },
      {
        source: "/mandate/:path*",
        destination: "/projekte/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
