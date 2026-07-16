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
 * The ~11MB closing WebP still (`landing/closing/cierre.webp`). It sits at
 * the END of a long scroll narrative, so it is NOT the initial-viewport LCP
 * element — never mark it `priority`. Rendered lazily with a tiny
 * blurDataURL placeholder inside a fixed-aspect-ratio box so there is no
 * layout shift while it loads (design ADR-7).
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
        placeholder="blur"
        blurDataURL={cierre.blurDataURL}
        sizes="100vw"
        style={{ objectFit: 'cover' }}
      />
    </div>
  )
}
