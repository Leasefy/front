'use client';

/**
 * El historial de «Aprobar reparaciones» en una tabla con paginación (Nico,
 * 12-10-2026: «ese historial puede ser muy grande, porque mejor no metemos
 * una tabla ahí con paginación?»). Pagina el back: cada página trae sólo sus
 * filas. Cada fila abre el detalle completo en un cajón. En el celular son
 * tarjetas, como Inquilinos y Facturación de la inmobiliaria: la tabla se
 * corría a los lados y escondía el estado y el valor.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/format';
import { diaEnColombia, fechaCorta } from '@/lib/fechas/fecha-de-la-casa';
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type { AprobacionEnElPortal, PaginaDelHistorialDeAprobaciones } from '@/lib/types/deducciones';
import { DetalleDeLaReparacion, ESTADO_CORTO } from './DetalleDeLaReparacion';

function fechaDeLaFila(a: AprobacionEnElPortal): string {
  return fechaCorta(diaEnColombia(a.decididaAt ?? a.anuladaAt ?? a.pedidaAt));
}

function Estado({ a }: { a: AprobacionEnElPortal }) {
  const estado = ESTADO_CORTO[a.estado];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-caption font-medium ${estado.tono}`}>
      {estado.texto}
    </span>
  );
}

/** `recarga` cambia cuando la página decide algo: el historial vuelve a pedirse. */
export function HistorialDeReparaciones({ recarga }: { recarga: number }) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(PAGE_SIZE_OPTIONS[0]);
  const [datos, setDatos] = useState<PaginaDelHistorialDeAprobaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<unknown>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const esCelular = useIsMobile();

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await aprobacionesDeReparacionApi.historialDelPortal(pagina, porPagina));
    } catch (e) {
      setFallo(e);
    } finally {
      setCargando(false);
    }
  }, [pagina, porPagina]);

  useEffect(() => {
    void cargar();
  }, [cargar, recarga]);

  // Sin nada decidido no hay historial que mostrar (el vacío lo dice la página).
  if (!cargando && !fallo && datos && datos.total === 0) return null;

  return (
    <section className="space-y-3" aria-label="Historial" data-testid="historial-de-reparaciones">
      <h2 className="text-sm font-semibold text-fg">Historial</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <EstadoDeDatos
          cargando={cargando && !datos}
          error={fallo}
          queEs="tu historial de reparaciones"
          onReintentar={cargar}
        >
          {esCelular ? (
            <ul className="divide-y divide-border-faint" data-testid="historial-en-tarjetas">
              {(datos?.filas ?? []).map((a) => (
                <li key={a.id}>
                  {/* allowlist: tarjeta de la lista que abre el cajón — fila completa tocable, no un botón de acción. */}
                  <button
                    type="button"
                    onClick={() => setAbierta(a.id)}
                    className="w-full space-y-2 px-4 py-3 text-left focus-visible:bg-surface-muted focus-visible:outline-none"
                    aria-label={`Ver el detalle de ${a.reparacion.titulo}`}
                    data-testid={`aprobacion-historial-${a.estado}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-fg">{a.reparacion.titulo}</p>
                        <p className="text-caption text-fg-muted">{a.inmueble}</p>
                      </div>
                      <p className="shrink-0 font-mono tabular-nums text-fg">{formatCurrency(a.valorCop)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
                      <Estado a={a} />
                      <span>{fechaDeLaFila(a)}</span>
                    </div>
                    {a.descontadoCop != null && (
                      <p className="text-caption text-fg-muted">Por el costo final se descuentan {formatCurrency(a.descontadoCop)}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reparación</TableHead>
                  <TableHead className="whitespace-nowrap">Estado</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBodyAnimado>
                {(datos?.filas ?? []).map((a) => {
                  const abrir = () => setAbierta(a.id);
                  return (
                    <TableRowAnimada
                      key={a.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      aria-label={`Ver el detalle de ${a.reparacion.titulo}`}
                      onClick={abrir}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          abrir();
                        }
                      }}
                      data-testid={`aprobacion-historial-${a.estado}`}
                    >
                      <TableCell className="max-w-[420px]">
                        <p className="truncate font-medium text-fg">{a.reparacion.titulo}</p>
                        <p className="truncate text-caption text-fg-muted">{a.inmueble}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Estado a={a} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">{fechaDeLaFila(a)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <p className="font-mono tabular-nums text-fg">{formatCurrency(a.valorCop)}</p>
                        {/* QA 11-10: aprobaste un valor y el costo final descontó otro: se dice. */}
                        {a.descontadoCop != null && (
                          <p className="text-caption text-fg-muted" data-testid="aprobacion-descontado">
                            Se descuentan {formatCurrency(a.descontadoCop)}
                          </p>
                        )}
                      </TableCell>
                    </TableRowAnimada>
                  );
                })}
              </TableBodyAnimado>
            </Table>
          )}
          {datos && datos.total > PAGE_SIZE_OPTIONS[0] && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={datos.total}
                page={pagina}
                pageSize={porPagina}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPagina}
                onPageSizeChange={(tam) => {
                  setPorPagina(tam);
                  setPagina(1);
                }}
              />
            </div>
          )}
        </EstadoDeDatos>
      </div>
      <DetalleDeLaReparacion id={abierta} onCerrar={() => setAbierta(null)} />
    </section>
  );
}
