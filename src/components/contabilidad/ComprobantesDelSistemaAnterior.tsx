'use client'

/**
 * Los comprobantes de la contabilidad vieja, en tres pestañas: ingresos ·
 * egresos · facturas. Vive en la ficha del contrato y en la del inmueble.
 *
 * ── Qué son y por qué viven acá ────────────────────────────────────────────
 *
 * Cuando una inmobiliaria migra, sube el export de comprobantes de su sistema
 * contable («Accounting Documents.csv»: 116.469 filas en el archivo real).
 * Esos comprobantes son ENCABEZADOS —prefijo, consecutivo, tipo, fecha,
 * concepto y los totales de débitos y créditos—, **sin las líneas por cuenta**,
 * así que no entran al libro diario: un asiento sin líneas no se puede imputar
 * ni cuadrar. Viven en `documentos_contables_migrados` y el back los cuelga del
 * contrato del tercero que nombra el concepto («… REF 901780503», «EGRESO POR
 * PAGO A …»), y del inmueble de ese contrato.
 *
 * Sin esta sección, esa historia existe en la base y no se ve en ninguna
 * pantalla: la plata que esa persona pagó durante seis años queda cargada y
 * muda. Acá es donde alguien la consulta, que es la única razón por la que se
 * migró.
 *
 * ── Las pestañas (Nico, 2026-09-12 y 2026-09-13) ───────────────────────────
 *
 * «Tres pestañas: comprobantes de ingreso · comprobantes de egreso · facturas
 * generadas. Hoy es una sola lista mezclada.» Y al día siguiente, mirando la
 * tarjeta ya con las tres: «Ingresos, egresos y facturas debería ser un
 * switch tab, y esa tabla que contiene toda esa información debería tener
 * paginación.»
 *
 * El «switch tab» es el `SegmentedControl` del design system — el mismo
 * control de «Vista Kanban | Vista Lista» en Mantenimientos
 * (`app/panel/inmobiliaria/mantenimientos/page.tsx`). Antes eran `Tabs`
 * subrayadas, que se leen como navegación de página y no como un selector de
 * qué mirar dentro de una tarjeta; acá no se cambia de sección, se cambia el
 * filtro de UNA tabla, y eso es exactamente lo que dibuja un segmentado.
 *
 * La pestaña de cada comprobante la decide el BACK sobre el texto del tipo, y
 * el número de cada pestaña viene del back, no de contar filas: con el tope
 * de 500 de por medio, contar lo visible diría 500 para siempre. «Otros» es
 * la cuarta que Nico no pidió: aparece sólo cuando hay comprobantes que no
 * son ninguna de las tres (notas crédito, gastos causados, nómina…), porque
 * esconderlos sería que la suma de las pestañas no dé el total.
 *
 * Cada pestaña se pide por separado (`?clase=`) y se guarda: el tope de 500
 * es POR pestaña, así que un contrato con 600 ingresos y 30 facturas muestra
 * las 30 facturas completas en vez de perderlas detrás de los ingresos. Una
 * pestaña que el back contó en cero no se pide: ya se sabe que está vacía.
 *
 * ── El tope, y por qué se dice ─────────────────────────────────────────────
 *
 * El back devuelve los más recientes hasta `tope` (500) y además cuántos hay
 * en `total`. Dibujar 500 filas sin decir que había 1.842 es afirmar que ésas
 * son todas — el mismo error que este producto persigue en la migración. Por
 * eso el aviso sale del dato del back (`total > mostrados`) y no de contar
 * filas.
 *
 * ── La paginación, y por qué es en el cliente ──────────────────────────────
 *
 * `useTablePagination` + `TablePagination`, el patrón de las demás tablas del
 * panel: 10 filas por página, y el pie dice «Mostrando 1–10 de 18».
 *
 * Es paginación EN EL CLIENTE sobre lo que ya trajo la pestaña, no un
 * `?page=` nuevo en el back. Lo que llega está acotado por el tope de 500 por
 * pestaña —o sea, el peor caso son 500 filas en memoria, no 116.469—, y
 * cuando ese tope se alcanza la pantalla lo dice con los dos números. Con esas
 * dos cosas ciertas, un endpoint paginado sólo agregaría un viaje por página
 * sin cambiar lo que ve nadie. Si algún día el tope sube, esto tiene que
 * pasar al servidor.
 *
 * Dos números que NO son el mismo y conviven a propósito: el de la pestaña es
 * el total REAL del back (1.842), el del pie es cuántas filas hay para pasar
 * acá (500). El aviso de recorte es el puente entre los dos.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Receipt } from '@phosphor-icons/react'
import { SegmentedControl } from '@leasefy/cadence'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SUPERFICIE_DE_LA_FICHA } from '@/components/pantalla/TarjetaDeLaFicha'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/pagination'
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
} from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  CLASES_DE_COMPROBANTE,
  COMO_SE_ASOCIO,
  contabilidadApi,
  type ClaseDeComprobante,
  type ConteoPorClase,
  type DocumentoMigradoVista,
  type HistoriaDeComprobantes,
} from '@/lib/api/contabilidad.service'
import { diaLegible } from '@/lib/contabilidad/fechas'
import { formatCurrency } from '@/lib/format'
import { localeDeLasCifras } from '@/lib/i18n/idioma-de-las-cifras'

/**
 * De qué cosa son los comprobantes: de un contrato o de un inmueble. Uno de
 * los dos, nunca los dos — el back tiene una puerta para cada uno.
 */
