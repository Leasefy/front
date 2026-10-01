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
 * los del panel y los movimientos son la tabla estándar: las pestañas viven
 * DENTRO de la tarjeta, arriba de la tabla, el vacío va dentro
 * del cuerpo —para que los encabezados se sigan viendo— y el pie es el
 * paginador del design system. La carga del archivo no se tocó.
 *
 * ── El lote (17-09-2026) ────────────────────────────────────────────────────
 * «Conciliar los seguros» emitía recibos sin que nadie aprobara. Ya no existe:
 * lo que calza EXACTO (referencia de recaudo + valor) lo arma el sistema en un
 * lote que un funcionario aprueba de una vez (`LoteDeLoQueCalzaExacto`), y la
 * tabla es la cola manual.
 */

import { useCallback, useEffect, useState } from 'react';
import { Bank } from '@phosphor-icons/react';
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
import { ElegirCliente } from '@/components/inmobiliaria/ReciboPorCliente';
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
import { LoteDeLoQueCalzaExacto } from './LoteDeLoQueCalzaExacto';
import { MovimientoFila } from './MovimientoFila';
import { diaLegible, mensajeDe, plata } from './formato';

/**
 * Cuántas líneas se traen por página.
 *
 * El recorte es del SERVIDOR (`limite`/`desplazamiento`), no de presentación:
 * cada línea trae sus cobros candidatos calculados, así que traer todo para
 * recortar en el cliente saldría caro. Por eso acá no va `useTablePagination`
 * —que asume la lista completa en memoria— y sí su pie, `TablePagination`.
 *
 * Arranca en 50: la cola manual se revisa de a muchas líneas.
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
      'Carga el extracto del banco y acá aparecen las líneas con los cobros que se les parecen.',
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
  /*
   * Conciliar contra un CLIENTE: la salida para la línea que no se parece a
   * ningún cobro. Medido en dev el 15-09, los cobros con saldo eran todos de
   * octubre y el extracto era de septiembre — el mes que la persona pagó
   * sencillamente no existía como cobro, así que no había nada que elegir.
   */
  const [conCliente, setConCliente] = useState<MovimientoBancario | null>(null);
  const [clienteElegido, setClienteElegido] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  /*
   * 🔴 (17-09-2026) Sube cuando cambia el extracto: el lote de lo que calza
   * exacto se vuelve a leer (al cargar, el back lo arma solo).
   */
  const [versionDelLote, setVersionDelLote] = useState(0);

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

  /**
   * 🔴 Se concilia contra el CLIENTE, no contra el documento del mes: la deuda
   * vive en las cuotas del contrato y el back reparte la plata sobre la más
   * vieja. Sólo cuando el contrato no llega a una cuenta de inquilino queda el
   * atajo por cobro, y si tampoco hay cobro no hay contra quién emitir: se cae
   * al selector de cliente, que es el camino completo.
   */
  const conciliar = async (m: MovimientoBancario, c: CandidatoDeConciliacion) => {
    if (!c.tenantId && !c.cobroId) {
      setConCliente(m);
      setClienteElegido(null);
      return;
    }
    marcar(m.id, true);
    try {
      const r = await conciliacionBancariaApi.conciliar(
        m.id,
        c.tenantId ? { tenantId: c.tenantId } : { cobroId: c.cobroId as string },
      );
      const quien = c.tenantName ?? c.propertyTitle;
      toast.success(
        r.recibo ? `Recibo N.º ${r.recibo.numero} emitido a ${quien}.` : `Movimiento conciliado con ${quien}.`,
      );
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo conciliar el movimiento.'));
    } finally {
      marcar(m.id, false);
    }
  };

  /**
   * La plata va contra la DEUDA del cliente, no contra un cobro elegido: la
   * deuda nace con el contrato, así que el back la reparte de la cuota más
   * vieja a la más nueva y lo que sobre abona a los meses que siguen del mismo
   * contrato. Nadie elige el mes — ésa fue una regla explícita de Nico.
   */
  const conciliarConCliente = async () => {
    const m = conCliente;
    if (!m || !clienteElegido) return;
    marcar(m.id, true);
    try {
      const r = await conciliacionBancariaApi.conciliar(m.id, { tenantId: clienteElegido });
      const cuantos = r.pago?.recibos.length ?? 0;
      const aFavor = r.pago?.anticipoCop ?? 0;
      // Se dice lo que PASÓ, no «listo»: cuántos meses se pagaron y cuánta
      // plata quedó a favor. Sin eso nadie entiende a dónde fue el dinero.
      toast.success(
        cuantos === 0
          ? `Quedaron ${plata(aFavor)} a favor del cliente: no debía nada.`
          : `${cuantos} ${cuantos === 1 ? 'recibo emitido' : 'recibos emitidos'}` +
              (aFavor > 0 ? ` y ${plata(aFavor)} a favor del cliente.` : '.'),
      );
      setConCliente(null);
      setClienteElegido(null);
      await cargar();
    } catch (error) {
      toast.error(mensajeDe(error, 'No se pudo conciliar contra el cliente.'));
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
          <CargarExtracto
            onCargado={() => {
              void cargar();
              setVersionDelLote((v) => v + 1);
            }}
          />
        </div>
      )}

      {/* 🔴 Lo que calza exacto va en lote y se aprueba de una vez; la tabla
          de abajo es la cola manual. */}
      <LoteDeLoQueCalzaExacto
        version={versionDelLote}
        onCambio={() => void cargar()}
      />

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
          {pestana === 'PENDIENTE' && (
            <p className="text-caption text-fg-muted" data-testid="cola-manual">
              Cola manual: lo que no calza exacto se concilia una por una.
            </p>
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
                    onConciliarConCliente={(mov) => {
                      setConCliente(mov);
                      setClienteElegido(null);
                    }}
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

      <Dialog
        open={conCliente !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setConCliente(null);
            setClienteElegido(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliar con un cliente</DialogTitle>
            <DialogDescription>
              {conCliente
                ? `${plata(conCliente.valorCop)} del ${diaLegible(conCliente.fecha)} — «${conCliente.descripcion}».`
                : ''}{' '}
              La plata va a su deuda más vieja primero. Si el mes en curso todavía no está cobrado,
              se genera con el canon de su contrato; lo que sobre queda a su favor para los meses
              que vengan.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4" data-testid="conciliar-con-cliente">
            <ElegirCliente value={clienteElegido} onChange={setClienteElegido} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              onClick={() => {
                setConCliente(null);
                setClienteElegido(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={!clienteElegido || (conCliente ? ocupados.has(conCliente.id) : true)}
              onClick={() => void conciliarConCliente()}
              data-testid="confirmar-conciliar-cliente"
            >
              Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
