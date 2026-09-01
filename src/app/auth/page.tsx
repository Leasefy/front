'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X } from '@phosphor-icons/react';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForceLightMode } from '@/components/providers/ForceLightMode';

/**
 * La obra de marca que ocupa el panel izquierdo.
 *
 * Va con `next/image` y no como `background-image`: ahora que no hay nada
 * encima, la única tarea del panel es mostrarla bien. `next/image` sirve la
 * variante del tamaño del dispositivo (y en WebP donde se pueda) en vez de
 * mandar el JPEG entero para que el navegador lo reescale.
 */
const ARTE = '/brand/login.jpg';

function AuthFormFallback() {
  return (
    <div className="w-full animate-pulse">
      <div className="mb-4 h-3 w-16 rounded bg-muted" />
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
        data-lenis-prevent
      >
        {/* ── Izquierda: la obra, sola ──────────────────────────────────── */}
        {/*
          Nada encima: ni logotipo, ni frase, ni velos. La marca ya está en el
          formulario de al lado, y cada capa que se le pone a la obra es una
          capa que la ensucia. El crema de base es el de la propia pieza, así
          que mientras carga no hay un rectángulo gris fuera de tono.
        */}
        <div className="relative hidden overflow-hidden bg-[#EFE9E1] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[52%]">
          <Image
            src={ARTE}
            alt=""
            aria-hidden="true"
            fill
            priority
            quality={92}
            sizes="52vw"
            className="object-cover object-center"
          />
        </div>

        {/* ── Derecha: el formulario ────────────────────────────────────── */}
        <div className="w-full bg-background lg:ml-[52%] lg:w-[48%]">
          <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-16">
            <div className="mx-auto flex w-full max-w-[400px] items-center justify-between">
              {/* En móvil no hay panel izquierdo: la marca tiene que estar acá
                  o la pantalla no dice de quién es. */}
              <BrandHomeLink className="inline-flex items-center lg:hidden">
                <LeasefyLogotype size={20} className="text-fg" title="Leasefy" />
              </BrandHomeLink>

              {/*
               * Una X de cerrar, no un «← Inicio».
               *
               * Entrar a la pantalla de acceso es abrir algo encima del sitio,
               * y lo que se abre se cierra: la X dice eso sin leerse. Va a la
               * DERECHA —donde vive el cerrar en la web— y `ml-auto` la
               * mantiene ahí también en escritorio, donde la marca de al lado
               * está oculta y sin eso se iría al borde izquierdo.
               */}
              <Link
                href="/"
                aria-label="Cerrar y volver al inicio"
                title="Cerrar"
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                data-testid="auth-cerrar"
              >
                <X className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
              <Suspense fallback={<AuthFormFallback />}>
                <AuthForm />
              </Suspense>

              <p className="mt-10 text-[11.5px] leading-relaxed text-fg-subtle">
                Al continuar, aceptás nuestros{' '}
                <Link
                  href="/terminos"
                  className="text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  Términos
                </Link>{' '}
                y la{' '}
                <Link
                  href="/privacidad"
                  className="text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                >
                  Política de Privacidad
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </ForceLightMode>
  );
}
