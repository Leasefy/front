'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';

import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForceLightMode } from '@/components/providers/ForceLightMode';

/**
 * La obra de marca que ocupa el panel izquierdo.
 *
 * Va como `background-image` sobre el degradado, NO como <Image>: si el
 * archivo no está, se ve el degradado y no el ícono de imagen rota. Un fondo
 * que falta tiene que degradar a algo que parezca elegido.
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
        {/* ── Izquierda: la marca ───────────────────────────────────────── */}
        <div className="relative hidden overflow-hidden bg-[#EFE9E1] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[52%]">
          {/*
            La obra manda, así que el texto va OSCURO sobre ella y no blanco:
            es una pieza clara y cálida, y taparla con un velo azul para poder
            escribir en blanco encima sería usarla de fondo en vez de mostrarla.
            El color base es el de la obra, no el degradado de marca — si el
            archivo faltara, lo que se ve sigue siendo legible con el mismo
            texto, que es la condición para que un fondo pueda faltar.
          */}
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${ARTE}')` }}
            aria-hidden="true"
          />

          {/* Dos velos claros, apenas: uno arriba para el logotipo, otro abajo
              para la frase. Sin esto la legibilidad depende de qué zona de la
              foto quede debajo, que cambia con cada alto de ventana. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-[1]"
            style={{
              background:
                'linear-gradient(to bottom, rgba(247,244,240,0.82) 0%, rgba(247,244,240,0) 24%), linear-gradient(to top, rgba(247,244,240,0.90) 0%, rgba(247,244,240,0.35) 22%, rgba(247,244,240,0) 42%)',
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 lg:p-12">
            {/* El logotipo de la sidebar. Pinta con `currentColor`: acá va en
                el gris casi negro de la marca, no en blanco, porque el fondo
                es claro. */}
            <BrandHomeLink className="inline-flex w-fit items-center">
              <LeasefyLogotype size={26} className="text-[#141414]" title="Leasefy" />
            </BrandHomeLink>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[15ch] font-heading text-[34px] font-medium leading-[1.12] tracking-[-0.025em] text-[#141414] lg:text-[40px]"
            >
              Todo el arriendo, en un solo lugar.
            </motion.p>
          </div>
        </div>

        {/* ── Derecha: el formulario ────────────────────────────────────── */}
        <div className="w-full bg-background lg:ml-[52%] lg:w-[48%]">
          <div className="flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8 lg:px-16">
            <div className="mx-auto flex w-full max-w-[400px] items-center justify-between">
              <Link
                href="/"
                className="group inline-flex items-center gap-1.5 text-[13px] text-fg-subtle transition-colors hover:text-fg"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                Inicio
              </Link>

              {/* En móvil no hay panel izquierdo: la marca tiene que estar acá
                  o la pantalla no dice de quién es. */}
              <BrandHomeLink className="inline-flex items-center lg:hidden">
                <LeasefyLogotype size={20} className="text-fg" title="Leasefy" />
              </BrandHomeLink>
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
