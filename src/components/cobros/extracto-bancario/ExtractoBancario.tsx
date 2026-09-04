'use client';

/**
 * Extracto bancario — la conciliación que emite recibos de caja.
 *
 * Es el extracto del banco contra los cobros con saldo: conciliar una línea es
 * emitir el recibo. Permisos: `cobros`/view para ver, `cobros`/create para
 * conciliar (es emitir un recibo), `cobros`/edit para ignorar y reabrir.
 *
 * Desde que la conciliación quedó en UN solo lugar, esto vive DENTRO del
 * workspace del agente, en `/conciliacion/movimientos`, arriba del bloque
 * «Lo que vio el agente» (`<ConciliacionDelAgente />`). La página vieja
 * `/cobros/extracto-bancario` ya no existe: redirige acá.
 *
 * ── Qué cambió y por qué (Nico, 2026-09-03) ─────────────────────────────────
 * Los cuatro números de arriba estaban en mono MAYÚSCULA, un estilo que no
 * existe en ninguna otra pantalla del panel, y los movimientos eran una lista
 * de tarjetas apiladas con un «Anterior / Siguiente» propio. Ahora los KPIs son
 * los del panel y los movimientos son la tabla estándar: las pestañas y el lote
 * de seguros viven DENTRO de la tarjeta, arriba de la tabla, el vacío va dentro
 * del cuerpo —para que los encabezados se sigan viendo— y el pie es el
 * paginador del design system. La carga del archivo no se tocó.
 */

import { useCallback, useEffect, useState } from 'react';
import { Bank, ShieldCheck } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type {
  CandidatoDeConciliacion,
  EstadoDelMovimientoBancario,
  MovimientoBancario,
  ResumenDeConciliacion,
} from '@/lib/api/conciliacion-bancaria.types';
import { CargarExtracto } from './CargarExtracto';
import { MovimientoFila } from './MovimientoFila';
import { diaLegible, mensajeDe } from './formato';

/**
 * Cuántas líneas se traen por página.
 *
 * El recorte es del SERVIDOR (`limite`/`desplazamiento`), no de presentación:
 * cada línea trae sus cobros candidatos calculados, así que traer todo para
 * recortar en el cliente saldría caro. Por eso acá no va `useTablePagination`
 * —que asume la lista completa en memoria— y sí su pie, `TablePagination`.
 *
 * Arranca en 50 a propósito: «Conciliar los seguros (n)» cuenta los seguros de
 * la página, y bajarlo a 10 haría que ese número describiera cada vez menos de
 * lo que el lote realmente hace.
 */
const POR_PAGINA_INICIAL = 50;

const TITULO_DE_LA_PESTANA: Record<EstadoDelMovimientoBancario, string> = {
  PENDIENTE: 'Pendientes',
  CONCILIADO: 'Conciliados',
  IGNORADO: 'Ignorados',
};

const COLUMNAS = ['Fecha', 'Movimiento', 'Valor', 'Cruce sugerido', 'Acciones'] as const;

const VACIO_POR_PESTANA: Record<EstadoDelMovimientoBancario, { titulo: string; descripcion: string }> = {
  PENDIENTE: {
    titulo: 'Nada pendiente de conciliar',
    descripcion:
      'Cargá el extracto del banco y acá aparecen las líneas con los cobros que se les parecen.',
  },
  CONCILIADO: {
    titulo: 'Todavía no hay movimientos conciliados',
    descripcion: 'Cuando concilies una línea del extracto, queda acá con su recibo.',
  },
  IGNORADO: {
    titulo: 'No hay movimientos ignorados',
    descripcion: 'Cuando ignores una línea del extracto, queda acá con su motivo.',
  },
};

interface Props {
  /**
   * `id` para el bloque de carga, para que un enlace con ancla caiga en el
   * cargador y no en el título. La Sala del agente enlaza
   * `…/movimientos#upload`, que es el ancla que ya usaba la pantalla del micro:
   * si se le cambia el nombre acá, ese botón deja de llevar a ningún lado.
   */
  idDeCarga?: string;
}

