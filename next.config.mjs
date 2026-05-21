/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ci.encar.com",
        pathname: "/**",
      },
    ],
  },
  // Ignore ESLint errors during production builds.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
