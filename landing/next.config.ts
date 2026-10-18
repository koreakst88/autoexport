import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  output: "standalone",
  turbopack: { root: path.resolve(__dirname) },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.koredigital.co.kr" }],
        destination: "https://koredigital.co.kr/:path*",
        permanent: true,
      },
    ];
  },
};
export default config;
