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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bank, EyeSlash, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';
import { PestanasDeEstado } from '@/components/pantalla/PestanasDeEstado';
import { Textarea } from '@/components/ui/textarea';
import { ElegirCliente } from '@/components/inmobiliaria/ReciboPorCliente';
import { toast } from '@/components/ui/toast';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { conciliacionBancariaApi } from '@/lib/api/conciliacion-bancaria.service';
import type {
  CandidatoDeConciliacion,
  CuentasDeLaConciliacion,
  EstadoDelMovimientoBancario,
  FiltroDeCuenta,
  MovimientoBancario,
  ResumenDeConciliacion,
} from '@/lib/api/conciliacion-bancaria.types';
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { CargarExtracto } from './CargarExtracto';
import { LoteDeLoQueCalzaExacto } from './LoteDeLoQueCalzaExacto';
// D-CONCILIACION (ola 3, Nico P9/P10/P12/P6): cierre del mes, alerta, planilla de caja y aseguradoras.
import { AlertaDePartidas } from './AlertaDePartidas';
import { CierreDelMes } from './CierreDelMes';
import { PlanillaDeCaja } from './PlanillaDeCaja';
import { RelacionDeAseguradora } from './RelacionDeAseguradora';
import { LiquidacionesDeLeasefy } from './LiquidacionesDeLeasefy';
// C2-SALIDAS (Nico, P5): las salidas del extracto se concilian y se avisan.
import { AvisosDeLasSalidas, SalidasDeLaPagina } from './SalidasDelExtracto';
import { MovimientoFila } from './MovimientoFila';
import { PorCuenta } from './PorCuenta';
import { diaLegible, plata } from './formato';

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

/**
 * El buscador de la cola (regla de Nico, 23-10: toda tabla con buscador). El back todavía no
 * busca (`GET movimientos` no tiene `q`): se busca en las líneas de ESTA página y el campo lo
 * dice. Por descripción, referencia, cliente de un cruce o valor («1800000», «1.800.000»).
 */
export function lineaCoincide(m: MovimientoBancario, busqueda: string): boolean {
  const q = busqueda.trim().toLocaleLowerCase('es-CO');
  if (!q) return true;
  const textos = [m.descripcion, m.referencia ?? '', ...m.candidatos.map((c) => c.tenantName ?? '')];
  if (textos.some((t) => t.toLocaleLowerCase('es-CO').includes(q))) return true;
  const soloDigitos = q.replace(/[^0-9]/g, '');
  return soloDigitos.length >= 3 && String(Math.abs(Math.round(m.valorCop))).includes(soloDigitos);
}

