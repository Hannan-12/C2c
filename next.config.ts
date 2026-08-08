import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next's dev-tools button renders bottom-left by default, directly over the
   * dock's footer links and copyright. Moving it right keeps it available
   * (compile and runtime errors still surface) without covering our own UI.
   * Development only — it never renders in production.
   */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
