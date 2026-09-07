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
 *
 * ── El glow-up del 2026-09-04 (Nico: «se ve pobre y desangelado») ───────────
 * Cuatro decisiones, todas sobre el MISMO problema: la persona SIN contratos
 * —el caso más común en una agencia recién migrada— era la que peor se veía.
 *
 * 1. **Sin arriendos el cuerpo es UN vacío, no dos secciones vacías.** Antes
 *    quedaban tres cajas con «$0 / 0 / $0», un subtítulo suelto bajo
 *    «Arriendos (0)» sin nada debajo, y un cartel gris enorme en «Pagos». Los
 *    tres decían lo mismo —que no hay contrato— y ninguno decía qué hacer.
 *    Ahora es un solo estado vacío que lo dice una vez y ofrece la salida:
 *    crear su contrato. Sin contrato no hay canon ni cobros: resumir en cero
 *    algo que no existe es ruido, no información.
 *
 * 2. **Los números perdieron la caja.** Tres recuadros con borde pesaban lo
 *    mismo con datos que con ceros. Ahora es una franja con hairlines y la
 *    jerarquía la pone el dato: un cero va apagado (`text-fg-subtle`), un
 *    saldo en mora va en `text-danger`, y un saldo en cero —sabido, no
 *    faltante— dice «Al día» en verde. El «—» del saldo desconocido se queda:
 *    un «$0» sobre datos que no llegaron se lee «está al día».
 *
 * 3. **Cada sección tiene encabezado con conteo, y contenido O su vacío.** El
 *    subtítulo que antes flotaba sobre la nada ahora sólo acompaña a una
 *    lista; cuando no hay nada, lo que se ve es un vacío con círculo gris que
 *    dice qué falta y a dónde ir.
 *
 * 4. **El contacto se puede accionar.** Correo y teléfono eran texto muerto;
 *    ahora abren `mailto:`/`tel:` y se copian de a uno. El documento —que
 *    estaba en el tipo y no se mostraba— también, porque es con lo que se
 *    busca a la persona en el banco y en la migración.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOut,
  Bell,
  Copy,
  Envelope,
  FileText,
  IdentificationCard,
  Phone,
  Receipt,
  Warning,
} from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  RenglonDeArriendo,
  RUTA_DEL_CONTRATO_MANUAL,
} from '@/components/inmobiliaria/InquilinosTable';
import { useI18n } from '@/lib/i18n';
import { useInquilinoDetalle } from '@/lib/hooks/use-inquilino-detalle';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';
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