type Vinculo =
  | { contractId: string; propertyId?: never }
  | { propertyId: string; contractId?: never }

type Props = Vinculo & {
  /** En la ficha del inmueble: sin comprobantes migrados, la sección no se pinta. */
  ocultarSinComprobantes?: boolean
}

/** El orden de las pestañas es el de Nico; «Otros» va al final y sólo si hay. */
const PESTANAS: { clase: ClaseDeComprobante; etiqueta: string; vacio: string }[] = [
  {
    clase: 'ingreso',
    etiqueta: 'Ingresos',
    vacio: 'No hay comprobantes de ingreso del sistema anterior aquí.',
  },
  {
    clase: 'egreso',
    etiqueta: 'Egresos',
    vacio: 'No hay comprobantes de egreso del sistema anterior aquí.',
  },
  {
    clase: 'factura',
    etiqueta: 'Facturas',
    // Medido en la base real el 2026-09-12: las 56.492 facturas del export de
    // Nico traen el concepto «Factura 57521» —el número de la factura y nada
    // más—, sin nombre ni documento del cliente, así que NINGUNA quedó colgada
    // de un contrato. Decir sólo «no hay» dejaría a alguien buscando un error
    // que no está acá; el arreglo es pedirle al sistema viejo el export con la
    // columna del cliente, y eso es lo que dice el vacío.
    vacio:
      'No hay facturas del sistema anterior aquí. Una factura aparece cuando su concepto nombra al inquilino o al propietario; si el archivo las trae como «Factura 57521», sin cliente, hay que pedirlo de nuevo con la columna del cliente.',
  },
  {
    clase: 'otro',
    etiqueta: 'Otros',
    vacio: 'Nada fuera de ingresos, egresos y facturas.',
  },
]

const SIN_NADA: ConteoPorClase = { ingreso: 0, egreso: 0, factura: 0, otro: 0 }

/** Lo que se sabe de una pestaña: lo que vino, o por qué no vino todavía. */
interface EstadoDePestana {
  historia?: HistoriaDeComprobantes
  error?: unknown
  pidiendo?: boolean
}

/**
 * El vínculo es fijo para la vida del componente: las dos fichas que lo usan
 * enrutan por id, así que otro contrato u otro inmueble es otra página, no
 * otras props. Por eso no hay «reset al cambiar de vínculo».
 */
