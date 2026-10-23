'use client';

/**
 * UN PERÍODO CON TODOS SUS DESPRENDIBLES.
 *
 * ── 🔴 Lo marcado va ARRIBA, antes del botón de aprobar ─────────────────────
 *
 * Las liquidaciones que un contador tiene que validar se cuentan y se nombran en
 * el encabezado. La alternativa —un iconito por fila— hace que quien aprueba
 * treinta desprendibles no vea los dos que importaban, y aprobar es lo que
 * congela las líneas y escribe las provisiones.
 *
 * ── Y el neto NO se vuelve a sumar ─────────────────────────────────────────
 *
 * El total del período viene del back (`totalNetoCop`), no de sumar la tabla. Dos
 * sumas del mismo número son dos oportunidades de que no coincidan.
 */

import Link from 'next/link';
import { useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { nominaApi } from '@/lib/api/nomina.service';
import type { PeriodoConLiquidaciones } from '@/lib/api/nomina.types';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { Cifra, FranjaDeCifras } from '@leasefy/cadence';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import {
  Avisos,
  EstadoDelPeriodo,
  etiquetaDelPeriodo,
} from './piezas';
import { Cargado, useCargaDeNomina } from './usar-nomina';

const PANEL = '/panel/inmobiliaria/nomina';

export function PeriodoDeNominaDetalle({ periodoId }: { periodoId: string }) {
  const estado = useCargaDeNomina<PeriodoConLiquidaciones>(
    () => nominaApi.periodo(periodoId),
    [periodoId],
  );

  return (
    <Cargado
      estado={estado}
      queEs="el período de nómina"
      queSeEspera="ver el período de nómina"
    >
      {(datos) => <Contenido datos={datos} />}
    </Cargado>
  );
}

function Contenido({ datos }: { datos: PeriodoConLiquidaciones }) {
  const marcadas = useMemo(
    () => datos.liquidaciones.filter((l) => l.requiereValidacionContador),
    [datos.liquidaciones],
  );

  const avisos = useMemo(() => {
    const todos = new Set<string>();
    for (const l of datos.liquidaciones) {
      for (const a of l.avisos ?? []) todos.add(a);
    }
    return [...todos];
  }, [datos.liquidaciones]);

  return (
    <div className="space-y-6">
      {/* GLOW UP 3.ª vuelta · LA RESPUESTA: lo que se les gira a las personas del período, con
          su estado al lado. Antes eran una tarjeta con el período y cuatro cifras del mismo peso. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CifraHeroe
          rotulo={`Neto a girar · ${etiquetaDelPeriodo(datos.mes, datos.quincena)}`}
          cifra={<span data-testid="valor-neto">{formatCurrency(datos.totalNetoCop)}</span>}
          contexto={`a ${datos.personas} ${datos.personas === 1 ? 'persona' : 'personas'}, del ${fechaCorta(datos.desde.slice(0, 10))} al ${fechaCorta(datos.hasta.slice(0, 10))}`}
          pie={
            <>
              {datos.asientoId ? 'Asentado en contabilidad' : 'Todavía sin asiento'}
              {datos.loteDeEgresosId
                ? ' · pagado con lote de egresos'
                : datos.pagadoAt
                  ? ' · pagado por fuera de Leasefy'
                  : ''}
              .
              {datos.motivoAnulacion ? (
                <span className="block text-danger" data-testid="motivo-de-anulacion">
                  Anulado: {datos.motivoAnulacion}
                </span>
              ) : null}
            </>
          }
          className="min-w-0 flex-1"
          data-testid="cifra-del-periodo"
        />
        <EstadoDelPeriodo estado={datos.estado} />
      </div>

      <FranjaDeCifras aria-label="De dónde sale el neto">
        <Cifra etiqueta="Devengado" valor={formatCurrency(datos.totalDevengadoCop)} detalle="Todo lo reconocido en el período" data-testid="cifra-devengado" />
        <Cifra etiqueta="Deducciones" valor={formatCurrency(datos.totalDeduccionesCop)} detalle="Aportes del empleado, retención y descuentos" data-testid="cifra-deducciones" />
        <Cifra etiqueta="Aportes del empleador" valor={formatCurrency(datos.totalAportesCop)} detalle="A cargo de la inmobiliaria, no se descuentan" data-testid="cifra-aportes" />
      </FranjaDeCifras>

      {marcadas.length > 0 ? (
        <Avisos
          avisos={marcadas.map(
            (l) =>
              `${l.nombre}: ${l.lineas
                .filter((x) => x.requiereValidacionContador)
                .map((x) => x.nombre)
                .join(', ')}.`,
          )}
          titulo={`${marcadas.length} de ${datos.liquidaciones.length} liquidacion${marcadas.length === 1 ? '' : 'es'} tiene${marcadas.length === 1 ? '' : 'n'} renglones que un contador debe validar`}
          testId="liquidaciones-marcadas"
        />
      ) : null}

      {avisos.length > 0 ? (
        <Avisos
          avisos={avisos}
          titulo="Lo que este período dejó anotado"
          tono="info"
          testId="avisos-del-periodo"
        />
      ) : null}

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">Los desprendibles</h2>
          <p className="text-body-sm text-fg-muted">Uno por persona: ábrelo para ver cada renglón con su base y su norma.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Table data-testid="tabla-de-liquidaciones" className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Devengado</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">IBC</TableHead>
                <TableHead className="text-right">Retención</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {datos.liquidaciones.map((l) => (
                <TableRow
                  key={l.id}
                  data-testid={`liquidacion-${l.id}`}
                  className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-1 max-md:border-b max-md:border-border max-md:px-4 max-md:py-3.5 max-md:last:border-0"
                >
                  <TableCell className="max-md:col-start-1 max-md:row-start-1 max-md:block max-md:p-0">
                    <Link
                      className="font-medium text-fg underline-offset-4 hover:underline"
                      href={`${PANEL}/desprendible/${l.id}`}
                    >
                      {l.nombre}
                    </Link>
                    {l.requiereValidacionContador ? (
                      <span
                        className="ml-1.5 text-caption text-warning"
                        data-testid={`marcada-${l.id}`}
                      >
                        · revisar
                      </span>
                    ) : null}
                    {l.esDefinitiva ? (
                      <span className="ml-1.5 text-caption text-warning">
                        · liquidación definitiva
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums max-md:col-start-1 max-md:row-start-2 max-md:block max-md:p-0 max-md:text-left max-md:text-caption max-md:text-fg-muted">
                    {l.diasLiquidados}
                    <span className="md:hidden"> días · devengado {formatCurrency(l.devengadoCop)}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                    {formatCurrency(l.devengadoCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                    {formatCurrency(l.deduccionesCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-fg max-md:col-start-2 max-md:row-start-1 max-md:block max-md:p-0">
                    {formatCurrency(l.netoCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                    {formatCurrency(l.ibcCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums max-md:hidden">
                    {formatCurrency(l.retencionCop)}
                  </TableCell>
                  <TableCell className="text-right max-md:col-start-2 max-md:row-start-2 max-md:block max-md:p-0">
                    <Link
                      className="text-caption text-primary underline-offset-4 hover:underline"
                      href={`${PANEL}/desprendible/${l.id}`}
                    >
                      Ver desprendible
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
