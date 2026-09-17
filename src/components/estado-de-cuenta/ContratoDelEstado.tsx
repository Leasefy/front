'use client';

/**
 * Un contrato dentro del estado de cuenta: su encabezado, la barra de
 * amortización, sus dos secciones (Arriendos y Otros conceptos) y su pie de
 * totales.
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
 * ── Lo que cambió con el glow-up (Nico, 2026-09-13) ─────────────────────────
 * 5. Las columnas van en el orden en que se LEE una cuota: qué es, cuándo
 *    vence, en qué está, cuánto es, con qué se pagó. Antes «Estado» y «Fecha de
 *    pago» iban entre el concepto y el valor y los ojos saltaban de ida y vuelta.
 * 6. «Fecha de pago» y «Documento de pago» eran DOS columnas que en una cuota
 *    sin pagar decían lo mismo dos veces («—» y «Sin pago»). Ahora es UNA
 *    columna, «Pago»: la fecha y el recibo cuando lo hay, un guion cuando no.
 * 7. La paginación entra a las 15 filas, de a 12 —el año de un contrato en una
 *    página—, y no a las 24 de a 25.
 *
 * En móvil la tabla se vuelve tarjetas. Once columnas en 390 px no son una
 * tabla, son un scroll horizontal que nadie recorre.
 *
 * ── Los intereses de mora (2026-09-16) ──────────────────────────────────────
 * 8. Van en su PROPIA sección, después de Otros conceptos, y en el pie del
 *    contrato suman aparte: «Resta por pagar» sigue siendo capital, y al lado
 *    van «Intereses de mora» y «Total con intereses». El número sale del back,
 *    con la misma regla que la prefactura y la cartera.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { numeroDelContratoDelEstado } from './numero';
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
import { useTablePagination } from '@/lib/hooks/use-table-pagination';
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
} from './filas';
import { AmortizacionDelContrato } from './ResumenDelEstado';
import { useTextoDelEstado } from './textos';
import { InteresesDelContratoSeccion } from './InteresesDelContrato';
import { hayQueContarIntereses, interesesDelContrato } from './intereses';

/** Más de esto y la sección se pagina. Debajo, el contrato se lee de corrido. */
export const FILAS_SIN_PAGINAR = 15;
/** De a cuántas filas se pagina: el año de un contrato en una página. */
export const FILAS_POR_PAGINA = 12;
const TAMANOS_DE_PAGINA = [12, 24, 48];

interface Props {
  contrato: ContratoDelEstadoDeCuenta;
  /** `YYYY-MM-DD` local: contra esto se decide si una cuota ya venció. */
  hoy: string;
  /**
   * Apaga la paginación. Se prende al imprimir: si no, la hoja sale con las
   * doce filas de la página en la que quedó la pantalla y el total no cuadra
   * con lo impreso.
   */
  sinPaginar?: boolean;
  /**
   * A dónde se configuran las reglas de mora. Sólo el panel lo pasa: el
   * motivo de «cuotas en mora sin intereses» habla de la configuración de la
   * inmobiliaria y no se le muestra al cliente.
   */
  reglasDeMoraHref?: string;
}

