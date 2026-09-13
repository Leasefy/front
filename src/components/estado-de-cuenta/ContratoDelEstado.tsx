'use client';

/**
 * Un contrato dentro del estado de cuenta: su encabezado, sus dos secciones
 * (Arriendos y Otros conceptos) y sus totales.
 *
 * ── Qué NO se copia de Nui ──────────────────────────────────────────────────
 * 1. La banda azul del encabezado es una regla con el número en mono. El color
 *    se gasta una sola vez por contrato, en el punto de quiebre.
 * 2. El período se lee UNA vez. Nui repite «Canon De Arrendamiento con IVA. De
 *    22-May-2024 hasta 21-Jun-2024» en cada renglón; acá el concepto es el
 *    título de la fila y el rango va debajo, en mono.
 * 3. Las columnas de impuestos aparecen si existen (`columnasDeImpuestos`).
 *    Cuatro columnas de `$0.00` empujan el concepto a dos renglones y el
 *    documento a una hoja más. El pie dice cuáles se omitieron: omitir en
 *    silencio sí sería esconder un dato.
 * 4. Que una cuota pendiente ya esté vencida se dice con la PALABRA «vencida»
 *    en la columna «Vence», no cambiándole el color a la píldora: dos píldoras
 *    que dicen «Pendiente» y sólo se distinguen por el tono no se distinguen.
 *
 * En móvil la tabla se vuelve tarjetas. Once columnas en 390 px no son una
 * tabla, son un scroll horizontal que nadie recorre.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import {
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination';
import type {
  ContratoDelEstadoDeCuenta,
  FilaDelEstadoDeCuenta,
  PuntoDeQuiebre,
  RolEnElContrato,
} from '@/lib/types/estado-de-cuenta';
import {
  columnasDeImpuestos,
  columnasOmitidas,
  conceptoLimpio,
  cuantasFilas,
  estaVencida,
  ETIQUETA_DE_COLUMNA,
  fechaLegible,
  intercalarCortes,
  periodoLegible,
  pintaDelEstado,
  type ColumnaDeImpuesto,
  type RenglonDelContrato,
} from './filas';
import { AmortizacionDelContrato } from './ResumenDelEstado';
import { useTextoDelEstado } from './textos';

/** Más de esto y la sección se pagina. Debajo, el contrato se lee de corrido. */
export const FILAS_SIN_PAGINAR = 24;

interface Props {
  contrato: ContratoDelEstadoDeCuenta;
  /** `YYYY-MM-DD` local: contra esto se decide si una cuota ya venció. */
  hoy: string;
  /**
   * Apaga la paginación. Se prende al imprimir: si no, la hoja sale con las
   * diez filas de la página en la que quedó la pantalla y el total no cuadra
   * con lo impreso.
   */
  sinPaginar?: boolean;
}

