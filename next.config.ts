import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["handlebars"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2w9rnfcy7mm78.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "images.are.na",
      },
    ],
  },
};

export default nextConfig;
