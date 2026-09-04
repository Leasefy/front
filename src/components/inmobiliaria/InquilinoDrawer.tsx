'use client';

/**
 * InquilinoDrawer — todo lo que se sabe de un inquilino, en un cajón.
 *
 * ── Por qué existe (Nico, 2026-09-03) ──────────────────────────────────────
 * «Lo de "ver ficha" sobra, mejor que al dar clic se abra un drawer y muestre
 * todo el detalle del inquilino y podríamos mostrar mucho más: cuál es su
 * calificación de evaluación del inquilino si la tiene, pagos, etc.»
 *
 * Antes era un `Dialog` chico con tres renglones de contacto y un enlace a
 * `/cobros?buscar=<nombre>` — un parche: buscar por nombre encuentra a los
 * homónimos y se pierde a quien esté escrito distinto.
 *
 * ── Lo que MUESTRA, y de dónde sale ────────────────────────────────────────
 * · Contacto y arriendos → `GET /inmobiliaria/inquilinos/:tenantId`, que trae
 *   TODOS los arriendos (también los terminados), no los del filtro de la
 *   lista.
 * · Pagos, mora y recordatorios → `GET /contracts/:id/cobros` por cada
 *   contrato de la persona. Cada cobro trae `pendingAmount`, `daysLate`,
 *   `lateFee` y `remindersSent`: la mora no se calcula acá, se lee.
 *
 * ── Lo que NO muestra, y por qué ───────────────────────────────────────────
 * 🔴 **La calificación de la evaluación.** El pedido la incluía y NO está: el
 * score vive en `GET /evaluations/:applicationId/result`, colgado de la
 * POSTULACIÓN, y hoy no hay forma de llegar desde un `tenantId` a su
 * postulación. `LandlordCandidate` sólo trae `tenantName` y `tenantEmail`
 * —nunca un id de usuario—, y `mapBackendApplication` descarta el `tenantId`
 * que el back sí manda. Cruzarlo por nombre o por correo sería adivinar de
 * quién es un score, que es exactamente el error que no se puede cometer con
 * una calificación de riesgo. Falta un dato del back, no una sección acá.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOut,
  Bell,
  Envelope,
  Phone,
  Warning,
} from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { RenglonDeArriendo } from '@/components/inmobiliaria/InquilinosTable';
import { useI18n } from '@/lib/i18n';
import { useInquilinoDetalle } from '@/lib/hooks/use-inquilino-detalle';
import { nombreDelMes } from '@/lib/utils/mes';
import { arriendosVigentes, type Inquilino } from '@/lib/api/inquilinos.service';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';
import type { CobroStatus } from '@/lib/types/inmobiliaria';

const NS = 'inquilinos.cajon';

/** Cuántos cobros caben antes de que la lista deje de leerse. El resto, en el contrato. */
const TOPE_DE_COBROS = 12;

/**
 * Cómo se pinta cada estado del cobro. Las etiquetas son las que ya usa el
 * panel de cobros (`inmobiliaria.cobros.status.*`) — un mismo estado no puede
 * llamarse distinto en dos pantallas.
 */
export const TONO_DEL_COBRO: Record<
  CobroStatus,
  { variant: 'success' | 'warning' | 'destructive' | 'secondary'; clave: string }
> = {
  paid: { variant: 'success', clave: 'inmobiliaria.cobros.status.paid' },
  pending: { variant: 'secondary', clave: 'inmobiliaria.cobros.status.pending' },
  partial: { variant: 'warning', clave: 'inmobiliaria.cobros.status.partial' },
  late: { variant: 'destructive', clave: 'inmobiliaria.cobros.status.late' },
  defaulted: { variant: 'destructive', clave: 'inmobiliaria.cobros.status.defaulted' },
};

export interface ResumenDePagos {
  /** Lo que falta por pagar, sumando todos sus cobros. */
  saldoPendiente: number;
  /** Cuántos cobros están en mora (`late` o `defaulted`, como en el panel de cobros). */
  enMora: number;
  /** El mayor atraso de sus cobros. Es el que importa: el más viejo sin pagar. */
  diasDeMora: number;
  /** Fecha del pago más reciente, o `null` si nunca pagó. */
  ultimoPago: string | null;
  /** Recordatorios enviados sobre sus cobros y la fecha del último. */
  recordatorios: number;
  ultimoRecordatorio: string | null;
}

/**
 * Los números del inquilino, derivados de sus cobros reales.
 *
 * Nada se estima: `pendingAmount` y `daysLate` los calcula el back y acá sólo
 * se suman y se compara el máximo. Pura y exportada para poder fijarla.
 */