export function ContratoDelEstado({ contrato, hoy, sinPaginar = false }: Props) {
  const t = useTextoDelEstado();
  const esPropietario = contrato.rol === 'PROPIETARIO';

  const columnas = React.useMemo(
    () =>
      columnasDeImpuestos([
        ...contrato.secciones.arriendos,
        ...contrato.secciones.otrosConceptos,
      ]),
    [contrato],
  );
  const omitidas = React.useMemo(
    () =>
      columnasOmitidas(
        [...contrato.secciones.arriendos, ...contrato.secciones.otrosConceptos],
        esPropietario,
      ),
    [contrato, esPropietario],
  );

  const paginar = !sinPaginar && cuantasFilas(contrato) > FILAS_SIN_PAGINAR;

  return (
    <section
      data-contrato={contrato.numero}
      data-testid={`contrato-${contrato.numero}`}
      className="estado-contrato space-y-5 break-inside-avoid"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
        <div className="min-w-0">
          <h3 className="font-mono text-base font-medium tabular-nums text-fg">
            {t('estadoDeCuenta.contrato', { numero: contrato.numero })}
          </h3>
          <p className="mt-0.5 text-body-sm text-fg-muted">
            {t(
              esPropietario
                ? 'estadoDeCuenta.comoPropietario'
                : 'estadoDeCuenta.comoInquilino',
              { direccion: contrato.inmueble.direccion },
            )}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-caption',
            contrato.vigente
              ? 'bg-success-soft text-success'
              : 'bg-surface-muted text-fg-subtle',
          )}
        >
          {t(contrato.vigente ? 'estadoDeCuenta.vigente' : 'estadoDeCuenta.terminado')}
        </span>
      </div>

      {/* «Funciona como una tabla de amortización» (CEO). La barra dice en una
          línea lo que la tabla dice en cuarenta filas: cuánto del contrato ya
          se pagó. */}
      <AmortizacionDelContrato contrato={contrato} />

      <SeccionDeFilas
        titulo={t('estadoDeCuenta.arriendos')}
        filas={contrato.secciones.arriendos}
        cortes={contrato.cortes}
        columnas={columnas}
        hoy={hoy}
        rol={contrato.rol}
        paginar={paginar}
        vacio={t('estadoDeCuenta.sinArriendos')}
        testid={`arriendos-${contrato.numero}`}
      />

      <SeccionDeFilas
        titulo={t('estadoDeCuenta.otrosConceptos')}
        filas={contrato.secciones.otrosConceptos}
        cortes={[]}
        columnas={columnas}
        hoy={hoy}
        rol={contrato.rol}
        paginar={false}
        vacio={t('estadoDeCuenta.sinOtrosConceptos')}
        testid={`otros-${contrato.numero}`}
      />

      {omitidas.length > 0 && (
        <p className="text-caption text-fg-subtle">
          {t('estadoDeCuenta.columnasOmitidas', {
            columnas: omitidas.map((c) => ETIQUETA_DE_COLUMNA[c]).join(', '),
          })}
        </p>
      )}

      <div className="flex flex-wrap items-end justify-end gap-x-8 gap-y-2 border-t border-border pt-3">
        <Cifra
          etiqueta={t('estadoDeCuenta.cancelado')}
          valor={contrato.totales.cancelado}
          tono="apagado"
        />
        <Cifra
          etiqueta={t('estadoDeCuenta.restaPorPagar')}
          valor={contrato.totales.restaPorPagar}
          tono={contrato.totales.restaPorPagar > 0 ? 'fuerte' : 'apagado'}
          testid={`total-contrato-${contrato.numero}`}
        />
      </div>
    </section>
  );
}

function Cifra({
  etiqueta,
  valor,
  tono,
  testid,
}: {
  etiqueta: string;
  valor: number;
  tono: 'apagado' | 'fuerte';
  testid?: string;
}) {
  return (
    <div className="text-right">
      <p className="text-label uppercase tracking-wide text-fg-subtle">{etiqueta}</p>
      <p
        data-testid={testid}
        className={cn(
          'font-mono tabular-nums',
          tono === 'fuerte' ? 'text-lg font-medium text-fg' : 'text-body text-fg-muted',
        )}
      >
        {formatCurrency(valor)}
      </p>
    </div>
  );
}

interface SeccionProps {
  titulo: string;
  filas: FilaDelEstadoDeCuenta[];
  cortes: readonly PuntoDeQuiebre[];
  columnas: ColumnaDeImpuesto[];
  hoy: string;
  rol: RolEnElContrato;
  paginar: boolean;
  vacio: string;
  testid: string;
}

