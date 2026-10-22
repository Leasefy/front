'use client';

/**
 * Lo que está en manos del PROPIETARIO, en la página de Mantenimiento.
 *
 * 🔴 D12 (17-09-2026): la reparación a cargo del propietario la aprueba él; si
 * la rechaza, «la inmobiliaria lo ve y decide qué sigue»: esto es donde lo ve.
 *
 * Nico, 22-10-2026, con la captura de la lista de antes: «esto debe ser más
 * amigable porque pueden llegar a ser muchos». Antes eran hasta 200 filas
 * seguidas, sin buscar ni paginar, y las rechazadas se quedaban para siempre.
 * Ahora:
 *   · tres pestañas con su cuenta — Esperando (arriba la que más lleva
 *     esperando), Rechazadas (sólo las que falta decidir) y La hace él
 *     (Portofino, 22-10: la arregla el propietario por su cuenta);
 *   · un buscador (reparación, inmueble o propietario, sin tildes);
 *   · páginas que pide el back: con mil, la pantalla trae diez.
 * Tocar una fila abre la solicitud. Sin la migración de las aprobaciones el
 * back responde 503 y la sección no se dibuja: no hay nada que esperar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CaretRight, Hourglass, MagnifyingGlass, User, Wrench, XCircle } from '@phosphor-icons/react';

import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { diasDeCalendarioDesde } from '@/lib/fechas/dias-de-calendario';
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { aprobacionesDeReparacionApi } from '@/lib/api/aprobaciones-de-reparacion.service';
import type {
  BandejaConElPropietario,
  FilaConElPropietario,
  GrupoConElPropietario,
} from '@/lib/types/deducciones';

const PESTANAS: { grupo: GrupoConElPropietario; nombre: string; corto: string }[] = [
  { grupo: 'ESPERANDO', nombre: 'Esperando su respuesta', corto: 'Esperando' },
  { grupo: 'RECHAZADAS', nombre: 'Rechazadas por decidir', corto: 'Rechazadas' },
  { grupo: 'LA_HACE_EL', nombre: 'La hace él', corto: 'La hace él' },
];

const VACIO: Record<GrupoConElPropietario, string> = {
  ESPERANDO: 'Nada espera la respuesta de un propietario.',
  RECHAZADAS: 'No hay reparaciones rechazadas por decidir.',
  LA_HACE_EL: 'Ningún propietario está haciendo una reparación por su cuenta.',
};

const PRIORIDAD: Record<string, { nombre: string; tono: string } | undefined> = {
  EMERGENCY: { nombre: 'Emergencia', tono: 'bg-danger-soft text-danger' },
  HIGH: { nombre: 'Alta', tono: 'bg-warning-soft text-warning' },
};

/** «Hoy», «Ayer», «Hace 5 días». */
function haceCuanto(iso: string): string {
  const d = diasDeCalendarioDesde(iso);
  return d <= 0 ? 'Hoy' : d === 1 ? 'Ayer' : `Hace ${d} días`;
}

/** Lo que lleva la columna «Desde», dicho según el grupo. */
function desdeCuando(f: FilaConElPropietario): string {
  const cuando = haceCuanto(f.desde).toLowerCase();
  if (f.grupo === 'ESPERANDO') return `Se le pidió ${cuando}`;
  if (f.grupo === 'RECHAZADAS') return `La rechazó ${cuando}`;
  return `La tomó ${cuando}`;
}

function plazoVencido(f: FilaConElPropietario): boolean {
  return Boolean(f.venceAt && new Date(f.venceAt).getTime() < Date.now());
}

function Senales({ f }: { f: FilaConElPropietario }) {
  const p = PRIORIDAD[f.prioridad];
  return (
    <>
      {p && (
        <span className={cn('inline-flex rounded px-1.5 py-0.5 text-caption font-medium', p.tono)}>{p.nombre}</span>
      )}
      {plazoVencido(f) && (
        <span className="inline-flex rounded px-1.5 py-0.5 text-caption font-medium bg-danger-soft text-danger">
          Plazo vencido
        </span>
      )}
    </>
  );
}

