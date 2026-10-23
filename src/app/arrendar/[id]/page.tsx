'use client';

/**
 * Arrendar un inmueble · paso 1 cumplido: «Felicitaciones. Te alcanza…».
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
import { Stagger, StaggerItem } from '@leasefy/cadence';
import { PasosDelArriendo } from '@/components/aprobacion/PasosDelArriendo';
import { ConfirmarSalidaDelArriendo } from '@/components/aprobacion/ConfirmarSalidaDelArriendo';
import { formatCurrency } from '@/lib/format';
import { enlaceAlEstudio } from '@/lib/aprobacion/estimado-de-arriendo';
import { leerArriendoEnCurso, nombreDelTipo, type ArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso';

interface Props {
  params: Promise<{ id: string }>;
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
  const { id } = use(params);
  const router = useRouter();
  const [arriendo, setArriendo] = useState<ArriendoEnCurso | null | undefined>(undefined);

  useEffect(() => {
    // Se llega desde «Verificar», a mitad de la ficha, y el App Router con Lenis
    // abría esta pantalla a esa misma altura (medido el 14-09: 518 px), con el
    // «¡Felicitaciones!» fuera de vista. Nico: «no me puso la pantalla arriba».
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  /*
   * Cerrar pregunta antes, igual que en el paso 2 (Nico, 2026-09-15): acá se
   * acaba de saber que le alcanza para ESTE inmueble, y quien cierra en la
   * celebración casi nunca vuelve a empezar el recorrido.
   */
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <BrandHomeLink aria-label="Leasefy — inicio" className="text-fg">
            <LeasefyLogotype size={24} />
          </BrandHomeLink>
          <Button
            variant="secondary"
            size="sm"
            hideArrow
            onClick={() => setConfirmandoSalida(true)}
            data-testid="cerrar-arrendar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      </header>

      <ConfirmarSalidaDelArriendo
        abierto={confirmandoSalida}
        onAbiertoChange={setConfirmandoSalida}
        tituloDelInmueble={arriendo?.titulo}
        onSalir={() => {
          setConfirmandoSalida(false);
          router.push(fichaHref);
        }}
      />

      {/*
        Glow up (ronda 26, UX antes 8,1 → 9,5): el paso dicho UNA vez (el Stepper de arriba; antes también el
        sobretítulo «Paso 1 de 3 · listo» y un segundo Stepper en «Lo que sigue»); la respuesta arriba, con su barra
        (cuánto de tu tope usa este canon) y dos cifras; una sola salida que pregunta (antes «Cerrar» preguntaba y
        «Volver al inmueble» y la tarjeta del inmueble se iban sin preguntar). UI Cadence 2: sin caja celeste ni
        degradado, títulos livianos, la plata en mono sin negrilla, esquinas de la casa.
      */}
      <main id="main-content" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-12">
        {arriendo === undefined ? (
          <div className="h-[28rem] animate-pulse rounded-lg bg-surface" aria-busy="true" />
        ) : arriendo ? (
          <Stagger className="flex flex-col gap-6">
            <StaggerItem>
              <section className="rounded-lg border border-border bg-surface px-5 py-4">
                <PasosDelArriendo actual={1} listo />
              </section>
            </StaggerItem>

            <StaggerItem>
              <section
                data-testid="te-alcanza"
                aria-labelledby="te-alcanza-titulo"
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <div className="flex flex-col gap-3 px-6 pt-8 md:px-8 md:pt-10">
                  {/* Ronda 30: el visto suelto, en verde, sin el círculo de color (Cadence 2). */}
                  <Check weight="bold" className="h-7 w-7 text-success" aria-hidden="true" />
                  <h1 id="te-alcanza-titulo" className="font-heading text-h1 font-normal leading-tight text-fg text-balance">
                    Felicitaciones
                  </h1>
                  <p className="text-lg text-fg-muted text-balance">
                    Te alcanza para este {nombreDelTipo(arriendo.tipo)}.
                  </p>
                </div>

                {/* LA RESPUESTA: cuánto de lo que puedes pagar usa este canon, con lo que te queda. */}
                <div className="flex flex-col gap-3 px-6 pt-6 md:px-8" data-testid="uso-del-tope">
                  <p className="text-sm text-fg">
                    Este canon usa el <span className="font-mono tabular-nums">{usoDelTope} %</span> de lo que tu ingreso te permite pagar.
                  </p>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="img"
                    aria-label={`Este canon usa el ${usoDelTope} % de lo que tu ingreso te permite pagar`}
                  >
                    <div className="h-full w-full rounded-full bg-success motion-safe:transition-transform motion-safe:duration-reveal motion-safe:ease-enter" style={{ transform: `translateX(${usoDelTope - 100}%)` }} />
                  </div>
                  <dl className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <dt className="text-caption text-fg-muted">Puedes pagar hasta</dt>
                      <dd className="font-mono text-xl tabular-nums text-fg">{formatCurrency(arriendo.canonMaximo)}</dd>
                    </div>
                    <div>
                      <dt className="text-caption text-fg-muted">Te quedan al mes</dt>
                      <dd className="font-mono text-xl tabular-nums text-fg">{formatCurrency(margen)}</dd>
                    </div>
                  </dl>
                  <p className="text-caption text-fg-muted">Es un cálculo con tu ingreso; la respuesta definitiva llega en el paso 3.</p>
                </div>

                {/* El inmueble, para saber de cuál se habla (no es una salida: salir se pregunta). */}
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-4 rounded-lg border border-border p-3" data-testid="el-inmueble">
                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                      {arriendo.foto ? (
                        <Image src={arriendo.foto} alt={arriendo.titulo} fill sizes="112px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-fg-muted">
                          <HouseLine className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-sm font-medium text-fg">{arriendo.titulo}</p>
                      {arriendo.ciudad && (
                        <p className="inline-flex items-center gap-1 text-caption text-fg-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {arriendo.ciudad}
                        </p>
                      )}
                      <p className="text-caption text-fg-muted">
                        <span className="font-mono tabular-nums text-fg">{formatCurrency(arriendo.canon)}</span> al mes
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section aria-labelledby="lo-que-sigue" className="rounded-lg border border-border bg-surface p-6 md:p-8">
                <h2 id="lo-que-sigue" className="font-heading text-xl font-normal text-fg">Lo que sigue</h2>
                <p className="mt-2 text-sm text-fg-muted">
                  En el paso 2 te pedimos tu nombre, cédula, celular y correo, y consultamos a las aseguradoras si respaldan tu
                  arriendo. En el paso 3 te decimos si te lo podemos arrendar y cómo seguir.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="ghost" hideArrow onClick={() => setConfirmandoSalida(true)} data-testid="volver-al-inmueble">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al inmueble
                  </Button>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link
                      data-testid="continuar-paso-2"
                      href={enlaceAlEstudio({ canon: arriendo.canon, ciudad: arriendo.ciudad, tipoDelEstudio: arriendo.tipo, paso2: true })}
                    >
                      Continuar al paso 2
                    </Link>
                  </Button>
                </div>
              </section>
            </StaggerItem>
          </Stagger>
        ) : null}
      </main>
    </div>
  );
}