function SeccionDeFilas({
  titulo,
  filas,
  cortes,
  columnas,
  hoy,
  rol,
  paginar,
  vacio,
  testid,
}: SeccionProps) {
  const t = useTextoDelEstado();
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(filas, {
      initialPageSize: PAGE_SIZE_OPTIONS[1] ?? 25,
      resetKey: `${testid}|${filas.length}`,
    });

  const visibles = paginar ? pageItems : filas;
  const renglones = React.useMemo(
    () => intercalarCortes(visibles, cortes),
    [visibles, cortes],
  );

  return (
    <div data-testid={testid} className="space-y-2">
      <h4 className="text-label uppercase tracking-wide text-fg-subtle">{titulo}</h4>

      {filas.length === 0 ? (
        <p className="py-3 text-body-sm text-fg-muted">{vacio}</p>
      ) : (
        <>
          {/* Escritorio: la tabla. `md:` y no `sm:` porque con las columnas de
              impuestos puestas la tabla no entra cómoda en una tablet chica.

              🔴 `data-tabla` / `data-tarjetas` no son de estilo: el CSS de
              impresión los usa para forzar la tabla y esconder las tarjetas.
              Las clases `md:` responden al ANCHO DE LA HOJA, y una A4 en
              horizontal a 96 dpi mide ~1123 px pero el navegador la reporta
              según el zoom: sin esto, imprimir desde un portátil chico sacaba
              las tarjetas del móvil en el papel. */}
          <div data-tabla className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">
                    {t('estadoDeCuenta.colConcepto')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colEstado')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colPagado')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colBruto')}
                  </TableHead>
                  {columnas.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap text-right">
                      {ETIQUETA_DE_COLUMNA[c]}
                    </TableHead>
                  ))}
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colNeto')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colVence')}
                  </TableHead>
                  <TableHead className="min-w-[180px]">
                    {t('estadoDeCuenta.colDocumento')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renglones.map((r) =>
                  r.tipo === 'corte' ? (
                    <TableRow key={r.clave} className="hover:bg-transparent">
                      <TableCell colSpan={6 + columnas.length} className="py-2">
                        <LineaDeQuiebre corte={r.corte} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <FilaDeLaTabla
                      key={r.clave}
                      fila={r.fila}
                      columnas={columnas}
                      hoy={hoy}
                      rol={rol}
                    />
                  ),
                )}
              </TableBody>
            </Table>
          </div>

          {/* Móvil: una tarjeta por fila. Sin scroll horizontal. */}
          <ul data-tarjetas className="space-y-2 md:hidden">
            {renglones.map((r) =>
              r.tipo === 'corte' ? (
                <li key={r.clave}>
                  <LineaDeQuiebre corte={r.corte} />
                </li>
              ) : (
                <li key={r.clave}>
                  <TarjetaDeFila
                    fila={r.fila}
                    columnas={columnas}
                    hoy={hoy}
                    rol={rol}
                  />
                </li>
              ),
            )}
          </ul>

          {paginar && shouldPaginate && (
            <div className="print:hidden">
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
        </>
      )}
    </div>
  );
}

/**
 * El punto de quiebre: la única línea con color adentro del contrato.
 *
 * Es el único lugar del documento que cuenta una SECUENCIA («hasta acá le pagué
 * a X, desde acá a Y»), y por eso es el único que lleva marcador. CEO: «Con eso
 * le digo a la DIAN cuánto le he pagado a cada propietario desde 2022.»
 */