/** Las iniciales del nombre, para el avatar. Dos letras, nunca más. */
export function inicialesDe(nombre: string): string {
  return nombre
    .split(/\s+/)
    .map((parte) => parte[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface InquilinoDrawerProps {
  /** La persona de la fila; `null` cierra el cajón. */
  persona: Inquilino | null;
  onCerrar: () => void;
}

export function InquilinoDrawer({ persona, onCerrar }: InquilinoDrawerProps) {
  /*
   * El cajón NO se desmonta al cerrar: `open` manda de verdad. Antes esto era
   * `if (!persona) return null` con `<Sheet open>` fijo, y cerrar era borrarlo
   * del árbol — Radix anima la salida sólo si el contenido sigue montado con
   * `data-state="closed"` mientras dura la animación, así que el cajón se
   * cortaba en seco (Nico, 2026-09-04: «es súper brusco como cierra»).
   *
   * `useUltimoPresente` conserva a la persona mientras el cajón se va: en el
   * render del cierre `persona` ya es null y sin esto saldría deslizándose en
   * blanco, que se ve peor que el corte.
   */
  const ultima = useUltimoPresente(persona);

  return (
    <Sheet open={Boolean(persona)} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-2xl"
        aria-describedby={undefined}
        data-testid="inquilino-cajon"
      >
        {/* El título accesible lo exige Radix y va acá, no en el cuerpo: así
            `CuerpoDelCajon` se monta en un test sin el contexto del Sheet.
            En pantalla el nombre lo pinta la cabecera del cuerpo. */}
        <SheetTitle className="sr-only">{ultima?.nombre ?? ''}</SheetTitle>
        {ultima && <CajonDeInquilino persona={ultima} />}
      </SheetContent>
    </Sheet>
  );
}

/**
 * El pedido de datos vive acá y no en `InquilinoDrawer` a propósito: Radix
 * desmonta los hijos del `SheetContent` cuando el cajón está cerrado, así que
 * `useInquilinoDetalle` sólo corre con el cajón abierto y vuelve a correr al
 * abrir otra persona. En el envoltorio —que está montado siempre— el hook
 * quedaría vivo con el cajón cerrado.
 */
function CajonDeInquilino({ persona }: { persona: Inquilino }) {
  const detalle = useInquilinoDetalle(persona);
  if (!detalle) return null;
  return <CuerpoDelCajon detalle={detalle} />;
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
  const sinArriendos = persona.arriendos.length === 0;
  // Nada de lo que sale de los cobros —el saldo, el conteo de la sección— es
  // cierto hasta que los cobros llegaron. Mientras tanto no hay número, y eso
  // se muestra: un cero sobre datos que no llegaron se lee «está al día».
  const cobrosLlegaron = !cargandoPagos && !errorPagos;

  return (
    <>
      <div className="flex-none border-b border-border px-6 py-5">
        <div className="flex items-start gap-3 pr-14">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {inicialesDe(persona.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-fg">{persona.nombre}</h2>
            <p className="mt-0.5 truncate text-xs text-fg-subtle">
              {sinArriendos
                ? t('inquilinos.sinArriendo')
                : persona.arriendos.length === 1
                  ? t('inquilinos.conteoArriendoUno', { vigentes: vigentes.length })
                  : t('inquilinos.conteoArriendos', {
                      n: persona.arriendos.length,
                      vigentes: vigentes.length,
                    })}
            </p>
          </div>
          {/* Escribirle sin salir de la ficha. `tenantId` es su `User.id` cuando
              tiene cuenta del portal; cuando no —se cargó con documento y sin
              correo— el back responde `SIN_CUENTA` y el botón lo dice. */}
          <div className="shrink-0">
            <BotonEnviarMensaje counterpartId={persona.tenantId} />
          </div>
        </div>

        {/* El contacto se acciona: escribirle, llamarlo o copiar el dato para
            pegarlo en el banco. Texto suelto obliga a transcribir a mano un
            correo, que es como se le termina escribiendo a la persona
            equivocada. */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {persona.email ? (
            <DatoDeContacto
              icono={Envelope}
              valor={persona.email}
              href={`mailto:${persona.email}`}
              accion={t(`${NS}.escribirCorreo`)}
            />
          ) : null}
          {persona.telefono ? (
            <DatoDeContacto
              icono={Phone}
              valor={persona.telefono}
              href={`tel:${persona.telefono}`}
              accion={t(`${NS}.llamar`)}
              mono
            />
          ) : null}
          {persona.documento ? (
            <DatoDeContacto
              icono={IdentificationCard}
              valor={persona.documento}
              accion={t(`${NS}.documento`)}
              mono
            />
          ) : null}
          {/* Sin correo ni teléfono no es un detalle: es a quién no se le
              puede cobrar ni avisar. Va en la cabecera, no escondido. */}
          {!persona.email && !persona.telefono ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning-soft/40 px-2.5 py-1.5 text-sm text-warning">
              <Warning className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('inquilinos.sinContacto')}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5"
        data-lenis-prevent
      >
        {sinArriendos ? (
          <div className="space-y-3">
            {arriendosIncompletos ? <Aviso texto={t(`${NS}.arriendosIncompletos`)} /> : null}
            {cargandoArriendos ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-fg-muted">
                <Spinner size="sm" /> {t(`${NS}.cargandoArriendos`)}
              </div>
            ) : (
              /* El vacío de esta persona es el caso común en una agencia recién
                 migrada, así que dice lo que falta y ofrece la salida en vez de
                 dejar tres ceros y un cartel gris. */
              <EmptyState
                icon={FileText}
                title={t(`${NS}.sinArriendosTitulo`)}
                description={t(`${NS}.sinContratos`)}
                action={{
                  label: t('inquilinos.crearSuContrato'),
                  href: RUTA_DEL_CONTRATO_MANUAL,
                }}
                className="py-14"
              />
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {/* La franja. Sin cajas: la jerarquía la pone el dato, no el borde. */}
            <dl className="grid grid-cols-3 divide-x divide-border">
              <Numero
                etiqueta={t(`${NS}.canonVigente`)}
                valor={formatCurrency(canon)}
                tono={canon === 0 ? 'apagado' : 'neutro'}
              />
              <Numero
                etiqueta={t(`${NS}.arriendosVigentes`)}
                valor={String(vigentes.length)}
                tono={vigentes.length === 0 ? 'apagado' : 'neutro'}
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
                  cobrosLlegaron ? formatCurrency(resumen.saldoPendiente) : '—'
                }
                detalle={
                  resumen.enMora > 0
                    ? t(`${NS}.diasDeMora`, { n: resumen.diasDeMora })
                    : cobrosLlegaron && resumen.saldoPendiente === 0 && cobros.length > 0
                      ? t(`${NS}.alDia`)
                      : undefined
                }
                tono={
                  resumen.enMora > 0
                    ? 'alerta'
                    : !cobrosLlegaron || resumen.saldoPendiente === 0
                      ? 'apagado'
                      : 'neutro'
                }
                detalleTono={resumen.enMora > 0 ? 'alerta' : 'bien'}
              />
            </dl>

            <Seccion
              titulo={t(`${NS}.arriendos`)}
              conteo={persona.arriendos.length}
              meta={
                cargandoArriendos ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                    <Spinner size="sm" /> {t(`${NS}.cargandoArriendos`)}
                  </span>
                ) : null
              }
            >
              {/* El subtítulo acompaña a una lista; nunca queda flotando sobre
                  la nada, porque sin arriendos esta sección no se pinta. */}
              <p className="text-xs text-fg-muted">{t(`${NS}.arriendosIncluyeTerminados`)}</p>

              {arriendosIncompletos ? <Aviso texto={t(`${NS}.arriendosIncompletos`)} /> : null}

              <ul className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                {persona.arriendos.map((a) => (
                  <li key={a.leaseId} className="space-y-0.5 bg-surface py-1.5">
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
            </Seccion>

            <div data-testid="inquilino-cajon-pagos">
              <Seccion
                titulo={t(`${NS}.pagos`)}
                conteo={cobrosLlegaron ? cobros.length : undefined}
                meta={
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
                }
              >
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
                  <EmptyState
                    icon={Receipt}
                    title={t(`${NS}.sinPagosTitulo`)}
                    description={t(`${NS}.sinPagos`)}
                    action={
                      contratoPrincipal
                        ? {
                            label: t(`${NS}.verContrato`),
                            href: `/panel/inmobiliaria/contratos/${contratoPrincipal}`,
                          }
                        : undefined
                    }
                    className="rounded-lg bg-surface-muted/40 py-10"
                  />
                ) : (
                  <>
                    <p className="text-xs text-fg-muted">{t(`${NS}.pagosDeSusContratos`)}</p>
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
              </Seccion>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Una sección del cajón: encabezado con su conteo, y adentro contenido o su
 * propio vacío. El conteo es `undefined` cuando todavía no se sabe —una pill
 * en cero mientras carga es un número inventado—.
 */
function Seccion({
  titulo,
  conteo,
  meta,
  children,
}: {
  titulo: string;
  conteo?: number;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          {titulo}
          {conteo !== undefined ? (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-fg-muted">
              {conteo}
            </span>
          ) : null}
        </h3>
        {meta}
      </div>
      {children}
    </section>
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

type TonoDelNumero = 'neutro' | 'apagado' | 'alerta';

function Numero({
  etiqueta,
  valor,
  detalle,
  tono = 'neutro',
  detalleTono = 'neutro',
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: TonoDelNumero;
  detalleTono?: 'neutro' | 'alerta' | 'bien';
}) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0">
      <dt className="truncate text-xs text-fg-muted">{etiqueta}</dt>
      <dd
        className={cn(
          'mt-1 truncate font-mono text-lg font-semibold tabular-nums',
          tono === 'alerta' ? 'text-danger' : tono === 'apagado' ? 'text-fg-subtle' : 'text-fg',
        )}
      >
        {valor}
      </dd>
      {detalle ? (
        <dd
          className={cn(
            'mt-0.5 truncate text-xs',
            detalleTono === 'alerta'
              ? 'text-danger'
              : detalleTono === 'bien'
                ? 'text-success'
                : 'text-fg-subtle',
          )}
        >
          {detalle}
        </dd>
      ) : null}
    </div>
  );
}

/**
 * Un dato de contacto que se puede usar: abrirlo (correo, llamada) y copiarlo.
 * Sin `href` —el documento— queda sólo el copiar, que es para lo que sirve.
 */
function DatoDeContacto({
  icono: Icono,
  valor,
  href,
  accion,
  mono,
}: {
  icono: React.ElementType;
  valor: string;
  href?: string;
  accion: string;
  mono?: boolean;
}) {
  const contenido = (
    <>
      <Icono className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <span className={cn('truncate', mono && 'font-mono tabular-nums')}>{valor}</span>
    </>
  );

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border bg-surface-muted/40 py-1 pl-2.5 pr-1">
      {href ? (
        <a
          href={href}
          title={accion}
          aria-label={`${accion}: ${valor}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-fg hover:text-primary"
        >
          {contenido}
        </a>
      ) : (
        <span
          title={accion}
          aria-label={`${accion}: ${valor}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-fg"
        >
          {contenido}
        </span>
      )}
      <BotonCopiar texto={valor} />
    </span>
  );
}

/**
 * Copiar al portapapeles. Si el navegador lo niega —contexto inseguro, permiso
 * denegado— se dice; un botón que no hace nada en silencio es peor que no
 * tenerlo, porque quien lo apretó cree que ya lo tiene pegado.
 */
function BotonCopiar({ texto }: { texto: string }) {
  const { t } = useI18n();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(t(`${NS}.copiado`));
    } catch {
      toast.error(t(`${NS}.noSePudoCopiar`));
    }
  };

  return (
    /* IconButton del DS: mismo tamaño (24 px) e ícono (14 px) que el <button>
       a mano que había acá, pero con el anillo de foco y el `active:scale`
       de Cadence — el hecho a mano no tenía NINGÚN estilo de :focus-visible. */
    <IconButton
      variant="ghost"
      size="sm"
      className="size-6"
      onClick={() => void copiar()}
      title={t(`${NS}.copiar`)}
      aria-label={`${t(`${NS}.copiar`)}: ${texto}`}
      icon={<Copy className="h-3.5 w-3.5" aria-hidden="true" />}
    />
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
