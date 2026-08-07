import Image from "next/image";

/**
 * Banner photograph for a service page.
 *
 * next/image rather than a bare <img>: these are large source files and it
 * handles the responsive sizes and lazy loading. `priority` is offered for the
 * one image above the fold on a given page — everything else should stay lazy.
 *
 * Sources are Unsplash, whose licence permits commercial use without
 * attribution. Credits are recorded in public/images/CREDITS.md anyway, so the
 * client can honour them or replace the files with their own photography.
 */
export function ServicePhoto({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <figure className="reveal mt-16 rounded-card overflow-hidden bg-dock relative">
      {/* Fixed aspect ratio so the portrait and landscape sources crop to the
          same band, and the page never reflows as images load. */}
      <div className="relative aspect-[16/7]">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
        {/* A wash toward the dock colour, so the photograph sits inside the
            palette instead of fighting it. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-dock/55 via-dock/10 to-transparent"
        />
      </div>
    </figure>
  );
}
