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
import {
  Avisos,
  Cifra,
  EstadoDelPeriodo,
  TituloDeBloque,
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
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-5">
        <div>
          <h2 className="text-base font-semibold text-fg">
            {etiquetaDelPeriodo(datos.mes, datos.quincena)}
          </h2>
          <p className="text-xs text-fg-muted">
            {datos.desde.slice(0, 10)} al {datos.hasta.slice(0, 10)} ·{' '}
            {datos.personas} persona{datos.personas === 1 ? '' : 's'}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {datos.asientoId ? 'Asentado en contabilidad' : 'Todavía sin asiento'}
            {datos.loteDeEgresosId
              ? ' · pagado con lote de egresos'
              : datos.pagadoAt
                ? ' · pagado por fuera de Leasefy'
                : ''}
          </p>
          {datos.motivoAnulacion ? (
            <p className="mt-1 text-xs text-danger" data-testid="motivo-de-anulacion">
              Anulado: {datos.motivoAnulacion}
            </p>
          ) : null}
        </div>
        <EstadoDelPeriodo estado={datos.estado} />
      </header>

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra
          id="devengado"
          etiqueta="Devengado"
          valor={datos.totalDevengadoCop}
          definicion="Todo lo reconocido a las personas del período."
        />
        <Cifra
          id="deducciones"
          etiqueta="Deducciones"
          valor={datos.totalDeduccionesCop}
          definicion="Aportes del empleado, retención y descuentos autorizados."
        />
        <Cifra
          id="neto"
          etiqueta="Neto a girar"
          valor={datos.totalNetoCop}
          definicion="Lo que se les paga. Viene del back: esta pantalla no vuelve a sumar la tabla."
          tono="success"
        />
        <Cifra
          id="aportes"
          etiqueta="Aportes del empleador"
          valor={datos.totalAportesCop}
          definicion="Salud, pensión, ARL, caja, SENA e ICBF a cargo de la inmobiliaria. No se le descuentan a nadie."
        />
      </div>

      <section className="space-y-3">
        <TituloDeBloque
          titulo="Los desprendibles"
          explicacion="Uno por persona. Abre cualquiera para ver cada renglón con su base y su norma."
        />
        <div className="overflow-x-auto">
          <Table data-testid="tabla-de-liquidaciones">
            <TableHeader>
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
            <TableBody>
              {datos.liquidaciones.map((l) => (
                <TableRow key={l.id} data-testid={`liquidacion-${l.id}`}>
                  <TableCell>
                    <Link
                      className="font-medium text-brand underline"
                      href={`${PANEL}/desprendible/${l.id}`}
                    >
                      {l.nombre}
                    </Link>
                    {l.requiereValidacionContador ? (
                      <span
                        className="ml-1.5 text-xs text-warning"
                        data-testid={`marcada-${l.id}`}
                      >
                        · revisar
                      </span>
                    ) : null}
                    {l.esDefinitiva ? (
                      <span className="ml-1.5 text-xs text-warning">
                        · liquidación definitiva
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.diasLiquidados}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(l.devengadoCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(l.deduccionesCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium tabular-nums">
                    {formatCurrency(l.netoCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(l.ibcCop)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(l.retencionCop)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      className="text-xs text-brand underline"
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