function LineaDeQuiebre({ corte }: { corte: PuntoDeQuiebre }) {
  const t = useTextoDelEstado();
  return (
    <div
      data-testid={`quiebre-${corte.fecha}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border-l-2 border-primary bg-primary-soft px-3 py-1.5"
    >
      <span className="font-mono text-caption tabular-nums text-primary">
        {t('estadoDeCuenta.quiebre', {
          motivo: corte.motivo,
          fecha: fechaLegible(corte.fecha),
        })}
      </span>
      <span className="text-caption text-fg-muted">
        {t('estadoDeCuenta.quiebreDeA', {
          anterior: corte.parteAnterior,
          nueva: corte.parteNueva,
        })}
      </span>
    </div>
  );
}

function Concepto({ fila }: { fila: FilaDelEstadoDeCuenta }) {
  const t = useTextoDelEstado();
  const periodo = periodoLegible(fila);
  const nombre = conceptoLimpio(fila);
  /*
   * El rótulo sólo si el concepto NO lo trae ya. El back manda «Saldo pendiente
   * por Canon De Arrendamiento…» tal cual lo escribe Nui, así que anteponerle
   * «Saldo pendiente ·» lo decía dos veces en la misma línea.
   */
  const rotula = fila.parcial && !/^saldo\s+pendiente/i.test(nombre);
  return (
    <>
      <p className="text-body-sm text-fg">
        {rotula && (
          <span className="text-fg-muted">{t('estadoDeCuenta.saldoDe')} · </span>
        )}
        {nombre}
      </p>
      {periodo && (
        <p className="mt-0.5 font-mono text-caption tabular-nums text-fg-subtle">
          {periodo}
        </p>
      )}
    </>
  );
}

function Pildora({
  fila,
  rol,
}: {
  fila: FilaDelEstadoDeCuenta;
  rol: RolEnElContrato;
}) {
  // «Cancelada» al inquilino, «Pagada» al propietario: mismo estado, distinta
  // palabra, como en los dos PDF de Nui.
  const pinta = pintaDelEstado(fila.estado, rol);
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption',
        pinta.clase,
      )}
    >
      {pinta.texto}
    </span>
  );
}

function Vence({ fila, hoy }: { fila: FilaDelEstadoDeCuenta; hoy: string }) {
  const t = useTextoDelEstado();
  const vencida = estaVencida(fila, hoy);
  return (
    <span className="whitespace-nowrap font-mono text-caption tabular-nums">
      {fechaLegible(fila.fechaVencimiento)}
      {vencida && (
        <span className="ml-1 font-sans text-danger">{t('estadoDeCuenta.vencida')}</span>
      )}
    </span>
  );
}

function Documento({ fila }: { fila: FilaDelEstadoDeCuenta }) {
  const t = useTextoDelEstado();
  if (!fila.documentoDePago) {
    return <span className="text-caption text-fg-subtle">{t('estadoDeCuenta.sinPago')}</span>;
  }
  const doc = fila.documentoDePago;
  return (
    <>
      <p className="font-mono text-caption tabular-nums text-fg">
        {doc.numero} · {doc.tipo}
      </p>
      <p className="text-caption text-fg-muted">{doc.descripcion}</p>
    </>
  );
}

function FilaDeLaTabla({
  fila,
  columnas,
  hoy,
  rol,
}: {
  fila: FilaDelEstadoDeCuenta;
  columnas: ColumnaDeImpuesto[];
  hoy: string;
  rol: RolEnElContrato;
}) {
  const anulada = fila.estado === 'ANULADA' || fila.estado === 'ANTERIOR';
  return (
    <TableRow className={anulada ? 'text-fg-subtle' : undefined}>
      <TableCell className="max-w-[320px] align-top">
        <Concepto fila={fila} />
      </TableCell>
      <TableCell className="align-top">
        <Pildora fila={fila} rol={rol} />
      </TableCell>
      <TableCell className="whitespace-nowrap align-top font-mono text-caption tabular-nums">
        {fila.fechaDePago ? fechaLegible(fila.fechaDePago) : '—'}
      </TableCell>
      <TableCell className="whitespace-nowrap text-right align-top font-mono tabular-nums">
        {formatCurrency(fila.valorBruto)}
      </TableCell>
      {columnas.map((c) => (
        <TableCell
          key={c}
          className="whitespace-nowrap text-right align-top font-mono text-caption tabular-nums text-fg-muted"
        >
          {formatCurrency(fila[c] ?? 0)}
        </TableCell>
      ))}
      <TableCell className="whitespace-nowrap text-right align-top font-mono font-medium tabular-nums">
        {formatCurrency(fila.valorNeto)}
      </TableCell>
      <TableCell className="align-top">
        <Vence fila={fila} hoy={hoy} />
      </TableCell>
      <TableCell className="max-w-[240px] align-top">
        <Documento fila={fila} />
      </TableCell>
    </TableRow>
  );
}

function TarjetaDeFila({
  fila,
  columnas,
  hoy,
  rol,
}: {
  fila: FilaDelEstadoDeCuenta;
  columnas: ColumnaDeImpuesto[];
  hoy: string;
  rol: RolEnElContrato;
}) {
  const t = useTextoDelEstado();
  return (
    <div className="rounded-sm border border-border-faint bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Concepto fila={fila} />
        </div>
        <Pildora fila={fila} rol={rol} />
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-label uppercase tracking-wide text-fg-subtle">
          {t('estadoDeCuenta.colNeto')}
        </span>
        <span className="font-mono text-base font-medium tabular-nums text-fg">
          {formatCurrency(fila.valorNeto)}
        </span>
      </div>

      <dl className="mt-2 space-y-0.5 border-t border-border-faint pt-2 text-caption">
        <Dato etiqueta={t('estadoDeCuenta.colBruto')}>
          <span className="font-mono tabular-nums">{formatCurrency(fila.valorBruto)}</span>
        </Dato>
        {columnas.map((c) => (
          <Dato key={c} etiqueta={ETIQUETA_DE_COLUMNA[c]}>
            <span className="font-mono tabular-nums">{formatCurrency(fila[c] ?? 0)}</span>
          </Dato>
        ))}
        <Dato etiqueta={t('estadoDeCuenta.colVence')}>
          <Vence fila={fila} hoy={hoy} />
        </Dato>
        {fila.fechaDePago && (
          <Dato etiqueta={t('estadoDeCuenta.colPagado')}>
            <span className="font-mono tabular-nums">{fechaLegible(fila.fechaDePago)}</span>
          </Dato>
        )}
      </dl>

      <div className="mt-2 border-t border-border-faint pt-2">
        <Documento fila={fila} />
      </div>
    </div>
  );
}

function Dato({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{etiqueta}</dt>
      <dd className="text-fg">{children}</dd>
    </div>
  );
}
