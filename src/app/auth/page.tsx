'use client';

import { Suspense } from 'react';
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
 * El video ocupa TODA la pantalla y el formulario flota encima, en una
 * tarjeta a la derecha (Nico, 2026-09-03). Antes era un panel partido —52 %,
 * después «el ancho natural»— y en cualquier pantalla 16:9 el video terminaba
 * recortado, porque un 16:9 a toda la altura nunca cabe al lado de una
 * columna de formulario. A pantalla completa se ve entero, sin «zoom».
 *
 * La tarjeta mide 480 px (400 de formulario + 40 de aire por lado), va
 * centrada en vertical y, si el contenido no cabe (registro en una pantalla
 * baja), se desplaza por dentro. En móvil no hay video: la tarjeta ES la
 * pantalla, a todo el ancho, como siempre.
 */
export default function AuthPage() {
  return (
    <ForceLightMode>
      <div className="relative min-h-screen bg-background" data-lenis-prevent>
        {/* ── El video, a pantalla completa (sólo escritorio) ─────────────── */}
        {/*
          Nada encima: ni logotipo, ni frase, ni velos. La marca ya está en la
          tarjeta, y cada capa que se le pone al video es una capa que lo
          ensucia. El fondo es el tono del propio video, así que mientras carga
          no hay un rectángulo fuera de tono.
        */}
        <div className="fixed inset-0 hidden overflow-hidden bg-[#0c1a2b] lg:block" aria-hidden="true">
          <VideoDeMarca />
        </div>

        {/* ── La tarjeta del formulario ──────────────────────────────────── */}
        <div className="relative flex min-h-screen flex-col lg:flex-row lg:items-center lg:justify-end lg:p-8">
          <div
            className="relative flex w-full flex-col px-6 py-6 sm:px-10 sm:py-8 lg:max-h-[calc(100vh-4rem)] lg:w-[480px] lg:overflow-y-auto lg:rounded-lg lg:bg-surface lg:p-10 lg:shadow-[0_24px_64px_-16px_rgba(20,19,15,0.45)] lg:ring-1 lg:ring-black/5"
            data-lenis-prevent
            data-testid="auth-tarjeta"
          >
            {/*
             * Una ✕ de cerrar, no un «← Inicio».
             *
             * Entrar a la pantalla de acceso es abrir algo encima del sitio, y
             * lo que se abre se cierra: la ✕ dice eso sin leerse. Va en la
             * esquina de la tarjeta, con el mismo aire arriba que a la derecha
             * (Nico, 2026-09-03).
             *
             * Es EL chip del producto (`ASPA_DE_CIERRE`), el mismo que cierra
             * los 40 modales, y no un dibujo propio de esta pantalla: acá hubo
             * un aro de trazo fino flotando en el aire que no se leía como botón.
             */}
            <Link
              href="/"
              aria-label="Cerrar y volver al inicio"
              title="Cerrar"
              className={`${ASPA_DE_CIERRE} absolute right-6 top-6 z-10 sm:right-8 sm:top-8 lg:right-6 lg:top-6`}
              data-testid="auth-cerrar"
            >
              <X size={16} weight="bold" aria-hidden="true" />
            </Link>

            {/* En móvil no hay video: la marca tiene que estar acá o la
                pantalla no dice de quién es. La fila mide lo que mide la ✕
                (32px) para que las dos queden a la misma altura. */}
            <div className="mx-auto flex h-8 w-full max-w-[400px] items-center lg:hidden">
              <BrandHomeLink className="inline-flex items-center">
                <LeasefyLogotype size={20} className="text-fg" title="Leasefy" />
              </BrandHomeLink>
            </div>

            <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12 lg:justify-start lg:py-0 lg:pt-8">
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
