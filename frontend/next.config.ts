import os from "node:os";
import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:5000").replace(
  /\/+$/,
  ""
);

const lanOrigins = Object.values(os.networkInterfaces())
  .flat()
  .filter((address) => address && address.family === "IPv4" && !address.internal)
  .map((address) => address!.address);

const nextConfig: NextConfig = {
  devIndicators: false,
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: [
    ...lanOrigins,
    "*.devtunnels.ms",
    "*.ngrok-free.app",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/socket.io",
        destination: `${backendUrl}/socket.io/`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
