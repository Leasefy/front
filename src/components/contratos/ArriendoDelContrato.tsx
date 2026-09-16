'use client';

/**
 * ArriendoDelContrato — el arriendo, en UN bloque que se lee de arriba abajo.
 *
 * ── Por qué existe (Nico, 2026-09-16) ───────────────────────────────────────
 * «Esto debe verse más unificado. Haz un glow up de esa parte de arriendo en
 * curso, se ve horrible, y no uses ese tono verde. Y muestra ahí todo que se
 * entienda mejor cuando uno lo vaya a leer: el estado de cuenta, cuál es su
 * canon, algo más visual en cuánto va de avance de su contrato.»
 *
 * Antes eran TRES cajas sueltas que además se contradecían: una franja con
 * «Saldo del inquilino — sin cobros todavía» (que sumaba COBROS), debajo
 * «Resta por pagar $19.214.516» (del estado de cuenta), y una caja entera
 * teñida de verde que decía «Arriendo en curso · Vigente hasta el 2027-08-20»
 * mientras la franja decía «20 ago 2027» para la misma fecha.
 *
 * ── La historia, en el orden en que se pregunta ─────────────────────────────
 *   1. En qué va — la etapa (eyebrow) y, si pide algo, el aviso.
 *   2. Cuánto va del contrato — «Mes 13 de 24» y la línea inicio · hoy · fin.
 *   3. Cuánto paga y cuándo — el canon y «Paga el 21 de cada mes, con 2 días
 *      de plazo».
 *   4. Cómo va con la plata — el ESTADO DE CUENTA de este contrato, que es la
 *      puerta principal del bloque: resta por pagar, próxima cuota y el estado
 *      de la deuda con sus TRES palabras (al día · vencido, en plazo · en
 *      cartera).
 *   5. Las decisiones del ciclo de vida, al pie y en voz baja.
 *
 * ── El color ────────────────────────────────────────────────────────────────
 * Superficie neutra, siempre. El estado se dice con un indicador chico —un
 * ícono en un círculo— y con palabras, nunca pintando el bloque. «Al día» va
 * en gris: un contrato al día es lo normal, no un logro que celebrar. El único
 * color que se gasta es el de lo que pide atención: ámbar para lo vencido en
 * plazo, rojo para la cartera. El avance va en cobalto, el acento de la casa.
 *
 * ── 🔴 Ningún número sale de los cobros ────────────────────────────────────
 * Todo lo de plata sale del estado de cuenta (`useCuentaDelContrato`). Un
 * contrato puede deber $19 M sin un solo cobro emitido, y eso es lo normal.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowClockwise,
  Check,
  Clock,
  WarningCircle,
  type Icon as IconoDePhosphor,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui';
import { SectionLabel } from '@/components/ui/section-label';
import { fechaLegible, hoyLocal } from '@/components/estado-de-cuenta/filas';
import { rutaDelEstadoDeCuenta } from '@/lib/api/estado-de-cuenta.service';
import {
  avanceDelContrato,
  soloElDia,
  type AvanceDelContrato,
} from '@/lib/contratos/avance-del-contrato';
import {
  deudaDelContrato,
  NOMBRE_DEL_ESTADO,
  type DeudaDelContrato,
} from '@/lib/contratos/deuda-del-contrato';
import { diasDePlazoQueRigen, ritmoDePago } from '@/lib/contratos/ritmo-de-pago';
import type { Vigencia } from '@/lib/contratos/vigencia';
import {
  useCuentaDelContrato,
  type CuentaDelContrato,
} from '@/lib/hooks/use-cuenta-del-contrato';
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { cn } from '@/lib/utils';

const POR_FIRMAR: ContractStatus[] = [
  'draft',
  'pending_landlord',
  'pending_tenant',
  'rejected_pending_modifications',
];

/** Hasta cuántos meses la línea se parte en un tramo por mes. */
const MESES_CON_TRAMOS = 36;

function dias(n: number): string {
  return `${n} ${n === 1 ? 'día' : 'días'}`;
}

function meses(n: number): string {
  return `${n} ${n === 1 ? 'mes' : 'meses'}`;
}

