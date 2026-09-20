'use client';

/**
 * Los lotes de pagos al banco, y el botón para armar el del mes.
 *
 * Un lote reemplaza el «exportar a Excel, pasarlo por el conversor del banco
 * y subir el plano» de cada mes. Acá se ve cada uno con su estado, cuánto
 * suma, cuántos pagos lleva y quién lo armó y lo aprobó. Lo demás —aprobar,
 * generar, descargar, marcar pagado— pasa en el detalle.
 *
 * Armar un lote NO gira nada: toma las dispersiones pendientes del mes y las
 * congela en un borrador. Por eso el botón vive acá sin más ceremonia que una
 * confirmación con el número y el total que va a tomar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import { ArrowRight, Bank, Plus } from '@phosphor-icons/react';
import { Banner } from '@leasefy/cadence';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useLotesDeDispersion } from '@/lib/hooks/use-lotes-de-dispersion';
import { lotesDeDispersionApi, type LoteResumen } from '@/lib/api/lotes-de-dispersion.service';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { formatDateTime } from '@/lib/format';
import { nombreDelMes } from '@/lib/utils/mes';
import { cn } from '@/lib/utils';
import { NOMBRE_DEL_ESTADO, TONO_DEL_ESTADO } from './estado-del-lote';
import { useNombresDelEquipo } from './use-nombres-del-equipo';
import { ElegirAQuienPagarle, type EleccionDelLote } from './ElegirAQuienPagarle';

type Filtro = 'todos' | 'en_curso' | 'PAGADO' | 'ANULADO';

const FILTROS: Array<{ id: Filtro; nombre: string }> = [
  { id: 'todos', nombre: 'Todos' },
  { id: 'en_curso', nombre: 'En curso' },
  { id: 'PAGADO', nombre: 'Pagados' },
  { id: 'ANULADO', nombre: 'Anulados' },
];

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function pasaElFiltro(lote: LoteResumen, filtro: Filtro): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'en_curso') return lote.estado !== 'PAGADO' && lote.estado !== 'ANULADO';
  return lote.estado === filtro;
}

function mensajeDe(error: unknown, siNo: string): string {
  return error instanceof Error && error.message ? error.message : siNo;
}

export function ListaDeLotes() {
  const router = useRouter();
  const { canAccess } = usePermissions();
  const { lotes, cargando, error, refetch } = useLotesDeDispersion({});
  const { nombreDe } = useNombresDelEquipo();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [mes, setMes] = useState(mesActual);
  const [armando, setArmando] = useState(false);

  const puedeArmar = canAccess('dispersiones', 'create');
  const visibles = useMemo(() => lotes.filter((l) => pasaElFiltro(l, filtro)), [lotes, filtro]);
  // Un lote por mes y por corrida: la lista crece sola y no tiene techo.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, { resetKey: filtro });

  const irAlLote = useCallback(
    (id: string) => router.push(`/panel/inmobiliaria/pagos/dispersiones/lotes/${id}`),
    [router],
  );

  if (cargando && lotes.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (error && lotes.length === 0) {
    return <FalloDeCarga error={error} queEs="los lotes" onReintentar={refetch} />;
  }

  return (
    <div className="space-y-6" data-testid="lista-de-lotes">
      {puedeArmar && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-fg">Armar el lote de un mes</p>
            <p className="max-w-xl text-xs text-fg-muted">
              Toma las dispersiones pendientes del mes y las congela en un borrador. No gira nada
              todavía: lo aprueba otra persona, después sale el archivo.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="mes-del-lote" className="text-xs">
                Mes
              </Label>
              <Input
                id="mes-del-lote"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-10 w-40 font-mono"
              />
            </div>
            <Button onClick={() => setArmando(true)} hideArrow disabled={!/^\d{4}-\d{2}$/.test(mes)}>
              <Plus className="h-4 w-4" />
              Armar lote de {nombreDelMes(mes, 'es', 'short')}
            </Button>
          </div>
        </section>
      )}

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filtro === f.id}
                onClick={() => setFiltro(f.id)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filtro === f.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted',
                )}
              >
                {f.nombre}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs text-fg-muted tabular-nums">
            {visibles.length} {visibles.length === 1 ? 'lote' : 'lotes'}
          </span>
        </div>

        {visibles.length === 0 ? (
          <EmptyState
            icon={Bank}
            title={lotes.length === 0 ? 'Todavía no hay lotes' : 'Ningún lote con ese filtro'}
            description={
              lotes.length === 0
                ? 'Cuando armes el primero va a aparecer acá, con su estado y su total.'
                : 'Prueba con otro estado.'
            }
            action={
              lotes.length === 0
                ? undefined
                : { label: 'Ver todos', onClick: () => setFiltro('todos') }
            }
            className="m-4"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Armado por</TableHead>
                  <TableHead>Aprobado por</TableHead>
                  <TableHead>Armado</TableHead>
                  <TableHead className="sr-only">Abrir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((lote) => {
                  const enTotal = lote._count?.items ?? lote.cantidad;
                  return (
                    <TableRow
                      key={lote.id}
                      className="cursor-pointer"
                      onClick={() => irAlLote(lote.id)}
                      data-testid={`lote-${lote.id}`}
                    >
                      <TableCell className="font-medium text-fg">{nombreDelMes(lote.month)}</TableCell>
                      <TableCell>
                        <Badge variant={TONO_DEL_ESTADO[lote.estado]}>{NOMBRE_DEL_ESTADO[lote.estado]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {lote.cantidad}
                        {enTotal !== lote.cantidad && (
                          <span className="text-fg-muted"> de {enTotal}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-fg">
                        {formatCurrency(lote.totalCop)}
                      </TableCell>
                      <TableCell className="text-fg-muted">{nombreDe(lote.creadoPorUserId)}</TableCell>
                      <TableCell className="text-fg-muted">
                        {lote.aprobadoPorUserId ? nombreDe(lote.aprobadoPorUserId) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-fg-muted">
                        {formatDateTime(lote.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" hideArrow onClick={(e) => e.stopPropagation()}>
                          <Link href={`/panel/inmobiliaria/pagos/dispersiones/lotes/${lote.id}`}>
                            Abrir
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {shouldPaginate && (
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
        )}
      </div>

      <ArmarLoteDialog
        abierto={armando}
        mes={mes}
        onCerrar={() => setArmando(false)}
        onArmado={(id) => {
          setArmando(false);
          irAlLote(id);
        }}
      />
    </div>
  );
}

/**
 * Elegir a quién pagarle y armar el lote.
 *
 * Antes este diálogo sólo contaba las pendientes y armaba el mes entero. El CEO
 * (2026-09-15) pidió lo contrario: varios lotes por mes, eligiendo a quién,
 * ordenando de menor a mayor y cortando por monto, mirando la plata que hay en
 * la cuenta. Toda esa decisión vive en `ElegirAQuienPagarle`; acá quedan el
 * marco y el botón.
 *
 * Sin nadie tildado se arma el MES ENTERO — es el comportamiento de siempre y
 * el que espera quien sólo quiere sacar todo junto—, y el botón lo dice con
 * esas palabras para que nadie lo descubra después.
 */