export function ComprobantesDelSistemaAnterior(props: Props) {
  const { contractId, propertyId } = props
  const queEs = contractId ? 'este contrato' : 'este inmueble'

  const [clase, setClase] = useState<ClaseDeComprobante>('ingreso')
  /** Por pestaña, para que un cambio de pestaña con otra en vuelo no mezcle estados. */
  const [pestanas, setPestanas] = useState<Partial<Record<ClaseDeComprobante, EstadoDePestana>>>({})
  /** Cuántos hay en cada pestaña. `null` hasta que el back conteste la primera vez. */
  const [conteos, setConteos] = useState<ConteoPorClase | null>(null)
  /** La primera respuesta elige en qué pestaña arrancar; las demás no. */
  const eligioPestana = useRef(false)

  const pedir = useCallback(
    async (cual: ClaseDeComprobante) => {
      setPestanas((antes) => ({ ...antes, [cual]: { pidiendo: true } }))
      try {
        const historia = contractId
          ? await contabilidadApi.migracion.documentos.porContrato(contractId, cual)
          : await contabilidadApi.migracion.documentos.porInmueble(propertyId as string, cual)
        setPestanas((antes) => ({ ...antes, [cual]: { historia } }))
        setConteos(historia.porClase)

        // Arrancar en una pestaña vacía cuando otra tiene 300 filas es abrir
        // la ficha sobre un «no hay nada» que no es verdad. Sólo la primera
        // vez: después manda la persona.
        if (!eligioPestana.current) {
          eligioPestana.current = true
          if (historia.porClase[cual] === 0) {
            const conAlgo = CLASES_DE_COMPROBANTE.find((c) => historia.porClase[c] > 0)
            if (conAlgo) setClase(conAlgo)
          }
        }
      } catch (e) {
        // Un fallo NO se pinta como «no tiene comprobantes»: son cosas
        // distintas, y la segunda es una afirmación que nadie verificó.
        setPestanas((antes) => ({ ...antes, [cual]: { error: e } }))
      }
    },
    [contractId, propertyId],
  )

  useEffect(() => {
    // Una pestaña que el back ya contó en cero no se pide: se sabe que está
    // vacía, y pedirla sería una petición que siempre vuelve vacía.
    if (conteos && conteos[clase] === 0) return
    const de = pestanas[clase]
    // Ya vino, está viniendo, o falló: un fallo se reintenta desde el botón,
    // no desde acá — desde acá sería un bucle contra un back caído.
    if (de?.historia || de?.pidiendo || de?.error) return
    void pedir(clase)
  }, [clase, conteos, pestanas, pedir])

  const reintentar = useCallback(() => pedir(clase), [pedir, clase])

  const de = pestanas[clase]
  const historia = de?.historia
  const enPantalla = conteos ?? SIN_NADA
  const totalGeneral = CLASES_DE_COMPROBANTE.reduce((suma, c) => suma + enPantalla[c], 0)
  const visibles = PESTANAS.filter((p) => p.clase !== 'otro' || enPantalla.otro > 0)
  const pestana = PESTANAS.find((p) => p.clase === clase) ?? PESTANAS[0]
  const documentos = historia?.documentos ?? []
  const recortado = Boolean(historia && historia.total > historia.mostrados)

  // `resetKey: clase` es lo que hace que cambiar de pestaña vuelva a la
  // página 1. Sin eso, mirar la página 4 de los egresos y saltar a Facturas
  // —que tiene 12— deja la tabla vacía sobre un resultado que sí tiene filas,
  // y se lee como «no hay facturas».
  const pagina = useTablePagination(documentos, { resetKey: clase })

  // 22-10 (revisión de la ficha): en la ficha del inmueble, sin comprobantes
  // migrados la sección no se pinta (era un vacío de 400 px en el Historial).
  if (props.ocultarSinComprobantes && conteos !== null && totalGeneral === 0) return null

  return (
    // 21-10 (revisión de la ficha): la superficie y el título de las demás secciones.
    <section
      className={cn(SUPERFICIE_DE_LA_FICHA, 'space-y-4 px-6 pb-6 pt-5')}
      data-testid="comprobantes-del-sistema-anterior"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Receipt className="h-[18px] w-[18px] text-fg-subtle" aria-hidden="true" />
          <h3 className="text-[17px] font-[460] tracking-[-0.01em] text-fg">
            Comprobantes del sistema anterior
          </h3>
        </div>
        {/* El total sale del back (la suma de las pestañas), no del largo de
            la lista: con el tope de por medio, contar las filas visibles
            diría 500 para siempre. */}
        {totalGeneral > 0 ? (
          <span
            className="font-mono text-[11px] uppercase tracking-[0.1em] tabular-nums text-fg-subtle"
            data-testid="comprobantes-total"
          >
            {totalGeneral.toLocaleString(localeDeLasCifras())}
          </span>
        ) : null}
      </div>

      {conteos === null ? (
        // Todavía no se sabe si hay algo: la primera carga, o un fallo antes
        // de saberlo. Sin pestañas, que pintarían cuatro ceros inventados.
        <EstadoDeDatos
          cargando={Boolean(de?.pidiendo)}
          error={de?.error ?? null}
          queEs={`los comprobantes de ${queEs}`}
          onReintentar={reintentar}
          esqueleto={<EsqueletoTabla columnas={5} filas={4} />}
        >
          {null}
        </EstadoDeDatos>
      ) : totalGeneral === 0 ? (
        <SinDatos
          queSon="comprobantes migrados"
          icono={Receipt}
          titulo="Todavía no hay comprobantes del sistema anterior"
          descripcion={`Aparecen aquí cuando subas los comprobantes del sistema anterior en Migración → Registros contables y el concepto nombre al inquilino o al propietario de ${contractId ? 'este contrato' : 'este inmueble'}.`}
          accion={
            <Button asChild variant="secondary" size="sm" hideArrow>
              <Link href="/panel/inmobiliaria/migracion/contables">Ir a Registros contables</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {/* El switch tab de Nico: el mismo `SegmentedControl` del DS que
              usa «Vista Kanban | Vista Lista» en Mantenimientos. El
              `data-testid` va en el contenido —el DS no pasa props sueltas a
              cada segmento—, así que para clickearlo se sube al `<button>`
              con `closest`. */}
          {/* Cuatro segmentos no entran en 400 px de ancho. El `TabsList` que
              había antes traía este scroll de fábrica en su shim; el
              `SegmentedControl` del DS es `inline-flex` a secas, así que el
              contenedor lo pone acá. Sin esto, en un teléfono «Otros» queda
              fuera de la pantalla y no hay forma de llegar a él. */}
          <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SegmentedControl<ClaseDeComprobante>
              aria-label="Ingresos, egresos y facturas"
              value={clase}
              onChange={setClase}
              options={visibles.map((p) => ({
                value: p.clase,
                ariaLabel: `${p.etiqueta}: ${enPantalla[p.clase].toLocaleString(localeDeLasCifras())}`,
                label: (
                  <span
                    className="flex items-center gap-1.5 whitespace-nowrap"
                    data-testid={`pestana-${p.clase}`}
                  >
                    {p.etiqueta}
                    {/* Cada pestaña dice cuántos hay, y el número es del
                        back: con el tope de 500 de por medio, contar las
                        filas que se ven diría 500 para siempre.

                        `opacity-60` y no una píldora con fondo: dentro de un
                        segmentado el segmento activo es blanco y los demás
                        dejan ver el riel gris, así que NINGÚN color de fondo
                        fijo se ve en los dos estados —el que contrasta contra
                        el blanco desaparece contra el gris—. Heredando el
                        color del segmento, el número queda siempre un paso
                        atrás del texto, activo o no, y en modo oscuro. */}
                    <span
                      className="tabular-nums opacity-60"
                      data-testid={`conteo-${p.clase}`}
                    >
                      {enPantalla[p.clase].toLocaleString(localeDeLasCifras())}
                    </span>
                  </span>
                ),
              }))}
            />
          </div>

          <div className="space-y-3">
            <EstadoDeDatos
              cargando={Boolean(de?.pidiendo)}
              error={de?.error ?? null}
              vacio={enPantalla[clase] === 0 || historia?.total === 0}
              queEs={`los ${pestana.etiqueta.toLowerCase()} de ${queEs}`}
              // 🔴 `reintentar` a secas y no `() => void reintentar()`: el
              // botón espera la promesa, y con `void` volvería a decir
              // «Intentar de nuevo» pasara lo que pasara.
              onReintentar={reintentar}
              esqueleto={<EsqueletoTabla columnas={5} filas={4} />}
              cuandoVacio={
                <SinDatos
                  queSon={pestana.etiqueta.toLowerCase()}
                  icono={Receipt}
                  titulo={`Sin ${pestana.etiqueta.toLowerCase()} del sistema anterior`}
                  descripcion={pestana.vacio}
                />
              }
            >
              <TablaDeComprobantes
                documentos={pagina.pageItems}
                conTipo={clase === 'otro'}
                pie={
                  pagina.shouldPaginate ? (
                    <div
                      className="border-t border-border px-4 py-3"
                      data-testid="comprobantes-paginacion"
                    >
                      <TablePagination
                        total={pagina.total}
                        page={pagina.page}
                        pageSize={pagina.pageSize}
                        pageSizeOptions={PAGE_SIZE_OPTIONS}
                        onPageChange={pagina.setPage}
                        onPageSizeChange={pagina.setPageSize}
                      />
                    </div>
                  ) : null
                }
              />
            </EstadoDeDatos>

            {recortado ? (
              <p className="text-caption text-fg-muted" data-testid="comprobantes-recortados">
                Se muestran los {historia!.mostrados.toLocaleString(localeDeLasCifras())} más recientes
                de {historia!.total.toLocaleString(localeDeLasCifras())} en esta pestaña. Los demás están
                guardados —no se perdió ninguno—, pero acá sólo caben estos.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
}

function TablaDeComprobantes({
  conTipo = true,
  documentos,
  pie,
}: {
  /** Sólo las filas de la página actual: el recorte lo hizo el paginador. */
  documentos: DocumentoMigradoVista[]
  /** El pie de paginación, dentro del mismo marco que la tabla. */
  pie?: ReactNode
  /**
   * La columna «Tipo». En Ingresos, Egresos o Facturas dice lo mismo en cada
   * fila («Comprobante de Ingreso» ×10, revisión 21-10): sólo va en «Otros»,
   * donde es lo único que dice qué es cada fila (nota crédito, nómina…).
   */
  conTipo?: boolean
}) {
  const formas = new Set(documentos.map((d) => d.asociadoPor));
  const comoSeAsociaronTodos =
    documentos.length > 1 && formas.size === 1 && documentos[0]!.asociadoPor !== 'ninguno' ? documentos[0]!.asociadoPor : null;
  return (
    <div className="overflow-hidden rounded-[16px] border border-border-faint bg-surface dark:border-border-strong dark:bg-bg">
      {/* Cómo quedaron colgados de este contrato, UNA vez si es igual para todos (revisión 21-10:
          «Asociado por el nombre del tercero» ×10). */}
      {comoSeAsociaronTodos ? (
        <p className="border-b border-border-faint px-4 py-2.5 text-caption text-fg-subtle dark:border-border-strong" data-testid="comprobantes-asociados-por">
          Todos asociados {COMO_SE_ASOCIO[comoSeAsociaronTodos] ?? comoSeAsociaronTodos}.
        </p>
      ) : null}
      {/* Bajo 768 cada comprobante es una tarjeta de dos renglones (número y monto; fecha y
          concepto): la tabla encogida dejaba el concepto de tres letras por renglón. */}
      <Table className="max-md:block">
        <TableHeader className="max-md:hidden">
          <TableRow>
            {conTipo ? <TableHead>Tipo</TableHead> : null}
            <TableHead>Número</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            {/* «Monto» es el total de DÉBITOS del comprobante. El archivo
                trae débitos y créditos por separado y en un comprobante
                cuadrado son el mismo número; cuando no cuadran, la fila lo
                dice en vez de elegir uno en silencio. */}
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((d) => (
            <TableRow
              key={d.id}
              data-testid="comprobante-migrado"
              className="max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3"
            >
              {conTipo ? (
                <TableCell className="whitespace-nowrap max-md:order-3 max-md:col-span-2 max-md:block max-md:p-0 max-md:text-caption">
                  {d.tipo || '—'}
                  {d.anulado ? <span className="ml-2 text-caption text-danger">anulado</span> : null}
                </TableCell>
              ) : null}
              {/* El prefijo puede venir vacío («FV-26766» vs «26766»), y el
                  consecutivo 0 es un consecutivo: `filter(Boolean)` lo
                  borraría. */}
              <TableCell className="whitespace-nowrap font-mono text-caption tabular-nums max-md:order-1 max-md:block max-md:p-0">
                {d.prefijo ? `${d.prefijo}-${d.consecutivo}` : String(d.consecutivo)}
                {!conTipo && d.anulado ? <span className="ml-2 font-sans text-caption text-danger">anulado</span> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap max-md:order-4 max-md:col-span-2 max-md:block max-md:p-0 max-md:text-caption max-md:text-fg-subtle">{diaLegible(d.fecha)}</TableCell>
              <TableCell className="max-w-[28rem] text-fg-muted max-md:order-5 max-md:col-span-2 max-md:block max-md:max-w-none max-md:p-0 max-md:text-caption">
                <span className="line-clamp-2">{d.concepto || '—'}</span>
                {d.esAnticipo ? (
                  <span className="block text-caption text-fg-subtle">
                    Anticipo
                    {d.anticipoAplicado ? ' aplicado' : ' sin aplicar'}
                    {d.terceroAnticipo ? ` · ${d.terceroAnticipo}` : ''}
                  </span>
                ) : null}
                {/* Por dónde quedó colgado de este contrato. Importa sobre todo
                    con las dos reglas del 2026-09-16 («CONTRATO N», «COD. N»):
                    quien lee la ficha puede comprobar que el concepto lo dice. */}
                {d.asociadoPor !== 'ninguno' && !comoSeAsociaronTodos ? (
                  <span
                    className="block text-caption text-fg-subtle"
                    data-testid="comprobante-asociado-por"
                  >
                    Asociado {COMO_SE_ASOCIO[d.asociadoPor] ?? d.asociadoPor}
                  </span>
                ) : null}
                {d.datos ? <FilaDelArchivo datos={d.datos} /> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums max-md:order-2 max-md:block max-md:p-0">
                {/* `null` es «no se pudo leer el monto» y se muestra así.
                    `formatCurrency(null)` devuelve «$ 0», que es un hecho
                    falso mostrado con total confianza. */}
                {d.debitos === null ? '—' : formatCurrency(d.debitos)}
                {d.descuadrado ? (
                  <span className="block text-caption font-sans text-warning">
                    descuadrado
                    {d.creditos === null ? '' : ` · créditos ${formatCurrency(d.creditos)}`}
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pie}
    </div>
  )
}

/**
 * La fila del export tal como llegó, para comprobar un comprobante sin abrir
 * el CSV. Sólo existe en lo migrado desde el 2026-09-16: lo anterior no la
 * guardó, y no se le inventa.
 */
function FilaDelArchivo({ datos }: { datos: Record<string, unknown> }) {
  const campos = Object.entries(datos).filter(
    ([, valor]) => valor !== '' && valor !== null && valor !== undefined,
  )
  return (
    <details className="mt-1 text-caption" data-testid="comprobante-fila-del-archivo">
      <summary className="cursor-pointer text-fg-subtle hover:text-fg">
        Ver la fila del archivo
      </summary>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md border border-border bg-surface-muted p-2">
        {campos.map(([campo, valor]) => (
          <div key={campo} className="contents">
            <dt className="text-fg-subtle">{campo}</dt>
            <dd className="break-words font-mono text-fg">{String(valor)}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
