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
      /**
       * www to the bare domain.
       *
       * Both hosts served the whole site at 200 with no redirect between them,
       * so every page existed twice and Google was left to guess which was
       * real. On the homepage it could not even use the canonical tag to
       * decide, because the homepage had none — which is how a site with
       * twelve pages ends up with three indexed.
       *
       * Done here rather than in the host's config because this is managed
       * hosting: the app is the only layer we control from the repository, and
       * a rule that ships with the code cannot be lost the next time the panel
       * is touched. Hostinger already handles http to https, so this covers
       * the remaining variant.
       *
       * `has` matches the Host header, so it fires only for www and cannot
       * loop on the destination.
       */
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.rideonclick.com" }],
        destination: "https://rideonclick.com/:path*",
        permanent: true,
      },
      {
        source: "/car-rentals",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