/** «hoy», «mañana», «en 5 días». */
function enCuanto(n: number): string {
  if (n <= 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `en ${dias(n)}`;
}

// ─── La etapa ────────────────────────────────────────────────────────────────

type Punto = 'default' | 'warning' | 'neutral';

export function etapaDelArriendo(
  status: ContractStatus,
  vigencia: Vigencia,
  avance: AvanceDelContrato,
): { texto: string; punto: Punto } {
  if (POR_FIRMAR.includes(status)) return { texto: 'Contrato por firmar', punto: 'default' };
  if (status === 'signed') return { texto: 'Firmado, falta activarlo', punto: 'default' };
  if (vigencia.estado === 'TERMINADO_ANTICIPADAMENTE')
    return { texto: 'Terminado antes de tiempo', punto: 'neutral' };
  if (vigencia.estado === 'TERMINADO_POR_VENCIMIENTO')
    return { texto: 'Arriendo terminado', punto: 'neutral' };
  if (status === 'cancelled') return { texto: 'Contrato cancelado', punto: 'neutral' };
  if (vigencia.vencidoSinRenovar) return { texto: 'Vencido sin renovar', punto: 'warning' };
  if (avance.tramo === 'POR_EMPEZAR') return { texto: 'Arriendo por empezar', punto: 'default' };
  return { texto: 'Arriendo en curso', punto: 'default' };
}

// ─── El bloque ───────────────────────────────────────────────────────────────

export interface ArriendoDelContratoProps {
  contract: Contract;
  vigencia: Vigencia;
  /**
   * Lo que pide atención, debajo de la etapa: el paso de la firma que sigue o
   * la decisión sobre un contrato vencido. Ver `AvisoDelContrato`.
   */
  aviso?: React.ReactNode;
  /** Las decisiones tranquilas del ciclo de vida, al pie. */
  acciones?: React.ReactNode;
  /**
   * El día civil de hoy (`YYYY-MM-DD`). La ficha pasa el MISMO con el que
   * calculó la `vigencia`, para que la etapa y la línea no discrepen a
   * medianoche UTC. Sin él, el del navegador.
   */
  hoy?: string;
}

export function ArriendoDelContrato({
  contract,
  vigencia,
  aviso,
  acciones,
  hoy: hoyFijo,
}: ArriendoDelContratoProps) {
  const hoy = hoyFijo ?? hoyLocal();
  const { cuenta, agencia, esperandoAgencia, reintentar } = useCuentaDelContrato(contract);

  /*
   * Un contrato terminado antes de tiempo tiene su `endDate` movido al día de
   * la terminación; el pactado queda en `finPactadoOriginal`. La línea se
   * dibuja sobre lo PACTADO y se corta el día en que terminó: «terminó en el
   * mes 13 de 24» dice más que una barra llena de 13 meses.
   */
  const terminadoEn = soloElDia(contract.terminadoEn);
  const avance = avanceDelContrato({
    inicio: contract.startDate,
    fin: terminadoEn ? contract.finPactadoOriginal ?? contract.endDate : contract.endDate,
    hoy: terminadoEn && terminadoEn < hoy ? terminadoEn : hoy,
  });
  const etapa = etapaDelArriendo(contract.status, vigencia, avance);
  const plazo = diasDePlazoQueRigen(contract, agencia);

  return (
    <section
      aria-label="El arriendo"
      data-testid="arriendo-del-contrato"
      className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm"
    >
      <div className="px-6 pt-5">
        <SectionLabel dotVariant={etapa.punto} className="gap-2.5">
          <span data-testid="etapa-del-arriendo">{etapa.texto}</span>
        </SectionLabel>
      </div>

      {aviso}

      <div className="grid gap-6 px-6 pb-6 pt-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
        <LineaDelContrato
          avance={avance}
          vigencia={vigencia}
          terminadoEn={terminadoEn}
          className="lg:pr-8"
        />

        <dl className="grid content-start gap-5 border-t border-border-faint pt-5 sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <div>
            <dt className="text-label uppercase tracking-wide text-fg-subtle">Canon</dt>
            <dd className="mt-1.5 flex items-baseline gap-1.5" data-testid="canon-del-arriendo">
              {contract.monthlyRent ? (
                <>
                  <span className="whitespace-nowrap font-mono text-[26px] font-medium leading-none tabular-nums text-fg">
                    {formatCurrency(contract.monthlyRent)}
                  </span>{' '}
                  <span className="text-body-sm text-fg-muted">al mes</span>
                </>
              ) : (
                <span className="text-body-sm text-fg-muted">Sin canon cargado</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-label uppercase tracking-wide text-fg-subtle">Cuándo paga</dt>
            <dd className="mt-1.5 text-body-sm text-fg" data-testid="ritmo-de-pago">
              {ritmoDePago(contract, agencia)}
            </dd>
          </div>
        </dl>
      </div>

      <CuentaDelArriendo
        contract={contract}
        cuenta={cuenta}
        hoy={hoy}
        diasDePlazo={plazo}
        // Sin plazo propio y con la inmobiliaria por contestar, el estado
        // espera: no se afirma «en plazo» ni «en cartera» sobre un supuesto.
        esperandoPlazo={contract.diasDePlazo == null && esperandoAgencia}
        reintentar={reintentar}
      />

      {acciones ? (
        <div
          className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 border-t border-border-faint px-6 py-3"
          data-testid="acciones-del-arriendo"
        >
          {acciones}
        </div>
      ) : null}
    </section>
  );
}

// ─── 2 · La línea del contrato ───────────────────────────────────────────────

function LineaDelContrato({
  avance,
  vigencia,
  terminadoEn,
  className,
}: {
  avance: AvanceDelContrato;
  vigencia: Vigencia;
  terminadoEn: string | null;
  className?: string;
}) {
  const reducirMovimiento = usePrefiereMenosMovimiento();
  // La barra crece al montar; con movimiento reducido nace llena.
  const [crecida, setCrecida] = React.useState(reducirMovimiento);
  React.useEffect(() => {
    if (reducirMovimiento) {
      setCrecida(true);
      return;
    }
    const id = requestAnimationFrame(() => setCrecida(true));
    return () => cancelAnimationFrame(id);
  }, [reducirMovimiento]);

  if (avance.tramo === 'SIN_FECHAS') {
    return (
      <div className={className} data-testid="linea-del-contrato">
        <p className="text-label uppercase tracking-wide text-fg-subtle">Avance</p>
        <p className="mt-1.5 text-body-sm text-fg-muted">
          {avance.inicio || avance.fin
            ? 'Le falta la fecha de inicio o la de fin: sin las dos no se puede decir cuánto va.'
            : 'Este contrato no tiene cargadas sus fechas de inicio y fin.'}
        </p>
      </div>
    );
  }

  const terminado =
    terminadoEn !== null || vigencia.estado === 'TERMINADO_POR_VENCIMIENTO';

  // ── El titular y lo que va a su derecha ──
  let titular: React.ReactNode;
  let aLaDerecha: string;
  if (terminadoEn) {
    titular = (
      <>
        <span className="text-body text-fg-muted">Terminó en el mes</span>{' '}
        <Cifra>{Math.max(1, avance.mesActual)}</Cifra>{' '}
        <span className="font-mono text-body tabular-nums text-fg-muted">de {avance.meses}</span>
      </>
    );
    aLaDerecha = `El ${fechaLegible(terminadoEn)}`;
  } else if (avance.tramo === 'POR_EMPEZAR') {
    const d = avance.diasParaEmpezar ?? 0;
    titular = (
      <>
        <span className="text-body text-fg-muted">Empieza</span>{' '}
        {d === 1 ? (
          <span className="text-body text-fg">mañana</span>
        ) : (
          <>
            <span className="text-body text-fg-muted">en</span> <Cifra>{d}</Cifra>{' '}
            <span className="text-body text-fg-muted">días</span>
          </>
        )}
      </>
    );
    aLaDerecha = `Dura ${meses(avance.meses)}`;
  } else if (avance.tramo === 'CUMPLIDO') {
    titular = (
      <>
        <span className="text-body text-fg-muted">{terminado ? 'Duró' : 'Se cumplieron los'}</span>{' '}
        <Cifra>{avance.meses}</Cifra>{' '}
        <span className="text-body text-fg-muted">{avance.meses === 1 ? 'mes' : 'meses'}</span>
      </>
    );
    // Los días del vencido salen de la MISMA vigencia que el aviso de arriba:
    // dos cuentas distintas podrían decir «hace 3» y «hace 4» a medianoche.
    const hace = vigencia.vencidoSinRenovar
      ? vigencia.diasVencido
      : Math.max(1, -(avance.diasParaElFin ?? 0));
    aLaDerecha = terminado ? `Terminó el ${fechaLegible(avance.fin)}` : `Venció hace ${dias(hace)}`;
  } else {
    titular = (
      <>
        <span className="text-body text-fg-muted">Mes</span> <Cifra>{avance.mesActual}</Cifra>{' '}
        <span className="font-mono text-body tabular-nums text-fg-muted">de {avance.meses}</span>
      </>
    );
    const d = avance.diasParaElFin ?? 0;
    aLaDerecha =
      d <= 90
        ? d === 0
          ? 'Vence hoy'
          : `Vence ${enCuanto(d)}`
        : avance.mesesRestantes === 0
          ? 'Último mes'
          : `${avance.mesesRestantes === 1 ? 'Queda' : 'Quedan'} ${meses(avance.mesesRestantes)}`;
  }

  const enCurso = avance.tramo === 'EN_CURSO' && !terminadoEn;
  const valorTexto =
    avance.tramo === 'POR_EMPEZAR'
      ? `Todavía no empieza · dura ${meses(avance.meses)}`
      : `Mes ${avance.mesActual} de ${avance.meses} · del ${fechaLegible(avance.inicio)} al ${fechaLegible(avance.fin)}`;

  return (
    <div className={className} data-testid="linea-del-contrato">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex flex-wrap items-baseline gap-x-1.5" data-testid="avance-titular">
          {titular}
        </p>
        <p className="text-body-sm text-fg-muted" data-testid="avance-a-la-derecha">
          {aLaDerecha}
        </p>
      </div>

      <Barra
        fraccion={avance.fraccion}
        meses={avance.meses}
        mesActual={avance.mesActual}
        valorTexto={valorTexto}
        marcarHoy={enCurso}
        relleno={terminado ? 'bg-border-strong' : 'bg-primary'}
        crecida={crecida}
      />

      <div className="mt-2.5 flex items-start justify-between gap-4 font-mono text-caption tabular-nums">
        <span>
          <span className="block text-[11px] uppercase tracking-wide text-fg-subtle">Inicio</span>
          <span className="text-fg" data-testid="fecha-de-inicio">
            {fechaLegible(avance.inicio)}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-[11px] uppercase tracking-wide text-fg-subtle">
            {terminadoEn ? 'Fin pactado' : 'Fin'}
          </span>
          <span className="text-fg" data-testid="fecha-de-fin">
            {fechaLegible(avance.fin)}
          </span>
        </span>
      </div>
    </div>
  );
}

function Cifra({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[28px] font-medium leading-none tabular-nums text-fg">
      {children}
    </span>
  );
}

/**
 * La línea del contrato: un tramo por mes (hasta 36), lleno hasta hoy, con un
 * punto que dice «Hoy». Con más meses los tramos serían rayas: va continua.
 */
function Barra({
  fraccion,
  meses: totalDeMeses,
  mesActual,
  valorTexto,
  marcarHoy,
  relleno,
  crecida,
}: {
  fraccion: number;
  meses: number;
  mesActual: number;
  valorTexto: string;
  marcarHoy: boolean;
  relleno: string;
  crecida: boolean;
}) {
  const tramos = totalDeMeses <= MESES_CON_TRAMOS ? totalDeMeses : 1;
  const porcentaje = Math.round(fraccion * 1000) / 10;
  // La etiqueta «Hoy» no se sale del bloque en los bordes.
  const alinearHoy =
    porcentaje < 8 ? 'translate-x-0' : porcentaje > 92 ? '-translate-x-full' : '-translate-x-1/2';

  return (
    <div className={cn('relative', marcarHoy ? 'mt-3 pt-6' : 'mt-4')}>
      {marcarHoy ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0 font-mono text-[11px] font-medium uppercase tracking-wide text-primary',
            alinearHoy,
          )}
          style={{ left: `${porcentaje}%` }}
        >
          Hoy
        </span>
      ) : null}
      <div
        role="progressbar"
        aria-label="Avance del contrato"
        aria-valuemin={0}
        aria-valuemax={totalDeMeses}
        aria-valuenow={mesActual}
        aria-valuetext={valorTexto}
        className="flex h-2 gap-[3px]"
        data-testid="barra-del-contrato"
      >
        {Array.from({ length: tramos }, (_, i) => {
          const lleno = Math.min(1, Math.max(0, fraccion * tramos - i));
          return (
            <div
              key={i}
              className="h-full flex-1 overflow-hidden bg-surface-muted first:rounded-l-full last:rounded-r-full"
            >
              <div
                className={cn(
                  'h-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out',
                  relleno,
                )}
                style={{
                  width: `${(crecida ? lleno : 0) * 100}%`,
                  transitionDelay: crecida ? `${Math.min(i, 24) * 18}ms` : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      {marcarHoy ? (
        <span
          aria-hidden="true"
          className="absolute bottom-[-3px] size-3.5 -translate-x-1/2 rounded-full border-2 border-surface bg-primary shadow-sm"
          style={{ left: `${porcentaje}%` }}
          data-testid="marca-de-hoy"
        />
      ) : null}
    </div>
  );
}

function usePrefiereMenosMovimiento(): boolean {
  const [reducir] = React.useState(() => {
    try {
      return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    } catch {
      return false;
    }
  });
  return reducir;
}

// ─── 4 · Cómo va con la plata ───────────────────────────────────────────────

function CuentaDelArriendo({
  contract,
  cuenta,
  hoy,
  diasDePlazo,
  esperandoPlazo,
  reintentar,
}: {
  contract: Contract;
  cuenta: CuentaDelContrato;
  hoy: string;
  diasDePlazo: number | null;
  esperandoPlazo: boolean;
  reintentar: () => void;
}) {
  const deuda = React.useMemo<DeudaDelContrato | null>(
    () =>
      cuenta.estado === 'listo'
        ? deudaDelContrato({ contrato: cuenta.contrato, hoy, diasDePlazo })
        : null,
    [cuenta, hoy, diasDePlazo],
  );

  const volverAca = `/panel/inmobiliaria/contratos/${contract.id}`;
  const enlace =
    cuenta.estado === 'listo' || cuenta.estado === 'sin-cuotas'
      ? `${rutaDelEstadoDeCuenta('inquilino', cuenta.tenantRef)}?volver=${encodeURIComponent(volverAca)}`
      : null;

  return (
    <div
      className="mx-6 mb-6 rounded-md bg-surface-muted"
      data-testid="cuenta-del-arriendo"
      data-estado={cuenta.estado}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <p className="text-label uppercase tracking-wide text-fg-subtle">Estado de cuenta</p>
        {enlace ? (
          <Button
            asChild
            size="sm"
            variant={cuenta.estado === 'listo' ? 'default' : 'secondary'}
            hideArrow={cuenta.estado !== 'listo'}
          >
            <Link href={enlace} data-testid="ver-estado-de-cuenta">
              Ver estado de cuenta
            </Link>
          </Button>
        ) : null}
      </div>

      {cuenta.estado === 'listo' && deuda ? (
        /* La primera celda es más ancha: «$ 190.214.516» a 26 px no entra en
           un tercio del bloque con la barra lateral abierta (DESIGN.md §19: un
           número no se parte). Por debajo de `md` las tres se apilan. */
        <div className="grid gap-5 px-5 pb-5 pt-3 md:grid-cols-[1.3fr_1fr_1fr] md:gap-0 md:divide-x md:divide-border">
          <div className="min-w-0 md:pr-5">
            <p className="text-caption text-fg-muted">Resta por pagar</p>
            <p
              className="mt-1 whitespace-nowrap font-mono text-[26px] font-medium leading-none tabular-nums text-fg"
              data-testid="resta-por-pagar"
            >
              {formatCurrency(deuda.restaPorPagar)}
            </p>
            <p className="mt-2 text-caption text-fg-muted" data-testid="cuotas-pagadas">
              {deuda.cuotas.total === 0 ? (
                'De todo el contrato'
              ) : (
                <>
                  <span className="font-mono tabular-nums">{deuda.cuotas.pagadas}</span> de{' '}
                  <span className="font-mono tabular-nums">{deuda.cuotas.total}</span>{' '}
                  {deuda.cuotas.total === 1 ? 'cuota pagada' : 'cuotas pagadas'}
                  {deuda.cuotas.anteriores > 0 ? (
                    <>
                      {' · '}
                      <span className="font-mono tabular-nums">{deuda.cuotas.anteriores}</span> del
                      sistema anterior
                    </>
                  ) : null}
                </>
              )}
            </p>
          </div>

          <div className="min-w-0 md:px-5">
            <p className="text-caption text-fg-muted">Próxima cuota</p>
            {deuda.proxima ? (
              <>
                <p
                  className="mt-1 font-mono text-lg font-medium leading-tight tabular-nums text-fg"
                  data-testid="proxima-cuota"
                >
                  {fechaLegible(deuda.proxima.fecha)}
                </p>
                <p className="mt-1 text-caption text-fg-muted">
                  <span className="font-mono tabular-nums">{formatCurrency(deuda.proxima.monto)}</span>
                  {' · '}
                  {enCuanto(deuda.proxima.enDias)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-body-sm text-fg-muted">No queda ninguna cuota por vencer</p>
            )}
          </div>

          <div className="min-w-0 md:pl-5">
            <p className="text-caption text-fg-muted">Cómo va</p>
            {esperandoPlazo && deuda.vencido > 0 ? (
              <Skeleton className="mt-2 h-6 w-32" />
            ) : (
              <EstadoDeLaDeuda deuda={deuda} />
            )}
          </div>
        </div>
      ) : (
        <MensajeDeLaCuenta cuenta={cuenta} status={contract.status} reintentar={reintentar} />
      )}
    </div>
  );
}

const INDICADOR: Record<
  DeudaDelContrato['estado'],
  { icono: IconoDePhosphor; circulo: string }
> = {
  AL_DIA: { icono: Check, circulo: 'bg-surface text-fg-muted ring-1 ring-border' },
  VENCIDO_EN_PLAZO: { icono: Clock, circulo: 'bg-warning-soft text-warning' },
  VENCIDO_SIN_PLAZO: { icono: Clock, circulo: 'bg-warning-soft text-warning' },
  EN_CARTERA: { icono: WarningCircle, circulo: 'bg-danger-soft text-danger' },
};

function EstadoDeLaDeuda({ deuda }: { deuda: DeudaDelContrato }) {
  const { icono: Icono, circulo } = INDICADOR[deuda.estado];

  let detalle: React.ReactNode;
  switch (deuda.estado) {
    case 'AL_DIA':
      detalle = 'Nada vencido';
      break;
    case 'VENCIDO_EN_PLAZO': {
      const q = deuda.diasDePlazoQueQuedan ?? 0;
      detalle = (
        <>
          <Monto>{formatCurrency(deuda.vencido)}</Monto> vencido ·{' '}
          {q === 0
            ? 'hoy es su último día de plazo'
            : `le ${q === 1 ? 'queda' : 'quedan'} ${dias(q)} de plazo`}
        </>
      );
      break;
    }
    case 'VENCIDO_SIN_PLAZO':
      detalle = (
        <>
          <Monto>{formatCurrency(deuda.vencido)}</Monto> vencido · sin los días de plazo de tu
          inmobiliaria no se sabe si ya es cartera
        </>
      );
      break;
    case 'EN_CARTERA':
      detalle = (
        <>
          <Monto>{formatCurrency(deuda.enCartera)}</Monto> en cartera ·{' '}
          <span className="font-mono tabular-nums">{deuda.diasDeMora}</span>{' '}
          {deuda.diasDeMora === 1 ? 'día' : 'días'} de mora
          {deuda.vencido > deuda.enCartera ? (
            <span className="block">
              {' '}
              <Monto>{formatCurrency(deuda.vencido)}</Monto> vencido en total
            </span>
          ) : null}
        </>
      );
      break;
  }

  return (
    <div data-testid="estado-de-la-deuda" data-estado={deuda.estado}>
      <p className="mt-1 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', circulo)}
        >
          <Icono className="size-3.5" weight="bold" />
        </span>
        <span className="text-body font-medium text-fg" data-testid="estado-nombre">
          {NOMBRE_DEL_ESTADO[deuda.estado]}
        </span>
      </p>
      <p className="mt-1.5 text-caption text-fg-muted" data-testid="estado-detalle">
        {detalle}
      </p>
    </div>
  );
}

function Monto({ children }: { children: React.ReactNode }) {
  return <span className="whitespace-nowrap font-mono tabular-nums text-fg">{children}</span>;
}

function MensajeDeLaCuenta({
  cuenta,
  status,
  reintentar,
}: {
  cuenta: CuentaDelContrato;
  status: ContractStatus;
  reintentar: () => void;
}) {
  if (cuenta.estado === 'cargando') {
    return (
      <div className="grid gap-5 px-5 pb-5 pt-3 md:grid-cols-[1.3fr_1fr_1fr]" data-testid="cuenta-cargando">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-36" />
          </div>
        ))}
      </div>
    );
  }

  let texto: string;
  let reintentable = false;
  switch (cuenta.estado) {
    case 'no-aplica':
      texto =
        status === 'signed'
          ? 'Cuando actives el contrato se arman sus cuotas y nace su estado de cuenta.'
          : status === 'cancelled'
            ? 'Este contrato se canceló antes de activarse: no tiene cuotas ni estado de cuenta.'
            : 'Cuando el contrato se firme y se active, se arman sus cuotas y nace su estado de cuenta.';
      break;
    case 'sin-inquilino':
      texto =
        'Este contrato no tiene la cuenta ni el documento del inquilino, y sin uno de los dos no se puede abrir su estado de cuenta.';
      break;
    case 'sin-cuotas':
      texto = 'El estado de cuenta del inquilino todavía no tiene cuotas de este contrato.';
      break;
    case 'fallo':
      texto = cuenta.sinPermiso
        ? 'Tu rol no puede ver el estado de cuenta.'
        : 'No se pudo traer el estado de cuenta de este contrato.';
      reintentable = !cuenta.sinPermiso;
      break;
    default:
      texto = '';
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-2"
      data-testid="cuenta-mensaje"
    >
      <p className="text-body-sm text-fg-muted">{texto}</p>
      {reintentable ? (
        <Button type="button" variant="secondary" size="sm" hideArrow onClick={reintentar} className="gap-1.5">
          <ArrowClockwise className="size-4" aria-hidden="true" />
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

// ─── 1 · Lo que pide atención ────────────────────────────────────────────────

export interface AccionDelAviso {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  loading?: boolean;
}

/**
 * El paso que sigue (firmar, enviar, activar) o la decisión sobre un contrato
 * vencido, dentro del bloque y debajo de la etapa.
 *
 * Reemplaza a la `ActionBar` que pintaba la caja ENTERA del color del estado
 * (verde para «Arriendo en curso»). Acá la superficie es la del bloque y el
 * tono vive en un solo lugar: el círculo del ícono. `atencion` (ámbar) es para
 * lo que de verdad lo pide —un vencido, el turno de firmar, cambios pedidos—;
 * todo lo demás va en cobalto, el acento de la casa.
 */
export function AvisoDelContrato({
  tono,
  icono: Icono,
  titulo,
  detalle,
  principal,
  secundaria,
}: {
  tono: 'paso' | 'atencion';
  icono: React.ElementType;
  titulo: string;
  detalle: string;
  principal?: AccionDelAviso;
  secundaria?: AccionDelAviso;
}) {
  return (
    <div
      className="mx-6 mt-4 flex flex-col gap-4 rounded-md border border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      data-testid="aviso-del-contrato"
      data-tono={tono}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            tono === 'atencion' ? 'bg-warning-soft text-warning' : 'bg-primary-soft text-primary',
          )}
        >
          <Icono className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-medium text-fg">{titulo}</p>
          <p className="mt-0.5 text-caption text-fg-muted">{detalle}</p>
        </div>
      </div>
      {principal || secundaria ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {secundaria ? (
            <Button variant="secondary" hideArrow onClick={secundaria.onClick} className="gap-2">
              <secundaria.icon className="size-4" aria-hidden="true" />
              {secundaria.label}
            </Button>
          ) : null}
          {principal ? (
            <Button onClick={principal.onClick} disabled={principal.loading} hideArrow className="gap-2">
              {principal.loading ? (
                <Spinner size="sm" variant="current" />
              ) : (
                <principal.icon className="size-4" aria-hidden="true" />
              )}
              {principal.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