function ArmarLoteDialog({
  abierto,
  mes,
  onCerrar,
  onArmado,
}: {
  abierto: boolean;
  mes: string;
  onCerrar: () => void;
  onArmado: (loteId: string) => void;
}) {
  const [eleccion, setEleccion] = useState<EleccionDelLote>({
    dispersionIds: [],
    orden: 'MENOR_A_MAYOR',
    totalCop: 0,
    descubiertoCop: 0,
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) setError(null);
  }, [abierto]);

  const elegidos = eleccion.dispersionIds.length;

  const armar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const { lote, excluidos, descubiertoCop } = await lotesDeDispersionApi.armar({
        month: mes,
        // Lista vacía = el mes entero. El back rechaza un `[]` explícito
        // justamente para que «ninguno» y «todos» no sean el mismo cuerpo.
        dispersionIds: elegidos > 0 ? eleccion.dispersionIds : undefined,
        orden: eleccion.orden,
      });
      const partes = [`${lote.cantidad} pagos por ${formatCurrency(lote.totalCop)}`];
      if (excluidos.length > 0) {
        partes.push(
          `${excluidos.length} ${excluidos.length === 1 ? 'excluido' : 'excluidos'} por datos bancarios incompletos`,
        );
      }
      if (descubiertoCop > 0) {
        partes.push(`${formatCurrency(descubiertoCop)} salen de plata de la inmobiliaria`);
      }
      toast.success(`Lote de ${nombreDelMes(mes)} armado`, {
        description: `${partes.join(' · ')}.`,
      });
      onArmado(lote.id);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudo armar el lote.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <DialogContent className="max-w-4xl" data-testid="dialogo-armar-lote">
        <DialogHeader>
          <DialogTitle>Armar el lote de {nombreDelMes(mes)}</DialogTitle>
          <DialogDescription>
            Elige a quién le pagas y cuánto. Se congelan las dispersiones con los datos bancarios de
            hoy; todavía no se gira nada.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-6 py-4 text-sm">
          {abierto && <ElegirAQuienPagarle mes={mes} onCambio={setEleccion} />}
          {error && <Banner variant="danger">{error}</Banner>}
        </div>
        <DialogFooter>
          <Button variant="outline" hideArrow onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={() => void armar()} isLoading={enviando} hideArrow>
            {elegidos > 0
              ? `Armar lote con ${elegidos} ${elegidos === 1 ? 'propietario' : 'propietarios'}`
              : 'Armar lote con el mes entero'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
