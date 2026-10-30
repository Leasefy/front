'use client';

/**
 * Una factura de servicios en el cajón del contrato (Operación → Servicios públicos), con lo que pidió Portofino el
 * 29-10-2026:
 *   · el CORTE («Consumo del 15 ago al 15 sep · 32 días · facturada en octubre»), con el mes discreto si es estimado;
 *   · cómo cae en el contrato (de antes del inicio, o de entrada: «se parte por días»);
 *   · los COBROS DEL PROPIETARIO que trae (acuerdo de pago, revisión periódica…): «no son del inquilino»;
 *   · lo que LEYÓ y PROPUSO Servi. Sus propuestas se deciden en la Bandeja del Piloto: aquí se explican y se enlazan,
 *     nunca se deciden dos veces.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react';
import { Presence, StatusBadge } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MasDetalles } from '@/components/pantalla/MasDetalles';
import { OrbeDeAgente } from '@/components/agentes/OrbeDeAgente';
import { formatCurrency } from '@/lib/format';
import {
  COMO_CAE,
  FRASE_DEL_PROPIETARIO,
  NOMBRE_DEL_CONCEPTO_DEL_PROPIETARIO,
  POR_QUE_ES_ESTIMADO,
  RUTA_DE_LA_BANDEJA,
  comoCaeDe,
  conceptosDelPropietarioDe,
  diaCorto,
  estadoDeServi,
  fraseDelCorte,
  fraseDelMesFacturado,
  nombreDelMesCorto,
  revisionDeServiDe,
  totalDelPropietario,
} from '@/lib/servicios-publicos/corte-de-la-factura';
import type { ComoCaeEnElContrato, FacturaDeServicio } from '@/lib/api/servicios-publicos.service';

type Tono = 'success' | 'warning' | 'critical' | 'neutral' | 'info';

export const ESTADO_DE_LA_FACTURA: Record<FacturaDeServicio['estado'], { rotulo: string; tono: Tono }> = {
  POR_REVISAR: { rotulo: 'Por revisar', tono: 'warning' },
  AL_DIA: { rotulo: 'Al día', tono: 'success' },
  PENDIENTE: { rotulo: 'Por pagar con la garantía', tono: 'info' },
  LIQUIDADA: { rotulo: 'Aplicada', tono: 'success' },
  RECHAZADA: { rotulo: 'Rechazada', tono: 'critical' },
};

const TIPO: Record<FacturaDeServicio['tipo'], string> = {
  MENSUAL: 'Del mes',
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  AJUSTE: 'Ajuste',
};

/** «Consumo del 15 ago al 15 sep · 32 días · facturada en octubre» (el mes estimado, en tenue y con su porqué). */
export function CorteDeLaFactura({ factura, className }: { factura: FacturaDeServicio; className?: string }) {
  const mes = fraseDelMesFacturado(factura);
  return (
    <p className={className ?? 'text-caption text-fg-muted'} data-testid={`corte-${factura.id}`}>
      {fraseDelCorte(factura)} ·{' '}
      {mes.estimado ? (
        <span className="text-fg-subtle" title={POR_QUE_ES_ESTIMADO}>
          {mes.texto} <span className="sr-only">({POR_QUE_ES_ESTIMADO})</span>
          <span aria-hidden="true">(estimado)</span>
        </span>
      ) : (
        <span>{mes.texto}</span>
      )}
    </p>
  );
}

