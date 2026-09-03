'use client';

import { Suspense, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from '@phosphor-icons/react';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { ASPA_DE_CIERRE } from '@/components/ui/aspa-de-cierre';

/**
 * La obra de marca del panel izquierdo: un video corto en bucle.
 *
 * Nico (2026-09-03): en vez de la imagen, el video, «comprimido sin que
 * pierda calidad y con un loop suave». Está codificado con el último segundo
 * fundido sobre el primero (`xfade` en ffmpeg), así que cuando `loop` lo
 * reinicia no hay corte: el cuadro final ES el cuadro inicial. WebM (VP9,
 * 2 MB) para quien lo soporte y MP4 (H.264 CRF 18, 4 MB) de respaldo; el
 * póster es el primer cuadro, para que no haya un rectángulo vacío mientras
 * baja. Sin sonido y `playsInline`: es lo que permite el autoplay en todos
 * los navegadores. Con `prefers-reduced-motion` el video se esconde y queda
 * el póster.
 */
const POSTER = '/brand/login-poster.jpg';

/**
 * Cuánto mide el panel del video en escritorio.
 *
 * El video es 16:9 y el panel va a toda la altura, así que su ancho «natural»
 * es `100vh × 16/9`: con eso se ve entero, sin recortar los lados. Antes era
 * un 52 % fijo y en un portátil se perdía la mitad del cuadro (Nico,
 * 2026-09-03: «al hacerlo así se pierde mucho del video, empujá a la derecha
 * todo el formulario»). El tope de `100vw − 30rem` le deja al formulario su
 * columna de 480 px (400 de formulario + 40 de aire a cada lado); en una
 * pantalla 16:9 el video queda apenas recortado, en una más alta se ve
 * completo.
 */
const ANCHO_DEL_VIDEO = 'min(calc(100vh * 16 / 9), calc(100vw - 30rem))';

function VideoDeMarca() {
  return (
    <>
      <Image
        src={POSTER}
        alt=""
        aria-hidden="true"
        fill
        priority
        quality={90}
        sizes="(min-width: 1024px) 80vw, 100vw"
        className="object-cover object-center"
      />
      <video
        className="absolute inset-0 h-full w-full object-cover object-center motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER}
        aria-hidden="true"
        tabIndex={-1}
        data-testid="auth-video"
      >
        <source src="/brand/login-loop.webm" type="video/webm" />
        <source src="/brand/login-loop.mp4" type="video/mp4" />
      </video>
    </>
  );
}

function AuthFormFallback() {
  return (
    <div className="w-full animate-pulse">
      <div className="mb-2 h-8 w-60 rounded bg-muted" />
      <div className="mb-9 h-4 w-64 rounded bg-muted" />
      <div className="space-y-4">
        <div className="h-11 rounded-xl bg-muted" />
        <div className="h-11 rounded-xl bg-muted" />
        <div className="h-11 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

/**
 * Entrada a Leasefy.
 *
 * Izquierda: la marca, en silencio. Una obra a sangre, el logotipo arriba y
 * **una** frase abajo. Antes había tres beneficios y tres métricas: en una
 * pantalla donde la única tarea es entrar, cada línea de más compite con el
 * formulario y no convence a nadie — quien llega acá ya decidió.
 *
 * Derecha: el formulario solo, sin caja. La jerarquía la hace la tipografía y
 * el aire, no un borde.
 */
export default function AuthPage() {
  return (
    <ForceLightMode>
      <div
        className="flex min-h-screen flex-col bg-background lg:flex-row"
        style={{ '--video-w': ANCHO_DEL_VIDEO } as CSSProperties}
        data-lenis-prevent
      >
        {/* ── Izquierda: la obra, sola ──────────────────────────────────── */}
        {/*
          Nada encima: ni logotipo, ni frase, ni velos. La marca ya está en el
          formulario de al lado, y cada capa que se le pone al video es una
          capa que lo ensucia. El fondo es el tono del propio video, así que
          mientras carga no hay un rectángulo fuera de tono.
        */}
        <div className="relative hidden overflow-hidden bg-[#0c1a2b] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[var(--video-w)]">
          <VideoDeMarca />
        </div>

        {/* ── Derecha: el formulario ────────────────────────────────────── */}
        <div className="relative w-full bg-background lg:ml-[var(--video-w)] lg:w-[calc(100%-var(--video-w))]">
          {/*
           * Una ✕ de cerrar, no un «← Inicio».
           *
           * Entrar a la pantalla de acceso es abrir algo encima del sitio, y
           * lo que se abre se cierra: la ✕ dice eso sin leerse. Va en la
           * esquina del panel —bien a la derecha, con el mismo aire que tiene
           * arriba (Nico, 2026-09-03)— y no dentro de la columna del
           * formulario, donde quedaba a mitad de pantalla.
           *
           * Es EL chip del producto (`ASPA_DE_CIERRE`), el mismo que cierra
           * los 40 modales, y no un dibujo propio de esta pantalla: acá hubo
           * un aro de trazo fino flotando en el aire que no se leía como botón.
           */}
          <Link
            href="/"
            aria-label="Cerrar y volver al inicio"
            title="Cerrar"
            className={`${ASPA_DE_CIERRE} absolute right-6 top-6 z-10 sm:right-8 sm:top-8`}
            data-testid="auth-cerrar"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </Link>

          <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8">
            {/* En móvil no hay panel izquierdo: la marca tiene que estar acá
                o la pantalla no dice de quién es. La fila mide lo que mide la
                ✕ (32px) para que las dos queden a la misma altura. */}
            <div className="mx-auto flex h-8 w-full max-w-[400px] items-center">
              <BrandHomeLink className="inline-flex items-center lg:hidden">
                <LeasefyLogotype size={20} className="text-fg" title="Leasefy" />
              </BrandHomeLink>
            </div>

            <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
              <Suspense fallback={<AuthFormFallback />}>
                <AuthForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