export function ExtractoBancario({ idDeCarga }: Props = {}) {
  const { canAccess, isLoading: permisosCargando } = usePermissions();
  const puedeConciliar = permisosCargando || canAccess('cobros', 'create');
  const puedeEditar = permisosCargando || canAccess('cobros', 'edit');

  const [pestana, setPestana] = useState<EstadoDelMovimientoBancario>('PENDIENTE');
  const [resumen, setResumen] = useState<ResumenDeConciliacion | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoBancario[] | null>(null);
  const [total, setTotal] = useState(0);
  /** 1-based, como lo cuenta el pie del design system. */
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [errorDeCarga, setErrorDeCarga] = useState<unknown>(null);
  const [ocupados, setOcupados] = useState<ReadonlySet<string>>(new Set());
  const [ignorando, setIgnorando] = useState<MovimientoBancario | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmandoSeguros, setConfirmandoSeguros] = useState(false);
  const [corriendoSeguros, setCorriendoSeguros] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorDeCarga(null);
    try {
      const [r, pag] = await Promise.all([
        conciliacionBancariaApi.resumen(),
        conciliacionBancariaApi.listar({
          estado: pestana,
          limite: porPagina,
          desplazamiento: (pagina - 1) * porPagina,
        }),
      ]);
      setResumen(r);
      setMovimientos(pag.data);
      setTotal(pag.total);
    } catch (error) {
      setErrorDeCarga(error);
    } finally {
      setCargando(false);
    }
  }, [pestana, pagina, porPagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const marcar = (id: string, ocupado: boolean) =>
    setOcupados((s) => {
      const n = new Set(s);
      if (ocupado) n.add(id);
      else n.delete(id);
      return n;
    });

  const conciliar = async (m: MovimientoBancario, c: CandidatoDeConciliacion) => {
    marcar(m.id, true);
    try {
      const r = await conciliacionBancariaApi.conciliar(m.id, c.cobroId);
      toast.success(`Recibo N.º ${r.recibo.numero} emitido a ${c.tenantName ?? c.propertyTitle}.`);
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo conciliar el movimiento.'));
    } finally {
      marcar(m.id, false);
    }
  };

  const ignorar = async () => {
    if (!ignorando) return;
    const m = ignorando;
    marcar(m.id, true);
    try {
      await conciliacionBancariaApi.ignorar(m.id, motivo.trim());
      toast.success('Movimiento ignorado.');
      setIgnorando(null);
      setMotivo('');
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo ignorar el movimiento.'));
    } finally {
      marcar(m.id, false);
    }
  };

  const reabrir = async (m: MovimientoBancario) => {
    marcar(m.id, true);
    try {
      await conciliacionBancariaApi.reabrir(m.id);
      toast.success('El movimiento volvió a pendientes.');
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo reabrir el movimiento.'));
    } finally {
      marcar(m.id, false);
    }
  };

  const conciliarSeguros = async () => {
    setCorriendoSeguros(true);
    try {
      const r = await conciliacionBancariaApi.conciliarSeguros();
      const partes = [
        `${r.conciliados} ${r.conciliados === 1 ? 'conciliado' : 'conciliados'}`,
        `${r.sinCandidatoSeguro} sin candidato seguro`,
      ];
      if (r.errores.length > 0) partes.push(`${r.errores.length} con error`);
      (r.errores.length > 0 ? toast.error : toast.success)(partes.join(' · '), {
        description: r.errores[0]?.mensaje,
      });
      setConfirmandoSeguros(false);
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo conciliar en lote.'));
    } finally {
      setCorriendoSeguros(false);
    }
  };

  const segurosEnPantalla = (movimientos ?? []).filter(
    (m) => m.estado === 'PENDIENTE' && m.candidatos.filter((c) => c.seguro).length === 1,
  ).length;

  const cambiarPestana = (v: string) => {
    setPestana(v as EstadoDelMovimientoBancario);
    setPagina(1);
  };

  const sinFilas = !movimientos || movimientos.length === 0;
  const vacioDeLaPestana = VACIO_POR_PESTANA[pestana];

  return (
    <div className="space-y-6">
      {/* Los cuatro números, en la tarjeta KPI del panel. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="resumen">
        <Cifra etiqueta="Pendientes de conciliar" valor={resumen ? String(resumen.pendientes) : '—'} />
        <Cifra etiqueta="Conciliados este mes" valor={resumen ? String(resumen.conciliadosEsteMes) : '—'} />
        <Cifra etiqueta="Ignorados" valor={resumen ? String(resumen.ignorados) : '—'} />
        <Cifra
          etiqueta="Último extracto"
          valor={resumen?.ultimoExtracto ? diaLegible(resumen.ultimoExtracto.cargadoAt) : 'Ninguno'}
          detalle={resumen?.ultimoExtracto?.nombre ?? undefined}
        />
      </div>

      {puedeConciliar && (
        <div id={idDeCarga} className={idDeCarga ? 'scroll-mt-24' : undefined}>
          <CargarExtracto onCargado={() => void cargar()} />
        </div>
      )}

      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Pestañas y lote, dentro de la tarjeta y encima de la tabla. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={pestana} onValueChange={cambiarPestana}>
            <TabsList variant="underline" className="justify-start">
              {(Object.keys(TITULO_DE_LA_PESTANA) as EstadoDelMovimientoBancario[]).map((e) => (
                <TabsTrigger key={e} value={e} data-testid={`pestana-${e}`}>
                  {TITULO_DE_LA_PESTANA[e]}
                  {e === 'PENDIENTE' && resumen ? ` (${resumen.pendientes})` : ''}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {pestana === 'PENDIENTE' && puedeConciliar && (
            <Button
              variant="secondary"
              hideArrow
              disabled={segurosEnPantalla === 0 || corriendoSeguros}
              onClick={() => setConfirmandoSeguros(true)}
              data-testid="conciliar-seguros"
              className="shrink-0"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Conciliar los seguros ({segurosEnPantalla})
            </Button>
          )}
        </div>

        {/* Carga y fallo, por fuera del cuerpo; el vacío va DENTRO, para que
            los encabezados de la tabla se sigan viendo. */}
        <EstadoDeDatos
          cargando={cargando && movimientos === null}
          error={errorDeCarga}
          queEs="los movimientos del extracto"
          onReintentar={cargar}
          esqueleto={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Spinner size="lg" />
              <p className="text-body-sm text-fg-muted">Cargando movimientos...</p>
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNAS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody data-testid="movimientos">
              {sinFilas ? (
                <TableRow>
                  <TableCell colSpan={COLUMNAS.length} className="p-0">
                    <SinDatos
                      queSon="movimientos"
                      icono={Bank}
                      titulo={vacioDeLaPestana.titulo}
                      descripcion={vacioDeLaPestana.descripcion}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((m) => (
                  <MovimientoFila
                    key={m.id}
                    movimiento={m}
                    ocupado={ocupados.has(m.id)}
                    puedeConciliar={puedeConciliar}
                    puedeEditar={puedeEditar}
                    onConciliar={(mov, c) => void conciliar(mov, c)}
                    onIgnorar={(mov) => {
                      setIgnorando(mov);
                      setMotivo('');
                    }}
                    onReabrir={(mov) => void reabrir(mov)}
                  />
                ))
              )}
            </TableBody>
          </Table>

          {total > 0 && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={pagina}
                pageSize={porPagina}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPagina}
                onPageSizeChange={(size) => {
                  setPorPagina(size);
                  setPagina(1);
                }}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>

      <Dialog open={ignorando !== null} onOpenChange={(abierto) => !abierto && setIgnorando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar este movimiento</DialogTitle>
            <DialogDescription>
              {ignorando ? `«${ignorando.descripcion}» del ${diaLegible(ignorando.fecha)}.` : ''} Queda escrito por
              qué no es un pago de canon; se puede volver a pendiente después.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 px-6 py-4">
            <Label htmlFor="motivo-ignorar">Motivo</Label>
            <Textarea
              id="motivo-ignorar"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Es la nómina de la oficina, no un pago de canon."
              rows={3}
              maxLength={300}
            />
            <p className="text-caption text-fg-muted">Entre 5 y 300 caracteres.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" hideArrow onClick={() => setIgnorando(null)}>
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={motivo.trim().length < 5 || (ignorando ? ocupados.has(ignorando.id) : true)}
              onClick={() => void ignorar()}
              data-testid="confirmar-ignorar"
            >
              Ignorar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmandoSeguros} onOpenChange={setConfirmandoSeguros}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conciliar {segurosEnPantalla} {segurosEnPantalla === 1 ? 'movimiento seguro' : 'movimientos seguros'}</AlertDialogTitle>
            <AlertDialogDescription>
              Se emite un recibo de caja por cada línea que tiene un solo cobro con el valor exacto y el
              nombre o la dirección en la descripción. Lo que tenga dudas queda pendiente para que lo
              mires vos. El lote corre sobre TODOS los movimientos pendientes, no sólo sobre los de
              esta página.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={corriendoSeguros}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void conciliarSeguros();
              }}
              disabled={corriendoSeguros}
              data-testid="confirmar-seguros"
            >
              {corriendoSeguros ? 'Conciliando…' : 'Conciliar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** La tarjeta KPI del panel: etiqueta chica arriba, número grande abajo. */
function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-caption text-fg-muted">{etiqueta}</p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{valor}</p>
      {detalle && (
        <p className="mt-0.5 truncate text-caption text-fg-muted" title={detalle}>
          {detalle}
        </p>
      )}
    </div>
  );
}
