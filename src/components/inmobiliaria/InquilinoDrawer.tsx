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
 * · 🔴 Lo que DEBE → el resumen de su ESTADO DE CUENTA
 *   (`GET /inmobiliaria/estado-de-cuenta/inquilino/:ref/resumen`), que suma las
 *   cuotas de sus contratos. Nico (2026-09-15): la deuda nace con el contrato;
 *   el cobro es el documento con que se reclama y puede no existir. Hasta el
 *   16-09 el saldo salía de sumar cobros: en la inmobiliaria migrada (0 cobros,
 *   30.951 cuotas) TODOS los inquilinos se veían con «—», y la mora salía del
 *   cobro sin restar el plazo del contrato. El estado lo nombra
 *   `estadoDeLaDeuda`, con las palabras de Pagos y Cartera: al día · vencido,
 *   en plazo · en cartera.
 * · Cobros emitidos y recordatorios → `GET /contracts/:id/cobros` por cada
 *   contrato. Son DOCUMENTOS: se listan con su estado, pero ningún número de
 *   deuda sale de ellos.
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
  ArrowRight,
  ArrowSquareOut,
  Bell,
  Copy,
  Envelope,
  FileText,
  IdentificationCard,
  PencilSimple,
  Phone,
  Receipt,
  UserCircleMinus,
  Warning,
} from '@phosphor-icons/react';
import { CrossFade, IconButton, Stagger, StaggerItem } from '@leasefy/cadence';
import { toast } from '@/components/ui/toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BotonEnviarMensaje } from '@/components/messages/BotonEnviarMensaje';
import { InterruptorDeWhatsapp } from '@/components/messages/InterruptorDeWhatsapp';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
  RenglonDeArriendo,
  rutaDelContratoManualPara,
  textoDeVigentes,
} from '@/components/inmobiliaria/InquilinosTable';
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext';
import { RUTA_DE_REGLAS_DE_MORA } from '@/components/estado-de-cuenta/intereses';
import { documentoParaMostrar } from '@/lib/inquilinos/documento-con-dv';
import { useI18n } from '@/lib/i18n';
import { useInquilinoDetalle } from '@/lib/hooks/use-inquilino-detalle';
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';
import {
  arriendosVigentes,
  cuentaDelPortal,
  type Inquilino,
} from '@/lib/api/inquilinos.service';
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service';
import { estadoDeLaDeuda } from '@/lib/estado-de-cuenta/estado-de-la-deuda';
import type { CobroConDesglose } from '@/lib/api/recibos-de-caja.types';
import type { CobroStatus } from '@/lib/types/inmobiliaria';
import { DatosPorCompletar } from '@/components/inmobiliaria/DatosPorCompletar';

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

/**
 * Lo que dicen sus cobros EMITIDOS como documentos: cuándo pagó el último y
 * cuántas veces se le recordó.
 *
 * 🔴 A propósito NO trae saldo ni mora. Tuvo `saldoPendiente`, `enMora` y
 * `diasDeMora` hasta el 2026-09-16, y eran la deuda leída de los cobros: con
 * cero cobros daba cero, y los días de mora no restaban el plazo del contrato.
 * Lo que debe sale del estado de cuenta (`detalle.cuenta`).
 */
export interface ResumenDePagos {
  /** Fecha del pago más reciente, o `null` si nunca pagó. */
  ultimoPago: string | null;
  /** Recordatorios enviados sobre sus cobros y la fecha del último. */
  recordatorios: number;
  ultimoRecordatorio: string | null;
}