const VACIO_POR_PESTANA: Record<EstadoDelMovimientoBancario, { titulo: string; descripcion: string }> = {
  PENDIENTE: {
    titulo: 'Nada pendiente de conciliar',
    descripcion:
      'Carga el extracto del banco y aquí aparecen las líneas con los cobros que se les parecen.',
  },
  CONCILIADO: {
    titulo: 'Todavía no hay movimientos conciliados',
    descripcion: 'Cuando concilies una línea del extracto, queda aquí con su recibo.',
  },
  IGNORADO: {
    titulo: 'No hay movimientos ignorados',
    descripcion: 'Cuando ignores una línea del extracto, queda aquí con su motivo.',
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

/** «N.º 8», «N.º 8 y N.º 9», «N.º 8, N.º 9 y N.º 10». */
function unirConY(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
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
  /** El error del motivo de ignorar que mandó el back (`campos[].motivo`). */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);
  /*
   * 🔴 (17-09-2026) Sube cuando cambia el extracto: el lote de lo que calza
   * exacto se vuelve a leer (al cargar, el back lo arma solo).
   */
  const [versionDelLote, setVersionDelLote] = useState(0);
  /*
   * 🔴 (02-10-2026) Muchos a uno: si el back dice que falta la tabla de
   * vínculos (503 `FALTA_UNA_MIGRACION` o `sePuedeAplicar: false`), lo sabe
   * la tabla entera: ninguna fila ofrece «Aprobar» hasta que se aplique.
   */
  const [sinTablaDeVinculos, setSinTablaDeVinculos] = useState(false);
  const marcarSinTabla = useCallback(() => setSinTablaDeVinculos(true), []);
  /*
   * 🔴 (02-10-2026, Nico P3) La conciliación va por cuenta: las cuentas de la
   * inmobiliaria con sus indicadores, y cuál se está mirando (`null` = todas).
   * Si el back no las puede dar (un back viejo), la pantalla sigue como antes.
   */
  const [porCuenta, setPorCuenta] = useState<CuentasDeLaConciliacion | null>(null);
  const [filtroDeCuenta, setFiltroDeCuenta] = useState<FiltroDeCuenta | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorDeCarga(null);
    const cuenta = porCuenta?.disponible ? (filtroDeCuenta ?? undefined) : undefined;
    try {
      const [r, pag, cuentas] = await Promise.all([
        conciliacionBancariaApi.resumen(cuenta),
        conciliacionBancariaApi.listar({
          estado: pestana,
          cuenta,
          limite: porPagina,
          desplazamiento: (pagina - 1) * porPagina,
        }),
        leerLasCuentas(),
      ]);
      setResumen(r);
      setMovimientos(pag.data);
      setTotal(pag.total);
      if (cuentas) setPorCuenta(cuentas);
    } catch (error) {
      setErrorDeCarga(error);
    } finally {
      setCargando(false);
    }
    // `porCuenta` sólo decide si se puede filtrar: no vuelve a leer al llegar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pestana, pagina, porPagina, filtroDeCuenta]);

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
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo conciliar el movimiento.',
          accion: 'conciliar el movimiento',
        }),
      );
    } finally {
      marcar(m.id, false);
    }
  };

  /** CONC-12 (Nico, 17-10): la línea que paga el arriendo de dos inquilinos. */
  const conciliarElPar = async (m: MovimientoBancario) => {
    if (!m.par) return;
    marcar(m.id, true);
    try {
      await conciliacionBancariaApi.conciliarConVariosClientes(
        m.id,
        m.par.partes.map((p) => ({ tenantId: p.tenantId, valorCop: p.valorCop })),
      );
      const nombres = m.par.partes.map((p) => p.tenantName ?? p.propertyTitle);
      toast.success(`Conciliado: un recibo a ${nombres.slice(0, -1).join(', ')} y otro a ${nombres[nombres.length - 1]}.`);
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo conciliar el pago de los dos.',
          accion: 'conciliar el pago de los dos inquilinos',
        }),
      );
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
      // CONC-10 (QA de agentes 17-10): con el número del recibo, como cuando
      // se concilia contra un candidato («Recibo N.º 6 emitido a …»).
      const numeros = (r.pago?.recibos ?? []).map((x) => `N.º ${x.numero}`);
      toast.success(
        cuantos === 0
          ? `Quedaron ${plata(aFavor)} a favor del cliente: no debía nada.`
          : `${cuantos === 1 ? 'Recibo' : 'Recibos'} ${unirConY(numeros)} ${cuantos === 1 ? 'emitido' : 'emitidos'}` +
              (aFavor > 0 ? ` y ${plata(aFavor)} a favor del cliente.` : '.'),
      );
      setConCliente(null);
      setClienteElegido(null);
      await cargar();
    } catch (error) {
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo conciliar contra el cliente.',
          accion: 'conciliar el movimiento contra el cliente',
        }),
      );
    } finally {
      marcar(m.id, false);
    }
  };

  const ignorar = async () => {
    if (!ignorando) return;
    const m = ignorando;
    marcar(m.id, true);
    setErrorDelMotivo(null);
    try {
      await conciliacionBancariaApi.ignorar(m.id, motivo.trim());
      toast.success('Movimiento ignorado.');
      setIgnorando(null);
      setMotivo('');
      await cargar();
    } catch (error) {
      // Un 400 del motivo va debajo del motivo; lo demás, al aviso.
      const { porCampo, sueltos } = repartirErroresDelServidor(error, {
        campos: ['motivo'] as const,
        porDefecto: 'No se pudo ignorar el movimiento.',
        accion: 'ignorar el movimiento',
      });
      if (porCampo.motivo) {
        setErrorDelMotivo(porCampo.motivo);
        document.getElementById('motivo-ignorar')?.focus();
      }
      if (sueltos.length > 0) toast.error(sueltos.join(' · '));
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
      toast.error(
        mensajeParaLaPersona(error, {
          porDefecto: 'No se pudo reabrir el movimiento.',
          accion: 'volver el movimiento a pendiente',
        }),
      );
    } finally {
      marcar(m.id, false);
    }
  };

  const cambiarPestana = (v: EstadoDelMovimientoBancario) => {
    setPestana(v);
    setPagina(1);
  };

  const visibles = useMemo(
    () => (movimientos ?? []).filter((m) => lineaCoincide(m, busqueda)),
    [movimientos, busqueda],
  );
  const sinFilas = !movimientos || movimientos.length === 0;
  const sinCoincidencias = !sinFilas && visibles.length === 0;
  const vacioDeLaPestana = VACIO_POR_PESTANA[pestana];
  const sinNada =
    resumen !== null && resumen.pendientes === 0 && resumen.conciliadosEsteMes === 0 && resumen.ignorados === 0;

  return (
    <div className="space-y-6">
      {/* D-CONCILIACION (Nico, P10): partidas que pasan de los días de la alerta (30 por defecto). */}
      <AlertaDePartidas version={versionDelLote} />

      {/* 🔴 (02-10-2026) Por cuenta: filtra la tabla y los números de abajo. */}
      {porCuenta && (
        <PorCuenta
          datos={porCuenta}
          filtro={filtroDeCuenta}
          onFiltro={(f) => {
            setFiltroDeCuenta(f);
            setPagina(1);
          }}
        />
      )}

      {/* D-CONCILIACION (Nico, P9): el cierre del mes de la cuenta elegida. */}
      {porCuenta?.disponible && filtroDeCuenta && porCuenta.cuentas.some((c) => c.id === filtroDeCuenta) && (
        <CierreDelMes key={filtroDeCuenta} cuentaId={filtroDeCuenta} onCambio={() => void cargar()} />
      )}

      {/* Revisora r25 (Movimientos #2): LA RESPUESTA en una cifra —lo que falta conciliar—,
          con lo conciliado del mes y lo ignorado en la barra; el último extracto, en el pie.
          Antes, cuatro tarjetas del mismo peso con el 0 de los ignorados. Las cifras son las
          del back tal cual; la barra sólo las pone en proporción. */}
      {resumen && (
        <CifraHeroe
          rotulo="Por conciliar"
          cifra={resumen.pendientes.toLocaleString('es-CO')}
          contexto={resumen.pendientes === 1 ? 'línea del banco sin conciliar' : 'líneas del banco sin conciliar'}
          esCero={sinNada}
          cuandoEsCero="Todavía no hay líneas del banco: carga el extracto y aquí aparecen con las cuotas que se les parecen."
          tramos={[
            {
              clave: 'conciliados',
              etiqueta: 'Conciliados este mes',
              monto: resumen.conciliadosEsteMes,
              tono: 'exito',
              siempre: true,
              cifra: <span className="font-mono tabular-nums">{resumen.conciliadosEsteMes.toLocaleString('es-CO')}</span>,
            },
            {
              clave: 'pendientes',
              etiqueta: 'Pendientes',
              monto: resumen.pendientes,
              tono: 'aviso',
              siempre: true,
              cifra: <span className="font-mono tabular-nums">{resumen.pendientes.toLocaleString('es-CO')}</span>,
            },
            {
              clave: 'ignorados',
              etiqueta: 'Ignorados',
              monto: resumen.ignorados,
              tono: 'neutro',
              cifra: <span className="font-mono tabular-nums">{resumen.ignorados.toLocaleString('es-CO')}</span>,
            },
          ]}
          pie={
            resumen.ultimoExtracto
              ? `Último extracto: ${diaLegible(resumen.ultimoExtracto.cargadoAt)}${resumen.ultimoExtracto.nombre ? ` · ${resumen.ultimoExtracto.nombre}` : ''}`
              : 'Todavía no se ha cargado ningún extracto.'
          }
          data-testid="resumen"
        />
      )}

      {/* Revisora r25 (Movimientos #3): la cola es el trabajo y va primero; el lote, las
          salidas y cargar el extracto, debajo (cargar también está en el encabezado). */}
      <SalidasDeLaPagina movimientos={movimientos}>
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Pestañas con su conteo y el buscador, dentro de la tarjeta y encima de la tabla. */}
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between empty:hidden">
          <PestanasDeEstado
            etiqueta="Estado de las líneas del banco"
            valor={pestana}
            onCambio={cambiarPestana}
            pestanas={(Object.keys(TITULO_DE_LA_PESTANA) as EstadoDelMovimientoBancario[]).map((e) => ({
              valor: e,
              etiqueta: TITULO_DE_LA_PESTANA[e],
              // Conciliados no lleva número: el resumen sólo cuenta los de este mes.
              cuantos: !resumen || e === 'CONCILIADO' ? null : e === 'PENDIENTE' ? resumen.pendientes : resumen.ignorados,
              fija: true,
              testid: `pestana-${e}`,
            }))}
          />
          <div className="relative w-full lg:w-80">
            <MagnifyingGlass
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en esta página: nombre, referencia o valor"
              aria-label="Buscar en las líneas de esta página por nombre, referencia o valor"
              className="w-full pl-8"
              data-testid="buscar-movimientos"
            />
          </div>
        </div>
        {pestana === 'PENDIENTE' && (
          <p className="border-b border-border px-4 py-2.5 text-caption text-fg-muted" data-testid="cola-manual">
            Cola manual: lo que no calza exacto se concilia una por una. Lo que calza exacto se aprueba de una vez en el{' '}
            <a href="#lote-de-lo-exacto" className="text-fg underline underline-offset-2 hover:text-primary">
              lote, debajo de la lista
            </a>
            .
          </p>
        )}

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
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow>
                {COLUMNAS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody data-testid="movimientos" className="max-md:block">
              {sinFilas || sinCoincidencias ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={COLUMNAS.length} className="p-0 max-md:block">
                    {sinCoincidencias ? (
                      <SinDatos
                        queSon="movimientos"
                        icono={MagnifyingGlass}
                        titulo={`Ninguna línea de esta página dice «${busqueda.trim()}»`}
                        descripcion="La búsqueda mira las líneas de la página que estás viendo. Pasa de página o borra la búsqueda."
                        accion={
                          <Button size="sm" variant="secondary" hideArrow onClick={() => setBusqueda('')}>
                            Borrar la búsqueda
                          </Button>
                        }
                      />
                    ) : (
                      <SinDatos
                        queSon="movimientos"
                        icono={Bank}
                        titulo={vacioDeLaPestana.titulo}
                        descripcion={vacioDeLaPestana.descripcion}
                        /* Ronda 30 (revisora r27): «Cargar el extracto» ya es la acción del encabezado: una. */
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                visibles.map((m) => (
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
                    onConciliarElPar={(mov) => void conciliarElPar(mov)}
                    onIgnorar={(mov) => {
                      setIgnorando(mov);
                      setMotivo('');
                      setErrorDelMotivo(null);
                    }}
                    onReabrir={(mov) => void reabrir(mov)}
                    sinTablaDeVinculos={sinTablaDeVinculos}
                    onSinTablaDeVinculos={marcarSinTabla}
                    // Como al conciliar una fila: vuelve a leer la lista y los números.
                    onCambio={() => void cargar()}
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
      </SalidasDeLaPagina>

      {/* 🔴 Lo que calza exacto va en lote y se aprueba de una vez; la tabla
          de abajo es la cola manual. */}
      <div id="lote-de-lo-exacto" className="scroll-mt-24">
        <LoteDeLoQueCalzaExacto
          version={versionDelLote}
          onCambio={() => void cargar()}
        />
      </div>

      {/* C2-AGREGADOR: los giros de Leasefy por los pagos en línea (sólo si hay). */}
      <LiquidacionesDeLeasefy version={versionDelLote} />

      {/* D-CONCILIACION (Nico, P12): sólo si la inmobiliaria recibe efectivo (apagado por defecto). */}
      <PlanillaDeCaja puedeConciliar={puedeConciliar} version={versionDelLote} onCambio={() => void cargar()} />

      {/* D-CONCILIACION (Nico, P6): la relación de pagos de una aseguradora. */}
      <RelacionDeAseguradora puedeConciliar={puedeConciliar} onCambio={() => void cargar()} />

      {/* C2-SALIDAS: el giro que no salió o salió dos veces, y lo seguro de un golpe. */}
      <AvisosDeLasSalidas
        version={versionDelLote}
        puedeConciliar={puedeConciliar}
        onCambio={() => void cargar()}
      />

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
          {/* El aire lo da el cuerpo del modal: sin `px-6 py-4` propios. */}
          <div data-testid="conciliar-con-cliente">
            <ElegirCliente value={clienteElegido} onChange={setClienteElegido} />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              disabled={conCliente ? ocupados.has(conCliente.id) : false}
              onClick={() => {
                setConCliente(null);
                setClienteElegido(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={!clienteElegido || !conCliente}
              isLoading={conCliente ? ocupados.has(conCliente.id) : false}
              onClick={() => void conciliarConCliente()}
              data-testid="confirmar-conciliar-cliente"
            >
              Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación: ignorar se puede deshacer (vuelve a pendientes). */}
      <Dialog open={ignorando !== null} onOpenChange={(abierto) => !abierto && setIgnorando(null)}>
        <DialogContent variant="confirm" icon={<EyeSlash weight="bold" />}>
          <DialogHeader>
            <DialogTitle>Ignorar este movimiento</DialogTitle>
            <DialogDescription>
              {ignorando ? `«${ignorando.descripcion}» del ${diaLegible(ignorando.fecha)}.` : ''} Queda escrito por
              qué no es un pago de canon; se puede volver a pendiente después.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-ignorar">Motivo</Label>
            <Textarea
              id="motivo-ignorar"
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorDelMotivo(null);
              }}
              placeholder="Es la nómina de la oficina, no un pago de canon."
              rows={3}
              maxLength={300}
              aria-invalid={errorDelMotivo ? true : undefined}
              aria-describedby={errorDelMotivo ? 'motivo-ignorar-error' : undefined}
            />
            <ErrorDelCampo
              id="motivo-ignorar-error"
              mensaje={errorDelMotivo}
              pista="Entre 5 y 300 caracteres."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              hideArrow
              disabled={ignorando ? ocupados.has(ignorando.id) : false}
              onClick={() => setIgnorando(null)}
            >
              Cancelar
            </Button>
            <Button
              hideArrow
              disabled={motivo.trim().length < 5 || !ignorando}
              isLoading={ignorando ? ocupados.has(ignorando.id) : false}
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

/**
 * Las cuentas de la inmobiliaria, o `null` si el back no las puede dar (uno de
 * antes de la Fase 1, o una falla): la pantalla sigue como antes, sin filtro.
 */
async function leerLasCuentas(): Promise<CuentasDeLaConciliacion | null> {
  try {
    return await conciliacionBancariaApi.cuentas();
  } catch {
    return null;
  }
}
