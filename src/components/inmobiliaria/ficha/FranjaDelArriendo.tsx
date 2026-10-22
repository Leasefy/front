'use client';

/**
 * La franja viva de la portada del inmueble: QUIÉN VIVE · HASTA CUÁNDO · QUIÉN
 * LO LLEVA (revisión de diseño de la ficha, 21-10-2026).
 *
 * Es la pregunta con la que se abre la ficha («¿quién vive aquí, hasta cuándo,
 * cuánto paga y quién lo lleva?»). Antes la portada gastaba esta franja en el
 * mandato (desde, comisión) y el inquilino aparecía a 1.300 px, en una tarjeta
 * con cuatro losas grises; el asesor, a 1.600 px. Ahora las cuatro respuestas
 * están arriba y se ven en todas las pestañas (el canon va justo encima).
 *
 * Reglas que vienen de antes y se conservan (Nico, 2026-09-12):
 *  · el inquilino del contrato vigente (`consignacion.inquilino`) manda sobre
 *    `currentTenantName`, que es una copia suelta de la activación;
 *  · con contrato vigente hay inquilino aunque `availability` diga otra cosa;
 *  · «Mensaje» sólo con cuenta de portal, y sin cuenta se DICE por qué;
 *  · «Documento» y no «CC»: el tipo no se guarda en ningún lado.
 */

import Link from 'next/link';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { Envelope, Phone } from '@phosphor-icons/react';
import { Avatar, iconButtonVariants } from '@leasefy/cadence';

import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/lib/i18n';
import { useTr } from '@/lib/i18n/use-tr';
import { cn } from '@/lib/utils';
import { conRegreso } from '@/lib/nav/ruta-de-regreso';
import { detalleDeLaVacancia, esVacanciaLarga, textoDeLaVacancia, type Vacancia } from '@/lib/comercial/comercial';
import { tiempoHastaElFin } from '@/lib/inmuebles/tiempo-hasta-el-fin';
import type { Consignacion } from '@/lib/types/inmobiliaria';

export interface AsesorDeLaFicha {
  nombre: string;
  rol?: string | null;
}

interface FranjaDelArriendoProps {
  consignacion: Consignacion;
  /** Quién está a cargo; `null` = nadie. */
  asesor: AsesorDeLaFicha | null;
  /** Mientras se resuelve quién está a cargo: no decir «nadie» antes de saber. */
  cargandoAsesor?: boolean;
  /** Abre «Asignar asesor». Sin esto (mandato terminado) no se ofrece. */
  onAsignarAsesor?: () => void;
  /** Días vacante (sale de la situación comercial; si no llegó, no se dice). */
  vacancia?: Vacancia;
  /** Para probar «en 4 meses» sin depender del día. */
  hoy?: Date;
}

const ROTULO = 'font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle';
const ENLACE =
  'inline-flex items-center gap-1 rounded-sm text-body-sm font-medium text-primary transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** «Hay inquilino»: el contrato es el hecho; `availability` es una columna que alguien pudo dejar sin actualizar. */
export function hayInquilino(consignacion: Consignacion): boolean {
  const nombre = consignacion.inquilino?.nombre ?? consignacion.currentTenantName;
  return (consignacion.inquilino ?? null) !== null || (consignacion.availability === 'rented' && !!nombre);
}

