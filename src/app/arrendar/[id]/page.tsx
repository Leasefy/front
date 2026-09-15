'use client';

/**
 * Arrendar un inmueble · paso 1 cumplido: «¡Felicitaciones! Te alcanza…».
 *
 * Nico, 2026-09-14: vive en una instancia propia, sin la landing (sin menú ni
 * pie): sólo el recorrido de tres pasos, con el `Stepper` de la casa. Celebra
 * de verdad (confeti, salvo con «reducir movimiento»), muestra el inmueble, el
 * margen que le deja su ingreso y lo que sigue.
 *
 * El estimado sale de `arriendo-en-curso` (lo guardó la tarjeta de la ficha).
 * Sin él —un enlace suelto— se vuelve a la ficha: sin ingreso no hay nada que
 * felicitar.
 */

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, HouseLine, MapPin, X } from '@phosphor-icons/react';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { LeasefyLogotype } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo';
import { formatCurrency } from '@/lib/format';
import { enlaceAlEstudio } from '@/lib/aprobacion/estimado-de-arriendo';
import { leerArriendoEnCurso, nombreDelTipo, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

function celebrar() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colores = ['#1A40FF', '#8A9CFF', '#2F9E6B', '#ffffff'];
  confetti({ particleCount: 90, spread: 80, startVelocity: 38, origin: { y: 0.35 }, colors: colores });
  // Ráfagas contadas desde los costados, no «hasta que pase el tiempo»: un
  // ciclo atado al reloj no termina donde el reloj no avanza (pruebas).
  for (let i = 1; i <= 6; i++) {
    window.setTimeout(() => {
      confetti({ particleCount: 14, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: colores });
      confetti({ particleCount: 14, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: colores });
    }, i * 170);
  }
}

export default function ArrendarPage({ params }: Props) {
  const { id } = params instanceof Promise ? use(params) : params;
  const router = useRouter();
  const [arriendo, setArriendo] = useState<ArriendoEnCurso | null | undefined>(undefined);

  useEffect(() => {
    const leido = leerArriendoEnCurso(id);
    if (!leido) {
      router.replace(`/propiedades/${id}`);
      return;
    }
    setArriendo(leido);
    celebrar();
  }, [id, router]);

  const usoDelTope = arriendo ? Math.min(100, Math.round((arriendo.canon / Math.max(arriendo.canonMaximo, 1)) * 100)) : 0;
  const margen = arriendo ? Math.max(0, arriendo.canonMaximo - arriendo.canon) : 0;
  const fichaHref = `/propiedades/${id}`;

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <BrandHomeLink aria-label="Leasefy — inicio" className="text-fg">
            <LeasefyLogotype size={24} />
          </BrandHomeLink>
          <Button asChild variant="secondary" size="sm" hideArrow>
            <Link href={fichaHref}>
              <X className="h-4 w-4" aria-hidden="true" />
              Cerrar
            </Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
        {arriendo === undefined ? (
          <div className="h-[28rem] animate-pulse rounded-2xl bg-surface" aria-busy="true" />
        ) : arriendo ? (
          <>
            <section className="rounded-2xl border border-border bg-surface px-5 py-4">
              <PasosDelArriendo actual={1} listo />
            </section>

            <section
              data-testid="te-alcanza"
              aria-labelledby="te-alcanza-titulo"
              className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
            >
              <div className="relative flex flex-col items-center gap-5 bg-primary-soft px-6 pb-8 pt-10 text-center md:px-10">
                <span className="relative flex h-20 w-20 items-center justify-center">
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-success/15 motion-safe:animate-ping" />
                  <span aria-hidden="true" className="absolute inset-2 rounded-full bg-success/25" />
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-md">
                    <Check weight="bold" className="h-7 w-7" aria-hidden="true" />
                  </span>
                </span>
                <div className="flex flex-col gap-2">
                  <p className="text-caption font-medium uppercase tracking-wide text-primary">Paso 1 de 3 · listo</p>
                  <h1 id="te-alcanza-titulo" className="font-heading text-3xl font-semibold leading-tight text-fg text-balance md:text-5xl">
                    ¡Felicitaciones!
                  </h1>
                  <p className="font-heading text-xl text-fg text-balance md:text-2xl">
                    Te alcanza para este {nombreDelTipo(arriendo.tipo)}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:p-8">
                <Link
                  href={fichaHref}
                  className="group overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative aspect-[4/3] w-full bg-surface-muted">
                    {arriendo.foto ? (
                      <Image src={arriendo.foto} alt={arriendo.titulo} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary-soft to-surface-muted text-primary">
                        <HouseLine weight="duotone" className="h-14 w-14" aria-hidden="true" />
                        <span className="text-caption text-fg-muted">Tu próximo hogar</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1 font-mono text-sm font-semibold tabular-nums text-fg shadow-sm">
                      {formatCurrency(arriendo.canon)}
                      <span className="font-sans text-caption font-normal text-fg-muted"> /mes</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 p-4">
                    <p className="text-sm font-semibold text-fg">{arriendo.titulo}</p>
                    {arriendo.ciudad && (
                      <p className="inline-flex items-center gap-1 text-caption text-fg-muted">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {arriendo.ciudad}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="flex flex-col justify-center gap-5">
                  <div>
                    <p className="text-sm text-fg-muted">Con tu ingreso podrías pagar hasta</p>
                    <p className="font-mono text-3xl font-semibold tabular-nums text-fg">{formatCurrency(arriendo.canonMaximo)}</p>
                  </div>
                  <div>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-surface-muted"
                      role="img"
                      aria-label={`Este canon usa el ${usoDelTope} % de lo que tu ingreso te permite pagar`}
                    >
                      <div className="h-full rounded-full bg-success motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${usoDelTope}%` }} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-3 text-caption text-fg-muted">
                      <span>Este canon usa el {usoDelTope} %</span>
                      <span>
                        Margen <span className="font-mono tabular-nums text-fg">{formatCurrency(margen)}</span> al mes
                      </span>
                    </div>
                  </div>
                  <p className="text-caption text-fg-muted">Es un cálculo con tu ingreso; la respuesta definitiva llega en el paso 3.</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="lo-que-sigue" className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <h2 id="lo-que-sigue" className="font-heading text-xl font-semibold text-fg">Lo que sigue</h2>
              <p className="mt-1 text-sm text-fg-muted">
                En el paso 2 te pedimos tu nombre, cédula, celular y correo, y consultamos a las aseguradoras si respaldan tu
                arriendo. En el paso 3 te decimos si te lo podemos arrendar y cómo seguir.
              </p>
              <PasosDelArriendo actual={2} orientation="vertical" conDescripcion className="mt-6" />
              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button asChild variant="ghost" hideArrow>
                  <Link href={fichaHref}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al inmueble
                  </Link>
                </Button>
                <Button asChild size="lg">
                  <Link
                    data-testid="continuar-paso-2"
                    href={enlaceAlEstudio({ canon: arriendo.canon, ciudad: arriendo.ciudad, tipoDelEstudio: arriendo.tipo, paso2: true })}
                  >
                    Continuar al paso 2
                  </Link>
                </Button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
