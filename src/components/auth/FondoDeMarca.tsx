'use client';

import Image from 'next/image';

/**
 * La obra de marca de las pantallas de acceso: un video corto en bucle.
 *
 * Nico (2026-09-03): en vez de la imagen, el video, «comprimido sin que pierda
 * calidad y con un loop suave». Está codificado con el último segundo fundido
 * sobre el primero (`xfade` en ffmpeg), así que cuando `loop` lo reinicia no
 * hay corte: el cuadro final ES el cuadro inicial. WebM (VP9, 2 MB) para quien
 * lo soporte y MP4 (H.264 CRF 18, 4 MB) de respaldo; el póster es el primer
 * cuadro, para que no haya un rectángulo vacío mientras baja. Sin sonido y
 * `playsInline`: es lo que permite el autoplay en todos los navegadores. Con
 * `prefers-reduced-motion` el video se esconde y queda el póster.
 *
 * ── 🔴 22-09 · Por qué salió de `auth/page.tsx` ───────────────────────────
 *
 * Porque entrar son DOS pantallas, no una. Quien tiene segundo factor pasa por
 * `/auth` y cae en `/auth/mfa-verify`, y esa segunda era una página blanca
 * pelada: el corte se veía como si el producto se hubiera acabado a mitad del
 * acto. Es la misma pieza, así que es el mismo componente.
 *
 * Las dos veladuras van acá y no en la página: existen por una razón concreta
 * —el video es claro y el logotipo blanco se perdía según qué cuadro quedara
 * debajo (Nico, 2026-09-03: «hay veces el logo se pierde»)— y quien reutilice
 * el fondo se las lleva sin tener que saber por qué.
 */
const POSTER = '/brand/login-poster.jpg';

export function FondoDeMarca() {
  return (
    <div className="fixed inset-0 hidden overflow-hidden bg-[#0c1a2b] lg:block" aria-hidden="true">
      <Image
        src={POSTER}
        alt=""
        aria-hidden="true"
        fill
        priority
        quality={90}
        sizes="100vw"
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
      {/*
        Dos veladuras oscuras, apenas, en las esquinas de la izquierda: una
        arriba para el logotipo y otra abajo para los testimonios. El centro y
        la derecha quedan limpios.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(20,19,15,0.55) 0%, rgba(20,19,15,0) 26%), radial-gradient(90% 75% at 0% 100%, rgba(20,19,15,0.72) 0%, rgba(20,19,15,0.35) 40%, rgba(20,19,15,0) 70%)',
        }}
      />
    </div>
  );
}