/** El valor, o lo que va en su lugar cuando la hace él (no hay cotización). */
function Valor({ f }: { f: FilaConElPropietario }) {
  if (f.valorCop === null) return <span className="text-fg-muted">Sin descuento</span>;
  return <span className="font-mono tabular-nums text-fg">{formatCurrency(f.valorCop)}</span>;
}

/** La segunda línea: el motivo del rechazo o la nota de quién la hace. */
function Detalle({ f }: { f: FilaConElPropietario }) {
  if (f.grupo === 'RECHAZADAS' && f.motivoDeRechazo) {
    return <span className="text-danger">«{f.motivoDeRechazo}»</span>;
  }
  if (f.grupo === 'LA_HACE_EL') {
    const quien = f.loDecidio === 'INMOBILIARIA' ? 'Se la dejaron' : 'Dijo «La hago yo»';
    return (
      <span>
        {quien}
        {f.nota ? ` · «${f.nota}»` : ''}
      </span>
    );
  }
  return null;
}

export function BandejaDeAprobacionesDelPropietario({
  version = 0,
  onAbrir,
}: {
  /** Sube cuando algo cambió (una aprobación, un rechazo): la bandeja se relee. */
  version?: number;
  onAbrir?: (solicitudId: string) => void;
}) {
  const esCelular = useIsMobile();
  const [grupo, setGrupo] = useState<GrupoConElPropietario | null>(null);
  const [texto, setTexto] = useState('');
  const [buscado, setBuscado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(PAGE_SIZE_OPTIONS[0]);
  const [datos, setDatos] = useState<BandejaConElPropietario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const pedido = useRef(0);

  // El buscador espera a que la persona deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscado(texto.trim());
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [texto]);

  const cargar = useCallback(async () => {
    const este = ++pedido.current;
    setCargando(true);
    try {
      const r = await aprobacionesDeReparacionApi.conElPropietario({
        grupo: grupo ?? undefined,
        q: buscado || undefined,
        pagina,
        porPagina,
      });
      if (este !== pedido.current) return;
      setDatos(r);
      setNoDisponible(false);
      // Sin pestaña elegida, el back abre en la primera que tiene algo.
      if (grupo === null) setGrupo(r.grupo);
    } catch {
      // 503 sin la migración, o un rol sin operaciones: no se dibuja.
      if (este === pedido.current) setNoDisponible(true);
    } finally {
      if (este === pedido.current) setCargando(false);
    }
  }, [grupo, buscado, pagina, porPagina]);

  useEffect(() => {
    void cargar();
  }, [cargar, version]);

  if (noDisponible || !datos) return null;
  const totalDeTodo = datos.conteos.ESPERANDO + datos.conteos.RECHAZADAS + datos.conteos.LA_HACE_EL;
  // Nada con el propietario y nadie buscando: la sección no ocupa lugar.
  if (totalDeTodo === 0 && !buscado) return null;

  const activo = grupo ?? datos.grupo;
  const filas = datos.grupo === activo ? datos.filas : [];

  return (
    <section
      className="rounded-lg border border-border bg-card"
      data-testid="bandeja-de-aprobaciones"
      aria-label="Reparaciones con el propietario"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">Con el propietario</h2>
          <p className="text-caption text-fg-muted">
            Lo que espera su aprobación, lo que rechazó y lo que está haciendo él.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar reparación o propietario"
            aria-label="Buscar en las reparaciones con el propietario"
            className="w-full pl-9"
            data-testid="bandeja-buscar"
          />
        </div>
      </div>

      <div className="px-4 pt-3">
        <Tabs
          value={activo}
          onValueChange={(v) => {
            setGrupo(v as GrupoConElPropietario);
            setPagina(1);
          }}
        >
          <TabsList variant="segmented" className="h-auto w-full flex-wrap sm:w-auto">
            {PESTANAS.map((p) => (
              <TabsTrigger
                key={p.grupo}
                value={p.grupo}
                className="inline-flex flex-1 items-center justify-center gap-2 sm:flex-initial"
                data-testid={`bandeja-pestana-${p.grupo}`}
              >
                <span className="hidden sm:inline">{p.nombre}</span>
                <span className="sm:hidden">{p.corto}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                    p.grupo === 'RECHAZADAS' && datos.conteos.RECHAZADAS > 0
                      ? 'bg-danger-soft text-danger'
                      : 'bg-surface-muted text-fg-muted',
                  )}
                >
                  {datos.conteos[p.grupo]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className={cn('mt-3 transition-opacity', cargando && 'opacity-60')} aria-busy={cargando}>
        {filas.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-fg-muted" data-testid="bandeja-vacia">
            {buscado ? `Nada coincide con «${buscado}».` : VACIO[activo]}
          </p>
        ) : esCelular ? (
          <ul className="divide-y divide-border-faint border-t border-border-faint" data-testid="bandeja-en-tarjetas">
            {filas.map((f) => (
              <li key={`${f.grupo}-${f.aprobacionId ?? f.solicitudId}`}>
                {/* allowlist: tarjeta de la lista que abre la solicitud — fila completa tocable, no un botón de acción. */}
                <button
                  type="button"
                  onClick={() => onAbrir?.(f.solicitudId)}
                  className="w-full space-y-1.5 px-4 py-3 text-left focus-visible:bg-surface-muted focus-visible:outline-none"
                  aria-label={`Abrir ${f.reparacion}`}
                  data-testid={`bandeja-${f.grupo}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-fg">{f.reparacion}</p>
                      <p className="text-caption text-fg-muted">{f.inmueble}</p>
                    </div>
                    <p className="shrink-0 text-sm">
                      <Valor f={f} />
                    </p>
                  </div>
                  <p className="flex items-center gap-1 text-caption text-fg-muted">
                    <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{f.propietario}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-caption text-fg-muted">
                    <span>{desdeCuando(f)}</span>
                    <Senales f={f} />
                  </div>
                  <p className="text-caption text-fg-muted">
                    <Detalle f={f} />
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reparación</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead className="whitespace-nowrap">Desde</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                <TableHead className="w-8">
                  <span className="sr-only">Abrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBodyAnimado>
              {filas.map((f) => {
                const abrir = () => onAbrir?.(f.solicitudId);
                return (
                  <TableRowAnimada
                    key={`${f.grupo}-${f.aprobacionId ?? f.solicitudId}`}
                    className="cursor-pointer"
                    tabIndex={0}
                    aria-label={`Abrir ${f.reparacion}`}
                    onClick={abrir}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        abrir();
                      }
                    }}
                    data-testid={`bandeja-${f.grupo}`}
                  >
                    <TableCell className="max-w-[360px]">
                      <p className="flex items-center gap-1.5 font-medium text-fg">
                        <span className="truncate">{f.reparacion}</span>
                      </p>
                      <p className="truncate text-caption text-fg-muted">{f.inmueble}</p>
                      <p className="truncate text-caption text-fg-muted">
                        <Detalle f={f} />
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate text-fg">{f.propietario}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="flex items-center gap-1 text-fg-muted">
                        {f.grupo === 'ESPERANDO' ? (
                          <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : f.grupo === 'RECHAZADAS' ? (
                          <XCircle className="h-3.5 w-3.5 text-danger" aria-hidden="true" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {desdeCuando(f)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Senales f={f} />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Valor f={f} />
                    </TableCell>
                    <TableCell className="w-8 text-fg-subtle">
                      <CaretRight className="h-4 w-4" aria-hidden="true" />
                    </TableCell>
                  </TableRowAnimada>
                );
              })}
            </TableBodyAnimado>
          </Table>
        )}
        {datos.total > PAGE_SIZE_OPTIONS[0] && (
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
      </div>
    </section>
  );
}