export function resumirPagos(cobros: readonly CobroConDesglose[]): ResumenDePagos {
  return cobros.reduce<ResumenDePagos>(
    (acc, c) => ({
      saldoPendiente: acc.saldoPendiente + (c.pendingAmount ?? 0),
      enMora: acc.enMora + (c.status === 'late' || c.status === 'defaulted' ? 1 : 0),
      diasDeMora: Math.max(acc.diasDeMora, c.daysLate ?? 0),
      ultimoPago:
        c.paidDate && (!acc.ultimoPago || c.paidDate > acc.ultimoPago) ? c.paidDate : acc.ultimoPago,
      recordatorios: acc.recordatorios + (c.remindersSent ?? 0),
      ultimoRecordatorio:
        c.lastReminderDate && (!acc.ultimoRecordatorio || c.lastReminderDate > acc.ultimoRecordatorio)
          ? c.lastReminderDate
          : acc.ultimoRecordatorio,
    }),
    {
      saldoPendiente: 0,
      enMora: 0,
      diasDeMora: 0,
      ultimoPago: null,
      recordatorios: 0,
      ultimoRecordatorio: null,
    },
  );
}

export interface InquilinoDrawerProps {
  /** La persona de la fila; `null` cierra el cajón. */
  persona: Inquilino | null;
  onCerrar: () => void;
}

export function InquilinoDrawer({ persona, onCerrar }: InquilinoDrawerProps) {
  const detalle = useInquilinoDetalle(persona);

  if (!persona || !detalle) return null;

  return (
    <Sheet open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-2xl"
        aria-describedby={undefined}
        data-testid="inquilino-cajon"
      >
        {/* El título accesible lo exige Radix y va acá, no en el cuerpo: así
            `CuerpoDelCajon` se monta en un test sin el contexto del Sheet.
            En pantalla el nombre lo pinta la cabecera del cuerpo. */}
        <SheetTitle className="sr-only">{persona.nombre}</SheetTitle>
        <CuerpoDelCajon detalle={detalle} />
      </SheetContent>
    </Sheet>
  );
}

/**
 * Separado del `Sheet` a propósito: así el test lo monta sin portal ni Radix,
 * y lo que se prueba es lo que se ve, no el envoltorio.
 */
