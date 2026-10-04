'use client';

/**
 * 🔴 CB-39 (QA-CONTA-PROF, 04-10-2026; Nico «sí, dale», ola 3): LA
 * CONCILIACIÓN DE LA CARTERA. El saldo de «Clientes» (1305) del libro contra lo
 * que de verdad deben los inquilinos según las cuotas de sus contratos.
 *
 * Arriba, las tres cifras (libro, cuotas, diferencia) y cuánto de la
 * diferencia nadie sabe explicar. Abajo, contrato por contrato lo que no
 * cuadra con su motivo, y aparte lo del libro que no lleva a ningún contrato.
 * Los motivos los dice el back (`cartera-libro-vs-cuotas.ts`); lo que no se
 * sabe dice «sin explicar», nunca un porqué adivinado.
 *
 * Sólo administrador y contador (la guarda de lectura de la contabilidad).
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';

import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import {
  contabilidadApi,
  type CarteraDelContrato,
  type CarteraLibroVsCuotas as Conciliacion,
} from '@/lib/api/contabilidad.service';
import { hoy } from '@/lib/contabilidad/fechas';
import { nombreDelMes } from '@/lib/recaudo/meses';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { FranjaDeInforme, TarjetaDeInforme } from '../piezas';
import { Monto } from '../Monto';
import { CampoDeDia } from '../CampoDeDia';

const ETIQUETA_DEL_MOTIVO = {
  SIN_CAUSAR: 'Sin causar',
  YA_NO_SE_DEBE: 'Ya no se debe',
  SIN_EXPLICAR: 'Sin explicar',
} as const;

function nombreDelContrato(c: CarteraDelContrato): string {
  const partes = [
    c.codigo ? `Contrato #${c.codigo}` : 'Contrato sin número',
    c.inquilino ?? null,
  ].filter(Boolean);
  return partes.join(' · ');
}

function Motivos({ contrato }: { contrato: CarteraDelContrato }) {
  if (contrato.motivos.length === 0)
    return <span className="text-caption text-fg-subtle">Cuadra</span>;
  return (
    <ul className="space-y-1" data-testid="motivos-de-la-diferencia">
      {contrato.motivos.map((m, i) => (
        <li key={`${m.tipo}-${m.mes ?? i}`} className="text-caption leading-snug">
          <span
            className={cn(
              'mr-1.5 font-medium',
              m.tipo === 'SIN_EXPLICAR' ? 'text-danger' : 'text-fg',
            )}
          >
            {ETIQUETA_DEL_MOTIVO[m.tipo]}
            {m.mes ? ` · ${nombreDelMes(m.mes)}` : ''}
          </span>
          <span className="text-fg-muted">{m.texto}</span>{' '}
          <Monto valor={m.valorCop} className="text-caption" />
        </li>
      ))}
    </ul>
  );
}

// ── La tabla, pura ──────────────────────────────────────────────────────────

export function TablaDeCartera({
  conciliacion,
  soloLasQueNoCuadran,
}: {
  conciliacion: Conciliacion;
  soloLasQueNoCuadran: boolean;
}) {
  const esCelular = useIsMobile();
  const filas = useMemo(
    () =>
      soloLasQueNoCuadran
        ? conciliacion.contratos.filter((c) => c.diferenciaCop !== 0)
        : conciliacion.contratos,
    [conciliacion.contratos, soloLasQueNoCuadran],
  );
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, {
      resetKey: `${conciliacion.hasta}|${filas.length}|${soloLasQueNoCuadran}`,
    });
  const cuadra = conciliacion.diferenciaCop === 0;

  return (
    <div className="space-y-4" data-testid="conciliacion-de-cartera">
      <FranjaDeInforme
        tono={cuadra ? 'bien' : conciliacion.sinExplicarCop === 0 ? 'neutro' : 'mal'}
        papel={cuadra ? 'status' : 'alert'}
        testId="veredicto-de-la-cartera"
        className="rounded-md border border-border"
      >
        {cuadra ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />
        ) : (
          <WarningCircle className="h-5 w-5 flex-shrink-0 text-warning" aria-hidden="true" />
        )}
        <div className="space-y-1 text-sm">
          {cuadra ? (
            <p className="font-medium text-success">
              Cuadra: la cartera del libro es lo que deben los inquilinos.
            </p>
          ) : (
            <p className="font-medium text-fg">
              El libro tiene <Monto valor={conciliacion.mayorCop} /> en cartera y las cuotas dicen{' '}
              <Monto valor={conciliacion.cuotasCop} />: una diferencia de{' '}
              <Monto valor={conciliacion.diferenciaCop} />.
            </p>
          )}
          {!cuadra ? (
            <p className="text-fg-muted" data-testid="sin-explicar-de-la-cartera">
              {conciliacion.sinExplicarCop === 0 ? (
                'Toda la diferencia tiene su motivo abajo.'
              ) : (
                <>
                  Sin explicar: <Monto valor={Math.abs(conciliacion.sinExplicarCop)} />. Lo demás tiene su
                  motivo abajo.
                </>
              )}
            </p>
          ) : null}
        </div>
      </FranjaDeInforme>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="cifras-de-la-cartera">
        {[
          ['Cartera en el libro (1305)', conciliacion.mayorCop],
          ['Lo que deben según las cuotas', conciliacion.cuotasCop],
          ['Diferencia', conciliacion.diferenciaCop],
        ].map(([rotulo, valor]) => (
          <div key={rotulo as string} className="rounded-md border border-border bg-surface px-4 py-3">
            <dt className="text-caption text-fg-muted">{rotulo}</dt>
            <dd className="mt-1 text-lg">
              <Monto valor={valor as number} />
            </dd>
          </div>
        ))}
      </dl>

      {conciliacion.sinContrato.length > 0 ? (
        <section className="space-y-2" data-testid="cartera-sin-contrato">
          <h3 className="text-sm font-medium text-fg">Lo del libro que no lleva a ningún contrato</h3>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {conciliacion.sinContrato.map((g) => (
              <li key={g.tipo} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="min-w-0 text-sm text-fg">
                  {g.explicado ? g.texto : <span className="text-danger">{g.texto}</span>}{' '}
                  <span className="text-caption text-fg-subtle">
                    ({g.documentos} {g.documentos === 1 ? 'documento' : 'documentos'})
                  </span>
                </span>
                <Monto valor={g.valorCop} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-fg">Por contrato</h3>
        <div className="overflow-x-clip rounded-lg border border-border bg-surface">
          {filas.length === 0 ? (
            <p className="px-4 py-6 text-sm text-fg-muted" data-testid="cartera-sin-diferencias">
              {soloLasQueNoCuadran
                ? 'Ningún contrato tiene diferencia entre el libro y sus cuotas.'
                : 'No hay contratos con cartera en el libro ni cuotas por cobrar hasta esta fecha.'}
            </p>
          ) : esCelular ? (
            <ul className="divide-y divide-border" data-testid="tarjetas-de-cartera">
              {pageItems.map((c) => (
                <li key={c.contractId} className="space-y-2 px-4 py-3" data-testid="tarjeta-de-cartera">
                  <p className="text-sm font-medium text-fg">{nombreDelContrato(c)}</p>
                  {c.inmueble ? <p className="text-caption text-fg-muted">{c.inmueble}</p> : null}
                  {/* Una cifra por renglón: a 390 px tres de nueve dígitos no
                      caben lado a lado y se montaban. */}
                  <dl className="space-y-1 text-caption">
                    {(
                      [
                        ['Libro (1305)', c.libroCop],
                        ['Cuotas', c.cuotasCop],
                        ['Diferencia', c.diferenciaCop],
                      ] as const
                    ).map(([rotulo, valor]) => (
                      <div key={rotulo} className="flex items-baseline justify-between gap-3">
                        <dt className="text-fg-muted">{rotulo}</dt>
                        <dd><Monto valor={valor} /></dd>
                      </div>
                    ))}
                  </dl>
                  <Motivos contrato={c} />
                </li>
              ))}
            </ul>
          ) : (
            <Table data-testid="tabla-de-cartera">
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead numeric>Libro (1305)</TableHead>
                  <TableHead numeric>Cuotas</TableHead>
                  <TableHead numeric>Diferencia</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((c) => (
                  <TableRow key={c.contractId} data-testid="fila-de-cartera">
                    <TableCell className="max-w-[16rem] align-top">
                      <p className="break-words text-sm text-fg">{nombreDelContrato(c)}</p>
                      {c.inmueble ? (
                        <p className="break-words text-caption text-fg-muted">{c.inmueble}</p>
                      ) : null}
                    </TableCell>
                    <TableCell numeric className="align-top"><Monto valor={c.libroCop} /></TableCell>
                    <TableCell numeric className="align-top"><Monto valor={c.cuotasCop} /></TableCell>
                    <TableCell numeric className="align-top"><Monto valor={c.diferenciaCop} /></TableCell>
                    <TableCell className="min-w-[18rem] align-top">
                      <Motivos contrato={c} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {shouldPaginate ? (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ── La pantalla, con red ────────────────────────────────────────────────────

export function CarteraLibroVsCuotas() {
  const id = useId();
  const [hasta, setHasta] = useState(hoy());
  const [soloLasQueNoCuadran, setSoloLasQueNoCuadran] = useState(true);
  const [conciliacion, setConciliacion] = useState<Conciliacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setConciliacion(await contabilidadApi.reportes.carteraVsCuotas(hasta || undefined));
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <TarjetaDeInforme
      testId="informe-cartera-vs-cuotas"
      filtros={
        <>
          <div className="w-full max-w-[14rem] space-y-1.5">
            <Label htmlFor={`${id}-hasta`}>Hasta el día</Label>
            <CampoDeDia
              id={`${id}-hasta`}
              value={hasta}
              onChange={setHasta}
              placeholder="Hoy"
              testid="cartera-hasta"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id={`${id}-solo`}
              checked={soloLasQueNoCuadran}
              onCheckedChange={(v) => setSoloLasQueNoCuadran(v === true)}
            />
            <Label htmlFor={`${id}-solo`} className="font-normal">
              Sólo los contratos que no cuadran
            </Label>
          </div>
        </>
      }
    >
      <EstadoDeDatos
        cargando={cargando && conciliacion === null}
        error={error}
        vacio={false}
        queEs="la conciliación de la cartera"
        onReintentar={cargar}
        esqueleto={
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        }
      >
        {conciliacion ? (
          <div className={cn('p-4', cargando && 'opacity-60')} aria-busy={cargando || undefined}>
            <TablaDeCartera conciliacion={conciliacion} soloLasQueNoCuadran={soloLasQueNoCuadran} />
          </div>
        ) : null}
      </EstadoDeDatos>
    </TarjetaDeInforme>
  );
}
