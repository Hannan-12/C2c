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

  /**
   * /car-rentals was live, listed in the sitemap and submitted to Search
   * Console, so it is likely indexed. Removing the service without a redirect
   * would turn every one of those results into a 404 and discard the link
   * equity with it.
   *
   * It points at the homepage rather than at a service page: self-drive rental
   * has no equivalent among the remaining services, and sending someone
   * looking to rent a car to a chauffeur page is a worse answer than showing
   * them what the business does offer.
   */
  async redirects() {
    return [
      {
        source: "/car-rentals",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
