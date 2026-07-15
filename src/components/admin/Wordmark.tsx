/**
 * "nest" wordmark — brandbook source-crop PNG (blue / white). Assets live in
 * public/admin/brand. Plain <img> so intrinsic sizing isn't rasterized.
 */
export function Wordmark({
  className = '',
  size = 'md',
  variant = 'blue',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'blue' | 'white'
}) {
  const heights = { sm: 22, md: 32, lg: 64, xl: 120 } as const
  const h = heights[size]
  const w = Math.round((263 / 106) * h)
  const src = variant === 'white' ? '/admin/brand/nest-wordmark-white.png' : '/admin/brand/nest-wordmark.png'

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="nest" width={w} height={h} className={`select-none ${className}`} draggable={false} />
}
