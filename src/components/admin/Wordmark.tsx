/**
 * "nest" wordmark — brandbook source-crop PNG (blue / white). Assets live in
 * public/admin/brand. Plain <img> so intrinsic sizing isn't rasterized.
 *
 * `ink`: el mismo PNG en negro (Nico, 03-10-2026: «pon el logo de la sidebar en
 * todas las plataformas negro así como el de la landing»). No hay PNG negro:
 * `brightness(0)` lleva cada píxel azul a negro y respeta la transparencia y el
 * borde suavizado. El /admin no tiene tema oscuro (papel y tinta fijos).
 */
export function Wordmark({
  className = '',
  size = 'md',
  variant = 'blue',
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'blue' | 'white' | 'ink'
}) {
  const heights = { sm: 22, md: 32, lg: 64, xl: 120 } as const
  const h = heights[size]
  const w = Math.round((263 / 106) * h)
  const src = variant === 'white' ? '/admin/brand/nest-wordmark-white.png' : '/admin/brand/nest-wordmark.png'
  const tinta = variant === 'ink' ? ' brightness-0' : ''

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="nest" width={w} height={h} className={`select-none${tinta} ${className}`} draggable={false} />
}