export function ContratoDelEstado({
  contrato,
  hoy,
  sinPaginar = false,
  reglasDeMoraHref,
}: Props) {
  const t = useTextoDelEstado();
  const esPropietario = contrato.rol === 'PROPIETARIO';
  const intereses = interesesDelContrato(contrato);
  const conIntereses = Boolean(intereses && intereses.filas.length > 0);

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
  const numero = numeroDelContratoDelEstado(contrato);

  return (
    <section
      data-contrato={contrato.numero}
      data-testid={`contrato-${contrato.numero}`}
      className="estado-contrato space-y-5 break-inside-avoid"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
        <div className="min-w-0">
          {/* El número que el cliente conoce: «Contrato 1686». Sin el de Leasefy (16-09). */}
          <h3 className="text-subtitle text-fg">
            {t('estadoDeCuenta.contratoPalabra')}{' '}
            <span className="font-mono tabular-nums">{numero.principal}</span>
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
            'shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium',
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

      {hayQueContarIntereses(intereses) && (
        <InteresesDelContratoSeccion
          intereses={intereses}
          numero={contrato.numero}
          reglasDeMoraHref={reglasDeMoraHref}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-md bg-surface-muted px-4 py-3">
        <p className="text-label uppercase tracking-wide text-fg-subtle">
          {t('estadoDeCuenta.totalDelContrato')}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <Cifra
            etiqueta={t('estadoDeCuenta.cancelado')}
            valor={contrato.totales.cancelado}
            tono="apagado"
          />
          <Cifra
            etiqueta={t('estadoDeCuenta.restaPorPagar')}
            valor={contrato.totales.restaPorPagar}
            tono={
              contrato.totales.restaPorPagar > 0 && !conIntereses
                ? 'fuerte'
                : 'apagado'
            }
            testid={`total-contrato-${contrato.numero}`}
          />
          {/* Capital e interés por separado, y el total que suma los dos. */}
          {conIntereses && intereses && (
            <>
              <Cifra
                etiqueta={t('estadoDeCuenta.interesesDeMora')}
                valor={intereses.pendiente}
                tono="apagado"
                testid={`intereses-contrato-${contrato.numero}`}
              />
              <Cifra
                etiqueta={t('estadoDeCuenta.conIntereses')}
                valor={intereses.restaPorPagarConIntereses}
                tono="fuerte"
                testid={`total-con-intereses-${contrato.numero}`}
              />
            </>
          )}
        </div>
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
      initialPageSize: FILAS_POR_PAGINA,
      resetKey: `${testid}|${filas.length}`,
    });

  const visibles = paginar ? pageItems : filas;
  const renglones = React.useMemo(
    () => intercalarCortes(visibles, cortes),
    [visibles, cortes],
  );

  return (
    <div data-testid={testid} className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-label uppercase tracking-wide text-fg-subtle">{titulo}</h4>
        {filas.length > 0 && (
          <span className="font-mono text-caption tabular-nums text-fg-subtle">
            {filas.length === 1
              ? t('estadoDeCuenta.unaFila')
              : t('estadoDeCuenta.nFilas', { n: filas.length })}
          </span>
        )}
      </div>

      {filas.length === 0 ? (
        <p className="py-2 text-body-sm text-fg-muted">{vacio}</p>
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
          <div
            data-tabla
            className="hidden overflow-x-auto rounded-md border border-border-faint md:block"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px]">
                    {t('estadoDeCuenta.colConcepto')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colVence')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colEstado')}
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
                  <TableHead className="min-w-[150px]">
                    {t('estadoDeCuenta.colPago')}
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
                pageSizeOptions={TAMANOS_DE_PAGINA}
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
    <span
      className={cn(
        'whitespace-nowrap font-mono text-caption tabular-nums',
        vencida && 'text-danger',
      )}
    >
      {fechaLegible(fila.fechaVencimiento)}
      {vencida && (
        <span className="ml-1 font-sans">{t('estadoDeCuenta.vencida')}</span>
      )}
    </span>
  );
}

/**
 * Con qué se pagó la fila: la fecha y el comprobante. Un guion cuando no hay
 * pago: «Sin pago» al lado de un «—» en otra columna decía lo mismo dos veces.
 */
function Pago({ fila }: { fila: FilaDelEstadoDeCuenta }) {
  const doc = fila.documentoDePago;
  if (!doc && !fila.fechaDePago) {
    return <span className="text-caption text-fg-subtle">—</span>;
  }
  return (
    <>
      {fila.fechaDePago && (
        <p className="font-mono text-caption tabular-nums text-fg">
          {fechaLegible(fila.fechaDePago)}
        </p>
      )}
      {doc && (
        <p
          className="font-mono text-caption tabular-nums text-fg-muted"
          title={doc.descripcion || undefined}
        >
          {doc.numero} · {doc.tipo}
        </p>
      )}
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
  const apagada = fila.estado === 'ANULADA' || fila.estado === 'ANTERIOR';
  return (
    <TableRow className={apagada ? 'text-fg-subtle' : undefined}>
      <TableCell className="max-w-[320px] align-top">
        <Concepto fila={fila} />
      </TableCell>
      <TableCell className="align-top">
        <Vence fila={fila} hoy={hoy} />
      </TableCell>
      <TableCell className="align-top">
        <Pildora fila={fila} rol={rol} />
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
      <TableCell className="max-w-[220px] align-top">
        <Pago fila={fila} />
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
    <div className="rounded-md border border-border-faint bg-surface p-3">
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
        <Dato etiqueta={t('estadoDeCuenta.colVence')}>
          <Vence fila={fila} hoy={hoy} />
        </Dato>
        <Dato etiqueta={t('estadoDeCuenta.colBruto')}>
          <span className="font-mono tabular-nums">{formatCurrency(fila.valorBruto)}</span>
        </Dato>
        {columnas.map((c) => (
          <Dato key={c} etiqueta={ETIQUETA_DE_COLUMNA[c]}>
            <span className="font-mono tabular-nums">{formatCurrency(fila[c] ?? 0)}</span>
          </Dato>
        ))}
        <Dato etiqueta={t('estadoDeCuenta.colPago')}>
          <span className="text-right">
            <Pago fila={fila} />
          </span>
        </Dato>
      </dl>
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