export function FranjaDelArriendo({
  consignacion,
  asesor,
  cargandoAsesor = false,
  onAsignarAsesor,
  vacancia,
  hoy,
}: FranjaDelArriendoProps) {
  const { t, formatDate, locale } = useI18n();
  const tr = useTr();
  const inquilino = consignacion.inquilino ?? null;
  const nombre = inquilino?.nombre ?? consignacion.currentTenantName;
  const conInquilino = hayInquilino(consignacion);
  const fin = consignacion.leaseEndDate ? tiempoHastaElFin(consignacion.leaseEndDate, locale ?? 'es', hoy) : null;
  // 22-10 (revisión): «No sabemos desde cuándo está vacante» no informa y repite el
  // DISPONIBLE de arriba; sólo se dice la vacancia cuando se sabe desde cuándo.
  const textoDeVacancia =
    vacancia && vacancia.dias !== null && vacancia.desde !== null ? textoDeLaVacancia(vacancia) : null;
  // En venta no hay inquilino que esperar: la franja dice sólo quién lo lleva.
  const esVenta = consignacion.listingType === 'sale';
  const mostrarInquilino = conInquilino || !esVenta;

  return (
    <dl
      className={cn(
        // En el celular, UNA columna (revisión 22-10: a dos columnas se cortaba «Ana Admi…»).
        'grid grid-cols-1 gap-x-6 gap-y-5 sm:gap-x-8',
        conInquilino
          ? 'sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]'
          : mostrarInquilino
            ? 'sm:grid-cols-2'
            : 'sm:grid-cols-1',
      )}
      data-testid="franja-del-arriendo"
    >
      {/* ── Quién vive ─────────────────────────────────────────────── */}
      {mostrarInquilino ? (
      <div className="min-w-0">
        <dt className={ROTULO}>{tr('Inquilino')}</dt>
        <dd className="mt-2.5">
          {conInquilino ? (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={nombre ?? ''} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-snug text-fg" data-testid="inquilino-nombre" title={nombre ?? undefined}>
                    {nombre}
                  </p>
                  {inquilino?.documento ? (
                    <p className="text-caption text-fg-subtle">
                      {tr('Documento')} <span className="font-mono tabular-nums">{inquilino.documento}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Cómo hablarle: el correo y el teléfono se van del producto; el
                  hilo de Leasefy queda y lo ve cualquiera de la inmobiliaria. */}
              {inquilino && (inquilino.correo || inquilino.telefono || inquilino.cuentaDePortalId) ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="contacto-inquilino">
                  {inquilino.correo ? (
                    <a
                      href={`mailto:${inquilino.correo}`}
                      className={iconButtonVariants({ variant: 'outline', size: 'sm' })}
                      aria-label={tr('Escribirle un correo a {nombre}', { nombre: nombre ?? '' })}
                      title={inquilino.correo}
                    >
                      <Envelope className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                  {inquilino.telefono ? (
                    <a
                      href={`tel:${inquilino.telefono}`}
                      className={iconButtonVariants({ variant: 'outline', size: 'sm' })}
                      aria-label={tr('Llamar a {nombre}', { nombre: nombre ?? '' })}
                      title={inquilino.telefono}
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : null}
                  {inquilino.cuentaDePortalId ? (
                    <BotonEnviarMensaje counterpartId={inquilino.cuentaDePortalId} etiqueta={tr('Mensaje')} />
                  ) : null}
                </div>
              ) : null}

              {inquilino && !inquilino.cuentaDePortalId ? (
                <p className="mt-2 max-w-sm text-caption text-fg-muted" data-testid="inquilino-sin-cuenta">
                  {tr('Todavía no tiene cuenta en Leasefy: no se le puede escribir por aquí.')}{' '}
                  <Link href="/panel/inmobiliaria/inquilinos" className="font-medium text-fg underline underline-offset-2">
                    {tr('Reenviar la invitación')}
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[15px] font-medium text-fg" data-testid="sin-inquilino">
                {t('inmobiliaria.consignaciones.detail.noTenant')}
              </p>
              {textoDeVacancia ? (
                <p
                  className={cn('mt-0.5 text-body-sm', esVacanciaLarga(vacancia) ? 'font-medium text-warning' : 'text-fg-muted')}
                  data-testid="ficha-dias-vacante"
                  // El porqué de la fecha («desde el día después de que terminó el último contrato»).
                  title={vacancia ? detalleDeLaVacancia(vacancia) ?? undefined : undefined}
                >
                  {textoDeVacancia}
                </p>
              ) : null}
            </>
          )}
        </dd>
      </div>
      ) : null}

      {/* ── Hasta cuándo ───────────────────────────────────────────── */}
      {conInquilino ? (
        <div className="min-w-0">
          <dt className={ROTULO}>{tr('Termina el')}</dt>
          <dd className="mt-2.5">
            {consignacion.leaseEndDate ? (
              <>
                <p className="whitespace-nowrap text-[15px] font-medium tabular-nums text-fg" data-testid="fin-del-arriendo">
                  {fechaCorta(consignacion.leaseEndDate)}
                </p>
                {fin ? (
                  <p
                    className={cn(
                      'text-body-sm',
                      fin.tono === 'vencido' ? 'font-medium text-danger' : fin.tono === 'pronto' ? 'font-medium text-warning' : 'text-fg-muted',
                    )}
                    data-testid="falta-para-el-fin"
                  >
                    {fin.texto}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[15px] text-fg-muted">{tr('Sin fecha de fin')}</p>
            )}
            {inquilino ? (
              <Link
                href={conRegreso(`/panel/inmobiliaria/contratos/${inquilino.contractId}`, `/panel/inmobiliaria/inmuebles/${consignacion.id}`)}
                className={cn(ENLACE, 'mt-2')}
                data-testid="ver-contrato-del-inquilino"
              >
                {tr('Ver contrato')}
              </Link>
            ) : null}
          </dd>
        </div>
      ) : null}

      {/* ── Quién lo lleva ─────────────────────────────────────────── */}
      <div className={cn('min-w-0', conInquilino && 'sm:col-span-2 xl:col-span-1')}>
        <dt className={ROTULO}>{tr('Asesor a cargo')}</dt>
        <dd className="mt-2.5" data-testid="asesor-de-la-ficha">
          {cargandoAsesor ? (
            <div className="flex items-center gap-3" aria-busy="true">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : asesor ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={asesor.nombre} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium leading-snug text-fg" title={asesor.nombre}>
                  {asesor.nombre}
                </p>
                {asesor.rol || onAsignarAsesor ? (
                  <p className="text-caption text-fg-subtle">
                    {asesor.rol}
                    {asesor.rol && onAsignarAsesor ? ' · ' : null}
                    {onAsignarAsesor ? (
                      <button type="button" onClick={onAsignarAsesor} className="font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                        {tr('Cambiar')}
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-fg-muted">{tr('Nadie a cargo')}</p>
              {onAsignarAsesor ? (
                <button type="button" onClick={onAsignarAsesor} className={cn(ENLACE, 'mt-1')} data-testid="asignar-asesor">
                  {tr('Asignar asesor')}
                </button>
              ) : null}
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}