export function CuerpoDelCajon({
  detalle,
}: {
  detalle: NonNullable<ReturnType<typeof useInquilinoDetalle>>;
}) {
  const { t, formatCurrency, formatDate } = useI18n();
  const {
    persona,
    cargandoArriendos,
    arriendosIncompletos,
    cobros,
    cargandoPagos,
    errorPagos,
    pagosIncompletos,
    reintentar,
  } = detalle;

  const vigentes = arriendosVigentes(persona);
  const canon = vigentes.reduce((suma, a) => suma + a.canonCop, 0);
  const resumen = useMemo(() => resumirPagos(cobros), [cobros]);
  const visibles = cobros.slice(0, TOPE_DE_COBROS);
  const contratoPrincipal = persona.arriendos[0]?.contractId;

  return (
    <>
      <div className="flex-none border-b border-border px-6 py-5 pr-14">
        <h2 className="truncate text-lg font-semibold text-fg">{persona.nombre}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
          {persona.email ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Envelope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{persona.email}</span>
            </span>
          ) : null}
          {persona.telefono ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-mono tabular-nums">{persona.telefono}</span>
            </span>
          ) : null}
          {/* Sin correo ni teléfono no es un detalle: es a quién no se le
              puede cobrar ni avisar. Va en la cabecera, no escondido. */}
          {!persona.email && !persona.telefono ? (
            <span className="inline-flex items-center gap-1.5 text-warning">
              <Warning className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('inquilinos.sinContacto')}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5"
        data-lenis-prevent
      >
        {/* Los tres números. El saldo sale de sus cobros, no de una estimación. */}
        <div className="grid grid-cols-3 gap-3">
          <Numero etiqueta={t(`${NS}.canonVigente`)} valor={formatCurrency(canon)} />
          <Numero
            etiqueta={t(`${NS}.arriendosVigentes`)}
            valor={String(vigentes.length)}
            detalle={
              persona.arriendos.length > vigentes.length
                ? t(`${NS}.deTotal`, { n: persona.arriendos.length })
                : undefined
            }
          />
          <Numero
            etiqueta={t(`${NS}.saldoPendiente`)}
            valor={
              // Sin cobros cargados el saldo NO es cero: es desconocido. Un
              // «$0» sobre datos que no llegaron dice que está al día.
              cargandoPagos || errorPagos ? '—' : formatCurrency(resumen.saldoPendiente)
            }
            detalle={
              resumen.enMora > 0
                ? t(`${NS}.diasDeMora`, { n: resumen.diasDeMora })
                : undefined
            }
            alerta={resumen.enMora > 0}
          />
        </div>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">
              {t(`${NS}.arriendos`, { n: persona.arriendos.length })}
            </h3>
            {cargandoArriendos ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                <Spinner size="sm" /> {t(`${NS}.cargandoArriendos`)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-fg-muted">{t(`${NS}.arriendosIncluyeTerminados`)}</p>

          {arriendosIncompletos ? (
            <Aviso texto={t(`${NS}.arriendosIncompletos`)} />
          ) : null}

          <ul className="space-y-2">
            {persona.arriendos.map((a) => (
              <li key={a.leaseId} className="space-y-1">
                <RenglonDeArriendo arriendo={a} />
                <Link
                  href={`/panel/inmobiliaria/contratos/${a.contractId}`}
                  className="inline-flex items-center gap-1 px-3 text-xs text-primary hover:underline"
                >
                  {t(`${NS}.verContrato`)}
                  <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2" data-testid="inquilino-cajon-pagos">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">{t(`${NS}.pagos`)}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
              {resumen.ultimoPago ? (
                <span>{t(`${NS}.ultimoPago`, { fecha: formatDate(resumen.ultimoPago) })}</span>
              ) : null}
              {/* Los recordatorios ya enviados son parte de la historia de
                  cobro: sin verlos, se vuelve a insistir sin saber cuántas
                  veces se insistió. */}
              {resumen.recordatorios > 0 && resumen.ultimoRecordatorio ? (
                <span className="inline-flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  {t(`${NS}.recordatorios`, {
                    n: resumen.recordatorios,
                    fecha: formatDate(resumen.ultimoRecordatorio),
                  })}
                </span>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-fg-muted">{t(`${NS}.pagosDeSusContratos`)}</p>

          {cargandoPagos ? (
            <div className="flex items-center gap-2 py-6 text-sm text-fg-muted">
              <Spinner size="sm" /> {t(`${NS}.cargandoPagos`)}
            </div>
          ) : errorPagos ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-4 py-3">
              <p className="text-sm text-danger" role="alert">
                {t(`${NS}.errorPagos`)}
              </p>
              <Button variant="outline" size="sm" hideArrow onClick={reintentar}>
                {t(`${NS}.reintentar`)}
              </Button>
            </div>
          ) : cobros.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface-muted/50 px-4 py-6 text-center text-sm text-fg-muted">
              {persona.arriendos.length === 0 ? t(`${NS}.sinContratos`) : t(`${NS}.sinPagos`)}
            </p>
          ) : (
            <>
              {pagosIncompletos ? <Aviso texto={t(`${NS}.pagosIncompletos`)} /> : null}
              <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                {visibles.map((c) => (
                  <li key={c.id}>
                    <FilaDePago cobro={c} />
                  </li>
                ))}
              </ul>
              {cobros.length > visibles.length ? (
                <p className="text-xs text-fg-muted">
                  {t(`${NS}.yMasCobros`, { n: cobros.length - visibles.length })}
                </p>
              ) : null}
              {contratoPrincipal ? (
                <Link
                  href={`/panel/inmobiliaria/contratos/${contratoPrincipal}`}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t(`${NS}.verCobrosDelContrato`)}
                  <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
                </Link>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  );
}

/** Un cobro en una línea: mes, vencimiento, estado, total y saldo. */
function FilaDePago({ cobro }: { cobro: CobroConDesglose }) {
  const { t, formatCurrency, formatDate, locale } = useI18n();
  const tono = TONO_DEL_COBRO[cobro.status];
  const debe = (cobro.pendingAmount ?? 0) > 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-surface px-3 py-2.5">
      <span className="w-24 shrink-0 text-sm font-medium text-fg">
        {nombreDelMes(cobro.month, locale === 'en' ? 'en' : 'es', 'short')}
      </span>

      <Badge variant={tono?.variant ?? 'secondary'}>
        {/* Un estado que el back agregue mañana se muestra crudo: mejor una
            etiqueta rara que una fila que miente. */}
        {tono ? t(tono.clave) : cobro.status}
      </Badge>

      {cobro.daysLate > 0 ? (
        <span className="text-xs text-danger tabular-nums">
          {t(`${NS}.diasDeMora`, { n: cobro.daysLate })}
        </span>
      ) : cobro.paidDate ? (
        <span className="text-xs text-fg-muted">
          {t(`${NS}.pagadoEl`, { fecha: formatDate(cobro.paidDate) })}
        </span>
      ) : (
        <span className="text-xs text-fg-muted">
          {t(`${NS}.venceEl`, { fecha: formatDate(cobro.dueDate) })}
        </span>
      )}

      <span className="ml-auto whitespace-nowrap font-mono text-sm tabular-nums text-fg">
        {/* `totalWithFees` incluye la mora ya causada; el total pelado
            cobraría de menos justo en las filas que importan. */}
        {formatCurrency(cobro.totalWithFees ?? cobro.totalAmount)}
      </span>
      {debe ? (
        <span className="w-28 shrink-0 whitespace-nowrap text-right font-mono text-xs tabular-nums text-danger">
          {t(`${NS}.debe`, { monto: formatCurrency(cobro.pendingAmount) })}
        </span>
      ) : (
        <span className="w-28 shrink-0" />
      )}
    </div>
  );
}

function Numero({
  etiqueta,
  valor,
  detalle,
  alerta,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5">
      <p className="text-xs text-fg-muted">{etiqueta}</p>
      <p className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums text-fg">
        {valor}
      </p>
      {detalle ? (
        <p className={`mt-0.5 text-xs ${alerta ? 'text-danger' : 'text-fg-subtle'}`}>{detalle}</p>
      ) : null}
    </div>
  );
}

/** Un dato que llegó incompleto. No es un error de pantalla: es una advertencia. */
function Aviso({ texto }: { texto: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 text-xs text-fg">
      <Warning className="mt-px h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      {texto}
    </p>
  );
}