/** La historia de sus cobros emitidos. Pura y exportada para poder fijarla. */
export function resumirPagos(cobros: readonly CobroConDesglose[]): ResumenDePagos {
  return cobros.reduce<ResumenDePagos>(
    (acc, c) => ({
      ultimoPago:
        c.paidDate && (!acc.ultimoPago || c.paidDate > acc.ultimoPago) ? c.paidDate : acc.ultimoPago,
      recordatorios: acc.recordatorios + (c.remindersSent ?? 0),
      ultimoRecordatorio:
        c.lastReminderDate && (!acc.ultimoRecordatorio || c.lastReminderDate > acc.ultimoRecordatorio)
          ? c.lastReminderDate
          : acc.ultimoRecordatorio,
    }),
    {
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
  /** E-16: abre «Editar datos» con esta persona. Sin él, no hay botón. */
  onEditar?: (persona: Inquilino) => void;
  /** Sube cuando sus datos cambiaron: el cajón vuelve a pedir su detalle. */
  version?: number;
}

export function InquilinoDrawer({ persona, onCerrar, onEditar, version = 0 }: InquilinoDrawerProps) {
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
        size="lg"
        // Cabecera y cuerpo viven en `CuerpoDelCajon`.
        layout="manual"
        aria-describedby={undefined}
        data-testid="inquilino-cajon"
      >
        {/* El título accesible lo exige Radix y va acá, no en el cuerpo: así
            `CuerpoDelCajon` se monta en un test sin el contexto del Sheet.
            En pantalla el nombre lo pinta la cabecera del cuerpo. */}
        <SheetTitle className="sr-only">{ultima?.nombre ?? ''}</SheetTitle>
        {ultima && <CajonDeInquilino persona={ultima} onEditar={onEditar} version={version} />}
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
function CajonDeInquilino({
  persona,
  onEditar,
  version,
}: {
  persona: Inquilino;
  onEditar?: (persona: Inquilino) => void;
  version: number;
}) {
  const detalle = useInquilinoDetalle(persona, version);
  if (!detalle) return null;
  return <CuerpoDelCajon detalle={detalle} onEditar={onEditar} />;
}

/**
 * Separado del `Sheet` a propósito: así el test lo monta sin portal ni Radix,
 * y lo que se prueba es lo que se ve, no el envoltorio.
 */
export function CuerpoDelCajon({
  detalle,
  onEditar,
}: {
  detalle: NonNullable<ReturnType<typeof useInquilinoDetalle>>;
  /** E-16: «Editar datos». Sin él (o sin `contratos:edit`), no hay botón. */
  onEditar?: (persona: Inquilino) => void;
}) {
  const { t, formatCurrency, formatDate } = useI18n();
  /*
   * Editar pide `contratos:edit`, el permiso con el que el back protege
   * `PATCH /inmobiliaria/inquilinos/:tenantId`: un botón que abre un
   * formulario cuyo guardar da 403 es peor que no tenerlo. Fuera del panel
   * (pruebas) no hay contexto de permisos y no se recorta.
   */
  const permisos = usePermissionsContextSafe();
  const puedeEditar = Boolean(onEditar) && (permisos ? permisos.canAccess('contratos', 'edit') : true);
  const {
    persona,
    cargandoArriendos,
    arriendosIncompletos,
    cobros,
    cargandoPagos,
    errorPagos,
    pagosIncompletos,
    cuenta,
    cargandoCuenta,
    errorCuenta,
    refDeCuenta,
    reintentar,
  } = detalle;

  const vigentes = arriendosVigentes(persona);
  const canon = vigentes.reduce((suma, a) => suma + a.canonCop, 0);
  const resumen = useMemo(() => resumirPagos(cobros), [cobros]);
  const visibles = cobros.slice(0, TOPE_DE_COBROS);
  const contratoPrincipal = persona.arriendos[0]?.contractId;
  const sinArriendos = persona.arriendos.length === 0;
  /*
   * I-12 / I-22: la cuenta del portal, si la tiene. Lo que habla con un `User`
   * (escribirle, el interruptor de WhatsApp) recibe SÓLO esto: la identidad de
   * la lista puede ser `doc:…` y daba 400. Sin cuenta, el cajón lo DICE.
   */
  const idDeLaCuenta = cuentaDelPortal(persona);
  // El conteo de cobros emitidos no es cierto hasta que llegaron: una pill en
  // cero mientras carga es un número inventado.
  const cobrosLlegaron = !cargandoPagos && !errorPagos;
  /*
   * Lo que debe, del estado de cuenta. Sin resumen —cargando, caído, o sin un
   * solo contrato que lo respalde— no hay número: un «$0» sobre datos que no
   * llegaron se lee «está al día», que es el error más caro de esta pantalla.
   */
  const cuentaConocida = cuenta !== null && cuenta.contratos > 0 && !cargandoCuenta;
  const deuda = cuentaConocida ? estadoDeLaDeuda(cuenta) : null;
  /*
   * E-09 (QA-INQ, 03-10): los intereses de mora van APARTE de lo vencido. Con
   * lo vencido en cero y intereses sin pagar, la persona NO está «al día».
   */
  const interesesSinPagar = cuentaConocida ? (cuenta.interesDeMora ?? 0) : 0;
  const alDiaConIntereses = deuda?.tipo === 'AL_DIA' && interesesSinPagar > 0;
  /* Y sin reglas de mora, a lo que está en cartera no se le causa interés: se dice (R-06). */
  const sinReglasDeMora = cuentaConocida && cuenta.sinReglasDeMora === true && deuda?.tipo === 'EN_CARTERA';
  const enlaceAlEstadoDeCuenta = refDeCuenta
    ? `${rutaDelEstadoDeCuenta('inquilino', refDeCuenta)}?volver=${encodeURIComponent(
        '/panel/inmobiliaria/inquilinos',
      )}`
    : null;

  return (
    <>
      {/* Sin `title`: el título accesible lo pone el envoltorio (este cuerpo se
          monta en un test sin el contexto del Sheet). */}
      <SheetHeader>
        {/* Con «Editar datos» y «Enviar mensaje», a 390 px no caben al lado del
            nombre: las acciones bajan a su propio renglón en vez de apretarlo
            letra por letra (I-28). */}
        <div className="flex flex-wrap items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
          >
            {inicialesDe(persona.nombre)}
          </span>
          <div className="min-w-0 flex-1 basis-[12rem]">
            {/* UN solo encabezado con el nombre: el accesible es el
                `SheetTitle` del envoltorio (un `h2`). Éste era otro `h2` con
                el mismo texto. Y se ajusta en dos renglones: a 390 px se
                cortaba en «Ana So…». */}
            <p className="break-words text-lg font-semibold leading-snug text-fg" data-testid="inquilino-cajon-nombre">
              {persona.nombre}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              {sinArriendos
                ? t('inquilinos.sinArriendo')
                : persona.arriendos.length === 1
                  ? t('inquilinos.conteoArriendoUno', { vigentes: textoDeVigentes(t, vigentes.length) })
                  : t('inquilinos.conteoArriendos', {
                      n: persona.arriendos.length,
                      vigentes: textoDeVigentes(t, vigentes.length),
                    })}
            </p>
          </div>
          {/* Escribirle sin salir de la ficha, por su CUENTA del portal. Sin
              cuenta no hay dónde escribirle, y se dice (I-22, Nico: la cuenta
              se crea desde el contrato; acá no se invita). */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {puedeEditar ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                hideArrow
                onClick={() => onEditar?.(persona)}
                data-testid="inquilino-editar"
              >
                <PencilSimple className="h-4 w-4" aria-hidden="true" />
                {t(`${NS}.editarDatos`)}
              </Button>
            ) : null}
            {idDeLaCuenta ? (
              <BotonEnviarMensaje counterpartId={idDeLaCuenta} />
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted/40 px-2.5 py-1.5 text-sm text-fg-muted"
                title={t(`${NS}.sinCuentaDelPortalPorQue`)}
                data-testid="inquilino-sin-cuenta"
              >
                <UserCircleMinus className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t(`${NS}.sinCuentaDelPortal`)}
              </span>
            )}
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
              // I-14: el NIT con su dígito de verificación (algoritmo DIAN).
              valor={documentoParaMostrar(persona.documento, persona.tipoDocumento)}
              accion={t(`${NS}.documento`)}
              mono
            />
          ) : null}
          {/* T-0128: el documento puede faltar si lo creó la migración. */}
          <DatosPorCompletar pendientes={persona.datosPendientes} />
          {/* Sin correo ni teléfono no es un detalle: es a quién no se le
              puede cobrar ni avisar. Va en la cabecera, no escondido. */}
          {!persona.email && !persona.telefono ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning-soft/40 px-2.5 py-1.5 text-sm text-warning">
              <Warning className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('inquilinos.sinContacto')}
            </span>
          ) : null}
        </div>
      </SheetHeader>

      <SheetBody>
        {/* El permiso para escribirle por WhatsApp desde el chat (2026-09-12).
            Apagado por defecto: tener su teléfono no autoriza el canal. */}
        <InterruptorDeWhatsapp personaId={idDeLaCuenta} className="mb-4" />
        {sinArriendos ? (
          <div className="space-y-3">
            {arriendosIncompletos ? <Aviso texto={t(`${NS}.arriendosIncompletos`)} /> : null}
            {/* Cargando → el vacío: se cruzan (fundido; el vacío trae su
                propia subida). */}
            <CrossFade swapKey={cargandoArriendos ? 'cargando' : 'vacio'} direction="none">
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
                    // I-29: con la persona ya elegida en el contrato manual.
                    href: rutaDelContratoManualPara(persona),
                  }}
                  className="py-14"
                />
              )}
            </CrossFade>
          </div>
        ) : (
          <div className="space-y-7">
            {/* La franja. Sin cajas: la jerarquía la pone el dato, no el borde.
                Los dos números de plata salen del ESTADO DE CUENTA, no de los
                cobros: la deuda nace con el contrato. */}
            <div className="space-y-3" data-testid="inquilino-cajon-deuda">
              {/* I-28: a 390 px las tres cifras se APILAN (una por renglón);
                  en tres columnas angostas se cortaban en «$ 1.850…». */}
              <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {/* Cuántos vigentes de cuántos ya lo dice la cabecera. */}
                <Numero
                  etiqueta={t(`${NS}.canonVigente`)}
                  valor={formatCurrency(canon)}
                  tono={canon === 0 ? 'apagado' : 'neutro'}
                />
                <Numero
                  etiqueta={t(`${NS}.restaPorPagar`)}
                  valor={cuentaConocida ? formatCurrency(cuenta.restaPorPagar) : '—'}
                  tono={!cuentaConocida || cuenta.restaPorPagar === 0 ? 'apagado' : 'neutro'}
                  detalle={
                    cuentaConocida && cuenta.proximaCuota
                      ? t(`${NS}.proximaCuota`, {
                          fecha: formatDate(cuenta.proximaCuota.fecha),
                          monto: formatCurrency(cuenta.proximaCuota.monto),
                        })
                      : undefined
                  }
                />
                <Numero
                  etiqueta={t(`${NS}.vencidoSinPagar`)}
                  valor={cuentaConocida ? formatCurrency(cuenta.pendiente) : '—'}
                  tono={
                    deuda?.tipo === 'EN_CARTERA'
                      ? 'alerta'
                      : deuda?.tipo === 'VENCIDO_EN_PLAZO'
                        ? 'neutro'
                        : 'apagado'
                  }
                  detalle={
                    deuda?.tipo === 'EN_CARTERA'
                      ? deuda.dias === 1
                        ? t(`${NS}.enCarteraUnDia`)
                        : t(`${NS}.enCartera`, { n: deuda.dias })
                      : deuda?.tipo === 'VENCIDO_EN_PLAZO'
                        ? t(`${NS}.vencidoEnPlazo`)
                        : alDiaConIntereses
                          ? t(`${NS}.interesesSinPagar`, { monto: formatCurrency(interesesSinPagar) })
                          : deuda?.tipo === 'AL_DIA'
                            ? t(`${NS}.alDia`)
                            : undefined
                  }
                  detalleTono={
                    deuda?.tipo === 'EN_CARTERA'
                      ? 'alerta'
                      : deuda?.tipo === 'VENCIDO_EN_PLAZO' || alDiaConIntereses
                        ? 'aviso'
                        : 'bien'
                  }
                />
              </dl>

              {errorCuenta ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-4 py-3">
                  <p className="text-sm text-danger" role="alert">
                    {t(`${NS}.errorCuenta`)}
                  </p>
                  <Button variant="outline" size="sm" hideArrow onClick={reintentar}>
                    {t(`${NS}.reintentar`)}
                  </Button>
                </div>
              ) : !cargandoCuenta && cuenta !== null && cuenta.contratos === 0 ? (
                /* Tiene arriendos pero ningún contrato responde por él: no se
                   sabe qué debe, y se dice en vez de pintar un cero. */
                <Aviso texto={t(`${NS}.sinEstadoDeCuenta`)} />
              ) : null}

              {sinReglasDeMora ? (
                <p
                  className="flex flex-wrap items-start gap-x-2 gap-y-1 rounded-lg border border-warning/40 bg-warning-soft/40 px-3 py-2 text-caption text-fg"
                  data-testid="inquilino-sin-reglas-de-mora"
                >
                  <Warning className="mt-px h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <span className="min-w-0 flex-1 basis-[14rem]">{t(`${NS}.sinReglasDeMora`)}</span>
                  <Link href={RUTA_DE_REGLAS_DE_MORA} className="font-medium underline underline-offset-4">
                    {t(`${NS}.configurarReglasDeMora`)}
                  </Link>
                </p>
              ) : null}

              {enlaceAlEstadoDeCuenta ? (
                <Button asChild variant="secondary" size="sm" hideArrow>
                  <Link href={enlaceAlEstadoDeCuenta} data-testid="inquilino-cajon-estado-de-cuenta">
                    {t(`${NS}.verEstadoDeCuenta`)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <Seccion
              titulo={t(`${NS}.arriendos`)}
              conteo={persona.arriendos.length}
              meta={
                cargandoArriendos ? (
                  <span className="inline-flex items-center gap-1.5 text-caption text-fg-muted">
                    <Spinner size="sm" /> {t(`${NS}.cargandoArriendos`)}
                  </span>
                ) : null
              }
            >
              {/* El subtítulo acompaña a una lista; nunca queda flotando sobre
                  la nada, porque sin arriendos esta sección no se pinta. */}
              <p className="text-xs text-fg-muted">{t(`${NS}.arriendosIncluyeTerminados`)}</p>

              {arriendosIncompletos ? <Aviso texto={t(`${NS}.arriendosIncompletos`)} /> : null}

              <Stagger as="ul" className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                {persona.arriendos.map((a) => (
                  <StaggerItem as="li" key={a.contractId} className="space-y-0.5 bg-surface py-1.5">
                    <RenglonDeArriendo arriendo={a} />
                    <Link
                      href={`/panel/inmobiliaria/contratos/${a.contractId}`}
                      className="inline-flex items-center gap-1 px-3 text-xs text-primary hover:underline"
                    >
                      {t(`${NS}.verContrato`)}
                      <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
            </Seccion>

            <div data-testid="inquilino-cajon-pagos">
              <Seccion
                titulo={t(`${NS}.cobrosEmitidos`)}
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
                        {resumen.recordatorios === 1
                          ? t(`${NS}.recordatoriosUno`, { fecha: formatDate(resumen.ultimoRecordatorio) })
                          : t(`${NS}.recordatorios`, {
                              n: resumen.recordatorios,
                              fecha: formatDate(resumen.ultimoRecordatorio),
                            })}
                      </span>
                    ) : null}
                  </div>
                }
              >
                {/* Cargando → los cobros (o el fallo, o el vacío): se cruzan. */}
                <CrossFade
                  swapKey={cargandoPagos ? 'cargando' : errorPagos ? 'fallo' : cobros.length === 0 ? 'vacio' : 'lista'}
                  direction="none"
                  className="space-y-2.5"
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
                    /* 🔴 Sin cobros NO quiere decir sin deuda: el cobro es el
                       documento con que se reclama, y la deuda ya está en la
                       franja de arriba. El vacío lo dice y lleva al estado de
                       cuenta, no a esperar un cobro. */
                    <EmptyState
                      icon={Receipt}
                      title={t(`${NS}.sinCobrosTitulo`)}
                      description={t(`${NS}.sinCobros`)}
                      action={
                        enlaceAlEstadoDeCuenta
                          ? { label: t(`${NS}.verEstadoDeCuenta`), href: enlaceAlEstadoDeCuenta }
                          : contratoPrincipal
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
                      <Stagger as="ul" className="divide-y divide-border-faint overflow-hidden rounded-lg border border-border">
                        {visibles.map((c) => (
                          <StaggerItem as="li" key={c.id}>
                            <FilaDePago cobro={c} />
                          </StaggerItem>
                        ))}
                      </Stagger>
                      {cobros.length > visibles.length ? (
                        <p className="text-xs text-fg-muted">
                          {cobros.length - visibles.length === 1
                            ? t(`${NS}.yMasCobrosUno`)
                            : t(`${NS}.yMasCobros`, { n: cobros.length - visibles.length })}
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
                </CrossFade>
              </Seccion>
            </div>
          </div>
        )}
      </SheetBody>
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

/**
 * Un cobro emitido en una línea: mes, estado del documento, vencimiento, total
 * y lo que queda de ese documento.
 *
 * Sin «N días de mora»: `daysLate` del cobro no resta el plazo del contrato, y
 * esa frontera ya la dice la franja de arriba, leída de las cuotas.
 */
function FilaDePago({ cobro }: { cobro: CobroConDesglose }) {
  const { t, formatCurrency, formatDate, locale } = useI18n();
  const tono = TONO_DEL_COBRO[cobro.status];
  const debe = (cobro.pendingAmount ?? 0) > 0;
  /*
   * I-10 (QA-INQ, 03-10): una GRILLA, no un renglón que se acomoda. Antes el
   * «Saldo» saltaba de renglón en unos meses y en otros se salía del borde, y
   * los montos no quedaban uno debajo del otro. A la izquierda mes, estado y
   * vencimiento; a la derecha, en columnas de ancho fijo, valor y saldo,
   * alineados a la derecha. En el celular el valor y el saldo se apilan a la
   * derecha y nada se sale del borde.
   */
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 bg-surface px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_17rem]"
      data-testid="cobro-del-cajon"
    >
      <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[5.5rem_minmax(0,1fr)]">
        <span className="text-sm font-medium text-fg">
          {nombreDelMes(cobro.month, locale === 'en' ? 'en' : 'es', 'short')}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant={tono?.variant ?? 'secondary'}>
            {/* Un estado que el back agregue mañana se muestra crudo: mejor una
                etiqueta rara que una fila que miente. */}
            {tono ? t(tono.clave) : cobro.status}
          </Badge>
          {cobro.paidDate && !debe ? (
            <span className="text-xs text-fg-muted">
              {t(`${NS}.pagadoEl`, { fecha: formatDate(cobro.paidDate) })}
            </span>
          ) : (
            <span className="text-xs text-fg-muted">
              {t(`${NS}.vencimiento`, { fecha: formatDate(cobro.dueDate) })}
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-col items-end gap-0.5 sm:grid sm:grid-cols-[8rem_9rem] sm:items-center sm:gap-x-0">
        <span className="whitespace-nowrap text-right font-mono text-sm tabular-nums text-fg">
          {/* `totalWithFees` incluye la mora ya causada; el total pelado
              cobraría de menos justo en las filas que importan. */}
          {formatCurrency(cobro.totalWithFees ?? cobro.totalAmount)}
        </span>
        {debe ? (
          <span className="whitespace-nowrap text-right font-mono text-xs tabular-nums text-fg-muted">
            {t(`${NS}.saldoDelCobro`, { monto: formatCurrency(cobro.pendingAmount) })}
          </span>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}
      </div>
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
  detalleTono?: 'neutro' | 'alerta' | 'aviso' | 'bien';
}) {
  return (
    <div className="min-w-0 py-2.5 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs text-fg-muted">{etiqueta}</dt>
      <dd
        className={cn(
          // I-28: una cifra de plata NUNCA se corta con «…»: no se puede leer cuánto debe.
          'mt-1 whitespace-nowrap font-mono text-lg font-semibold tabular-nums',
          tono === 'alerta' ? 'text-danger' : tono === 'apagado' ? 'text-fg-subtle' : 'text-fg',
        )}
      >
        {valor}
      </dd>
      {detalle ? (
        <dd
          className={cn(
            'mt-0.5 text-xs',
            detalleTono === 'alerta'
              ? 'text-danger'
              : detalleTono === 'aviso'
                ? 'text-warning'
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
