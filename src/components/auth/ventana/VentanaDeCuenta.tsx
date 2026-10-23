'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Check } from '@phosphor-icons/react';

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { LeasefyLogotype } from '@/components/brand/LeasefySymbol';
import { cn } from '@/lib/utils';

/**
 * ══ LA VENTANA DE CUENTA ════════════════════════════════════════════════════
 *
 * Nico (19-10-2026): «DALE UN GLOW UP AL LOGIN, ALGO HERMOSO POR MÁS QUE SEA UN
 * MODAL». La cuenta que se abre ENCIMA de otra pantalla (publicar, seguir a una
 * inmobiliaria, pagar el estudio) era un formulario suelto en un modal de 448 px.
 * Ahora es la misma familia que la pantalla de entrar (`/auth`):
 *
 *     ┌──────────────────────┬──────────────────────────────┐
 *     │  Leasefy             │                         (✕)  │
 *     │                      │  título                      │
 *     │   la obra de marca   │  el formulario               │
 *     │   (el video de       │                              │
 *     │   /auth) + lo que    │                              │
 *     │   la abre            │                              │
 *     └──────────────────────┴──────────────────────────────┘
 *
 * En el celular la obra se va (no cabe) y queda una banda de marca arriba de la
 * hoja que sube desde abajo. El lado derecho es lo único que se desplaza.
 */
const POSTER = '/brand/login-poster.jpg';

export function VentanaDeCuenta({
  abierta,
  alCambiar,
  titulo,
  descripcion,
  obra,
  children,
  testId = 'ventana-de-cuenta',
}: {
  abierta: boolean;
  alCambiar: (abierta: boolean) => void;
  /** Para el lector de pantalla: qué ventana es. */
  titulo: string;
  descripcion: string;
  /** El lado izquierdo, sobre el video de marca (escritorio). */
  obra: ReactNode;
  /** El lado derecho: el formulario. */
  children: ReactNode;
  testId?: string;
}) {
  return (
    <Dialog open={abierta} onOpenChange={alCambiar}>
      <DialogContent size="xl" data-testid={testId}>
        <DialogBody className="flex flex-col p-0 sm:px-0 md:grid md:h-[min(640px,calc(100dvh-48px))] md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)]">
          <DialogTitle className="sr-only">{titulo}</DialogTitle>
          <DialogDescription className="sr-only">{descripcion}</DialogDescription>

          <aside className="hidden md:block" data-testid="ventana-obra">
            <ObraDeMarca>{obra}</ObraDeMarca>
          </aside>

          <div className="flex min-h-0 flex-col">
            <BandaDeMarca />
            <div
              className="min-h-0 flex-1 px-6 pb-7 pt-6 sm:px-9 sm:pb-9 sm:pt-9 md:overflow-y-auto"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain' }}
            >
              {children}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/**
 * El lado izquierdo: el video de marca de `/auth` (mismo póster, mismo bucle sin
 * corte), el logotipo en blanco arriba y, abajo, lo que diga quien abre la
 * ventana. Una veladura sólo arriba y abajo, para que el blanco se lea sobre
 * cualquier cuadro (Nico, 03-09: «hay veces el logo se pierde»).
 */
export function ObraDeMarca({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('relative isolate flex h-full min-h-[560px] flex-col overflow-hidden bg-[#0c1a2b] text-white', className)}>
      <Image src={POSTER} alt="" aria-hidden="true" fill sizes="380px" className="-z-20 object-cover object-[38%_50%]" />
      <video
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[38%_50%] motion-reduce:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={POSTER}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/brand/login-loop.webm" type="video/webm" />
        <source src="/brand/login-loop.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgba(20,19,15,0.55) 0%, rgba(20,19,15,0.08) 22%, rgba(20,19,15,0.12) 48%, rgba(20,19,15,0.86) 100%)',
        }}
      />
      <div className="px-8 pt-8">
        <LeasefyLogotype size={22} className="text-white" title="Leasefy" />
      </div>
      <div className="mt-auto px-8 pb-8">{children}</div>
    </div>
  );
}

/** El título y las razones de la obra: blanco sobre la veladura de abajo. */
export function TextoDeLaObra({ titulo, detalle, razones }: { titulo: string; detalle?: string; razones?: string[] }) {
  return (
    <div>
      <p className="text-[24px] font-medium leading-[1.15] tracking-[-0.02em] text-white lg:text-[26px]">{titulo}</p>
      {detalle && <p className="mt-2.5 text-[14px] leading-relaxed text-white/80">{detalle}</p>}
      {razones && razones.length > 0 && (
        <ul className="mt-5 space-y-2">
          {razones.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-white/85">
              <span className="mt-[1px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <Check size={11} weight="bold" aria-hidden="true" />
              </span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** En el celular no cabe la obra: una banda de marca arriba de la hoja. */
function BandaDeMarca() {
  return (
    <div className="relative h-24 shrink-0 overflow-hidden md:hidden" aria-hidden="true">
      <Image src={POSTER} alt="" fill sizes="100vw" className="object-cover object-[50%_42%]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
      <div className="absolute left-6 top-5">
        <LeasefyLogotype size={18} className="text-white" />
      </div>
    </div>
  );
}