/** Cómo cae el corte en el contrato, con su punto: el de antes del inicio pide atención; el de entrada, informa. */
export function ComoCaeLaFactura({ cae, testid }: { cae: ComoCaeEnElContrato | null; testid?: string }) {
  const frase = cae ? COMO_CAE[cae] : null;
  if (!cae || !frase) return null;
  return (
    <p className="inline-flex items-start gap-2 text-caption text-fg" data-testid={testid}>
      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cae === 'ANTES_DEL_INICIO' ? 'bg-warning' : 'bg-info'}`} aria-hidden="true" />
      <span>{frase}</span>
    </p>
  );
}

/** Los cobros del propietario que trae la factura, con su valor y la regla. */
export function LoDelPropietario({ factura }: { factura: FacturaDeServicio }) {
  const conceptos = conceptosDelPropietarioDe(factura);
  if (conceptos.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md bg-surface-muted px-3 py-2.5" data-testid={`propietario-${factura.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-label text-fg-subtle">Del propietario</p>
        <p className="font-mono text-body-sm tabular-nums text-fg">{formatCurrency(totalDelPropietario(conceptos))}</p>
      </div>
      <ul className="space-y-1">
        {conceptos.map((c, i) => (
          <li key={`${c.tipo}-${i}`} className="flex items-baseline justify-between gap-3 text-caption">
            <span className="min-w-0 text-fg-muted">
              <span className="text-fg">{NOMBRE_DEL_CONCEPTO_DEL_PROPIETARIO[c.tipo]}</span>
              {c.concepto && c.concepto !== NOMBRE_DEL_CONCEPTO_DEL_PROPIETARIO[c.tipo] ? ` · ${c.concepto}` : ''}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-fg">{formatCurrency(c.valorCop)}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-fg-muted">{FRASE_DEL_PROPIETARIO}</p>
    </div>
  );
}

/** Lo que Servi leyó y propuso. Las propuestas se deciden en la Bandeja del Piloto. */
export function ServiEnLaFactura({ factura }: { factura: FacturaDeServicio }) {
  const r = revisionDeServiDe(factura);
  if (!r) return null;
  const porDecidir = estadoDeServi(factura) === 'POR_DECIDIR';
  const l = r.leido;
  const leido = l
    ? [
        l.empresa,
        l.numeroDeCuenta ? `cuenta ${l.numeroDeCuenta}` : null,
        l.periodoDesde && l.periodoHasta ? `corte del ${diaCorto(l.periodoDesde)} al ${diaCorto(l.periodoHasta)}` : null,
        l.mesFacturado ? `facturada en ${nombreDelMesCorto(l.mesFacturado, true)}` : null,
        l.fechaDeEmision ? `emitida el ${diaCorto(l.fechaDeEmision, true)}` : null,
        l.valorCop !== null ? formatCurrency(l.valorCop) : null,
        l.pagada === true ? 'pagada' : l.pagada === false ? 'sin señal de pago' : null,
      ].filter((x): x is string => !!x)
    : [];
  return (
    <div className="space-y-2 rounded-md border border-border-faint px-3 py-2.5" data-testid={`servi-${factura.id}`}>
      <div className="flex items-center gap-2">
        <OrbeDeAgente agente="servicios" tamano={18} quieto decorativo />
        <p className="text-body-sm text-fg">
          Servi la revisó{r.veredicto === 'CUADRA' ? ': cuadra' : r.veredicto === 'NO_CUADRA' ? ': no cuadra' : ''}
        </p>
      </div>
      {r.motivos.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-caption text-fg-muted">
          {r.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      {r.propuestas.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-caption text-fg-muted">{porDecidir ? 'Propone, y lo decides en la Bandeja del Piloto:' : 'Propuso:'}</p>
          <ul className="space-y-1">
            {r.propuestas.map((p) => (
              <li key={p.clave || p.resumen} className="flex items-baseline justify-between gap-3 text-caption">
                <span className="min-w-0 text-fg">{p.resumen}</span>
                {p.montoCop !== null && <span className="shrink-0 font-mono tabular-nums text-fg">{formatCurrency(p.montoCop)}</span>}
              </li>
            ))}
          </ul>
          {porDecidir && (
            <Button asChild size="sm" variant="outline" hideArrow>
              <Link href={RUTA_DE_LA_BANDEJA} data-testid={`bandeja-${factura.id}`}>
                Decidir en la Bandeja del Piloto
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      )}
      {leido.length > 0 && (
        <MasDetalles etiqueta="Ver lo que leyó" etiquetaAbierto="Ocultar lo que leyó">
          <p className="pt-1 text-caption text-fg-muted" data-testid={`servi-leido-${factura.id}`}>
            {leido.join(' · ')}
          </p>
        </MasDetalles>
      )}
    </div>
  );
}

interface Props {
  factura: FacturaDeServicio;
  /** El inicio del contrato (`AAAA-MM-DD`), para decir cómo cae un corte con un back anterior. */
  inicio?: string | null;
  puedeEditar: boolean;
  guardando: boolean;
  onVerSoporte: () => void;
  onAprobar: () => void;
  onRechazar: (motivo: string) => Promise<boolean>;
  onPagarConLaGarantia: () => void;
  /** Abre la liquidación de entrada (anterior vs nuevo) de esta factura. */
  onPartirPorDias: () => void;
}

/** La factura en la lista del cajón: qué es, su corte, lo del propietario, Servi y lo que se puede hacer. */
export function FacturaDelContrato({ factura: f, inicio, puedeEditar, guardando, onVerSoporte, onAprobar, onRechazar, onPagarConLaGarantia, onPartirPorDias }: Props) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const cae = comoCaeDe(f, inicio);
  const sePartePorDias = f.tipo === 'ENTRADA' || (f.tipo === 'MENSUAL' && cae === 'CRUZA_EL_INICIO');
  return (
    <li className="space-y-3 p-4 text-body-sm" data-testid={`factura-${f.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-fg">
            {f.nombreDelServicio} · {TIPO[f.tipo]}
            {f.empresa ? ` · ${f.empresa}` : ''}
          </p>
          <CorteDeLaFactura factura={f} />
          <p className="text-caption text-fg-muted">
            <span className="font-mono tabular-nums text-fg">{formatCurrency(f.valorCop)}</span> ·{' '}
            {f.subidaPor === 'INQUILINO' ? 'la subió el inquilino' : 'la registró la inmobiliaria'}
          </p>
        </div>
        <StatusBadge tone={ESTADO_DE_LA_FACTURA[f.estado].tono}>{ESTADO_DE_LA_FACTURA[f.estado].rotulo}</StatusBadge>
      </div>
      <ComoCaeLaFactura cae={cae} testid={`cae-${f.id}`} />
      {typeof f.liquidacion?.frase === 'string' && <p className="text-caption text-fg-muted">{f.liquidacion.frase}</p>}
      {f.motivoDeLaRevision && <p className="text-caption text-danger">Motivo: {f.motivoDeLaRevision}</p>}
      <LoDelPropietario factura={f} />
      <ServiEnLaFactura factura={f} />
      <div className="flex flex-wrap gap-2">
        {f.tieneSoporte && (
          <Button size="sm" variant="ghost" hideArrow onClick={onVerSoporte}>
            Ver la factura
          </Button>
        )}
        {sePartePorDias && (
          <Button size="sm" variant="ghost" hideArrow onClick={onPartirPorDias} data-testid={`partir-${f.id}`}>
            Ver la liquidación de entrada
          </Button>
        )}
        {puedeEditar && f.estado === 'POR_REVISAR' && (
          <>
            {/* Decidir (aprobar) va en tinta: el azul del cajón es «Guardar la factura». */}
            <Button size="sm" variant="ink" hideArrow disabled={guardando} onClick={onAprobar} data-testid={`aprobar-${f.id}`}>
              Aprobar
            </Button>
            <Button size="sm" variant="outline" hideArrow onClick={() => setRechazando(true)} data-testid={`rechazar-${f.id}`}>
              Rechazar
            </Button>
          </>
        )}
        {puedeEditar && f.estado === 'PENDIENTE' && f.tipo === 'SALIDA' && (
          <Button size="sm" variant="ink" hideArrow disabled={guardando} onClick={onPagarConLaGarantia}>
            Pagar con la garantía
          </Button>
        )}
      </div>
      <Presence show={rechazando} distance="xs">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Por qué se rechaza (lo ve el inquilino)"
            value={motivo}
            maxLength={500}
            onChange={(x) => setMotivo(x.target.value)}
            aria-label="Motivo del rechazo"
          />
          <Button
            size="sm"
            variant="outline"
            hideArrow
            disabled={motivo.trim().length < 5 || guardando}
            onClick={async () => {
              if (await onRechazar(motivo.trim())) {
                setRechazando(false);
                setMotivo('');
              }
            }}
          >
            Rechazar la factura
          </Button>
        </div>
      </Presence>
    </li>
  );
}
