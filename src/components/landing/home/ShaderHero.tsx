'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'
import { LandingImage } from '@/components/landing/media/LandingImage'
import { LANDING_HERO_FALLBACK, LANDING_PHOTOS } from '@/lib/landing/assets'

// `ssr:false` per design (§4): the WebGL canvas must never run during SSR
// or the first hydration pass. `ShaderCanvas` mounts only once this
// component confirms (client-side, post-paint) that WebGL is available
// and motion is not reduced.
const ShaderCanvas = dynamic(() => import('./ShaderCanvas').then((mod) => ({ default: mod.ShaderCanvas })), {
  ssr: false,
})

function detectWebglSupport(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl')
  } catch {
    return false
  }
}

/**
 * Home's opening beat. The heading/lead/CTAs render as real DOM
 * immediately — that text is the true LCP element, never blocked by
 * WebGL. The canvas mounts in a `useEffect` after first paint, gated on
 * WebGL support; reduced-motion users and no-WebGL browsers get a static
 * poster (`LANDING_HERO_FALLBACK`) instead — content is always visible.
 */
export function ShaderHero() {
  const prefersReducedMotion = useReducedMotion()
  const [webglSupported, setWebglSupported] = useState(false)
  const [canvasError, setCanvasError] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) return
    setWebglSupported(detectWebglSupport())
  }, [prefersReducedMotion])

  const showCanvas = webglSupported && !prefersReducedMotion && !canvasError

  return (
    <section className="landing-hero" data-testid="shader-hero">
      <div className="landing-hero__field" aria-hidden="true">
        {showCanvas ? (
          <ShaderCanvas onError={() => setCanvasError(true)} />
        ) : (
          <LandingImage
            src={LANDING_HERO_FALLBACK.src}
            width={LANDING_HERO_FALLBACK.width}
            height={LANDING_HERO_FALLBACK.height}
            alt=""
            data-testid="shader-hero-fallback"
            className="landing-hero__fallback"
          />
        )}
      </div>

      <div className="landing-hero__content">
        <h1>Tu operación inmobiliaria en piloto automático</h1>
        <p className="landing-hero__lead">
          Leasefy combina CRM, ERP y agentes AI para centralizar y automatizar toda tu operación
          de arriendos — de la solicitud a la retención del propietario.
        </p>
        <div className="landing-hero__ctas">
          <Link href="/registro" className="btn primary lg">
            Empezar ahora
          </Link>
          <Link href="/pricing" className="btn outline lg">
            Ver planes
          </Link>
        </div>
      </div>

      <div className="landing-hero__frame">
        <LandingImage
          src={LANDING_PHOTOS.heroScreenshot.src}
          width={LANDING_PHOTOS.heroScreenshot.width}
          height={LANDING_PHOTOS.heroScreenshot.height}
          alt="Vista previa del panel de Leasefy"
          priority
        />
      </div>
    </section>
  )
}
