import Image, { type ImageProps } from 'next/image'
import { LANDING_CLOSING } from '@/lib/landing/assets'

type LandingImageProps = Omit<ImageProps, 'width' | 'height'> & {
  width: number
  height: number
}

/**
 * Shared `next/image` wrapper for the landing port. Requires explicit
 * `width`/`height` (prevents CLS) — never render a landing raster asset
 * through a bare `<Image>` without them.
 */
export function LandingImage({ width, height, alt, ...rest }: LandingImageProps) {
  return <Image width={width} height={height} alt={alt} {...rest} />
}

/**
 * The closing section's animated WebP (`landing/closing/cierre.webp`,
 * 234 frames). `next/image` refuses to resize animated images (verified at
 * runtime — every `w=` variant returns the exact same byte count), so
 * `unoptimized` is set deliberately: it isn't a missed opportunity, it is
 * documenting a real constraint. The file itself was pre-downscaled once at
 * asset-build time (see assets.ts) since that is the only place resizing an
 * animated WebP actually works. It sits at the END of a long scroll
 * narrative, so it is NOT the initial-viewport LCP element — never mark it
 * `priority`. Rendered lazily with a tiny blurDataURL placeholder inside a
 * fixed-aspect-ratio box so there is no layout shift while it loads.
 */
export function ClosingImage({ className }: { className?: string }) {
  const { cierre } = LANDING_CLOSING
  return (
    <div
      data-testid="closing-image-box"
      className={className}
      style={{ position: 'relative', width: '100%', aspectRatio: `${cierre.width} / ${cierre.height}` }}
    >
      <Image
        src={cierre.src}
        alt=""
        fill
        loading="lazy"
        unoptimized
        placeholder="blur"
        blurDataURL={cierre.blurDataURL}
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}
