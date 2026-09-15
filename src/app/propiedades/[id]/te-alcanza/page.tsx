'use client';

/**
 * Paso 1 de 3 cumplido: «¡Felicitaciones! Te alcanza para este apartamento».
 *
 * Nico, 2026-09-14: al tocar «Verificar» con un ingreso que alcanza, en vez de
 * saltar directo al formulario del estudio, la persona ve una pantalla que
 * celebra, le muestra en qué paso va y le explica los dos que siguen: validar
 * sus datos con las aseguradoras (paso 2) y la respuesta (paso 3).
 *
 * El estimado sale de `arriendo-en-curso` (lo guardó la tarjeta de la ficha).
 * Sin él —alguien que abrió este enlace suelto— se vuelve a la ficha: sin
 * ingreso no hay nada que felicitar.
 */

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, IdentificationCard, ShieldCheck, Key } from '@phosphor-icons/react';
import { LandingChrome } from '@/components/landing-v2/LandingChrome';
import { LandingFooterV2 } from '@/components/landing-v2/LandingFooterV2';
import { Button } from '@/components/ui/button';
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo';
import { formatCurrency } from '@/lib/format';
import { enlaceAlEstudio } from '@/lib/aprobacion/estimado-de-arriendo';
import { leerArriendoEnCurso, nombreDelTipo, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

interface Props {
  params: Promise<{ id: string }> | { id: string };
}

export default function TeAlcanzaPage({ params }: Props) {
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
  }, [id, router]);

  const holgura = arriendo ? Math.min(100, Math.round((arriendo.canon / Math.max(arriendo.canonMaximo, 1)) * 100)) : 0;

  return (
    <LandingChrome activo="inmuebles">
      <main id="main-content" className="bg-surface-muted pt-16 lg:pt-[76px]">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:py-14">
          {arriendo === undefined ? (
            <div className="h-96 animate-pulse rounded-2xl bg-surface" aria-busy="true" />
          ) : arriendo ? (
            <>
              <PasosDelArriendo actual={1} className="rounded-2xl border border-border bg-surface p-4" />

              <section
                data-testid="te-alcanza"
                aria-labelledby="te-alcanza-titulo"
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
              >
                <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="relative aspect-[4/3] w-full bg-surface-muted md:aspect-auto md:min-h-full">
                    {arriendo.foto ? (
                      <Image src={arriendo.foto} alt={arriendo.titulo} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-fg-muted">
                        <Key className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-5 p-6 md:p-8">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle weight="fill" className="h-6 w-6" aria-hidden="true" />
                      <span className="text-caption font-medium uppercase tracking-wide">Paso 1 de 3 listo</span>
                    </div>
                    <div>
                      <h1 id="te-alcanza-titulo" className="font-heading text-3xl font-semibold leading-tight text-fg text-balance md:text-4xl">
                        ¡Felicitaciones! Te alcanza para este {nombreDelTipo(arriendo.tipo)}
                      </h1>
                      <p className="mt-2 text-sm text-fg-muted">
                        {arriendo.titulo}
                        {arriendo.ciudad ? ` · ${arriendo.ciudad}` : ''}
                      </p>
                    </div>

                    <div className="rounded-xl bg-success-soft p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-fg-muted">Canon del inmueble</span>
                        <span className="font-mono text-lg font-semibold tabular-nums text-fg">{formatCurrency(arriendo.canon)}</span>
                      </div>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-surface"
                        role="img"
                        aria-label={`El canon usa el ${holgura} % de lo que tu ingreso te permite pagar`}
                      >
                        <div className="h-full rounded-full bg-success" style={{ width: `${holgura}%` }} />
                      </div>
                      <div className="mt-2 flex items-baseline justify-between gap-3 text-caption text-fg-muted">
                        <span>Con tu ingreso podrías pagar hasta</span>
                        <span className="font-mono tabular-nums text-fg">{formatCurrency(arriendo.canonMaximo)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section aria-labelledby="lo-que-sigue" className="rounded-2xl border border-border bg-surface p-6 md:p-8">
                <h2 id="lo-que-sigue" className="font-heading text-xl font-semibold text-fg">Lo que sigue</h2>
                <ol className="mt-5 flex flex-col gap-5">
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <IdentificationCard className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">Paso 2 · Validamos que te lo podamos arrendar</p>
                      <p className="mt-1 text-sm text-fg-muted">
                        Te pedimos tu nombre, cédula, celular y correo, y consultamos a las aseguradoras si respaldan
                        tu arriendo. Que te alcance es el primer filtro; esto es lo que lo confirma.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg">Paso 3 · Te damos tu respuesta</p>
                      <p className="mt-1 text-sm text-fg-muted">
                        Si te aprueban, te decimos cómo postularte a este inmueble. Si por ahora no, te mostramos otros
                        que sí van contigo.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button asChild variant="ghost">
                    <Link href={`/propiedades/${arriendo.propertyId}`}>
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Volver al inmueble
                    </Link>
                  </Button>
                  <Button asChild size="lg">
                    <Link
                      data-testid="continuar-paso-2"
                      href={enlaceAlEstudio({
                        canon: arriendo.canon,
                        ciudad: arriendo.ciudad,
                        tipo: null,
                        tipoDelEstudio: arriendo.tipo,
                        paso2: true,
                      })}
                    >
                      Continuar al paso 2
                    </Link>
                  </Button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
      <LandingFooterV2 />
    </LandingChrome>
  );
}
