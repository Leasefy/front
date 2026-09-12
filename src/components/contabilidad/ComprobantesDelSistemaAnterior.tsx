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
 * ── Las pestañas (Nico, 2026-09-12) ────────────────────────────────────────
 *
 * «Tres pestañas: comprobantes de ingreso · comprobantes de egreso · facturas
 * generadas. Hoy es una sola lista mezclada.»
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
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Receipt } from '@phosphor-icons/react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  CLASES_DE_COMPROBANTE,
  contabilidadApi,
  type ClaseDeComprobante,
  type ConteoPorClase,
  type DocumentoMigradoVista,
  type HistoriaDeComprobantes,
} from '@/lib/api/contabilidad.service'
import { diaLegible } from '@/lib/contabilidad/fechas'
import { formatCurrency } from '@/lib/format'

/**
 * De qué cosa son los comprobantes: de un contrato o de un inmueble. Uno de
 * los dos, nunca los dos — el back tiene una puerta para cada uno.
 */
type Vinculo =
  | { contractId: string; propertyId?: never }
  | { propertyId: string; contractId?: never }

type Props = Vinculo

/** El orden de las pestañas es el de Nico; «Otros» va al final y sólo si hay. */
const PESTANAS: { clase: ClaseDeComprobante; etiqueta: string; vacio: string }[] = [
  {
    clase: 'ingreso',
    etiqueta: 'Ingresos',
    vacio: 'Ningún comprobante de ingreso del sistema anterior quedó colgado acá.',
  },
  {
    clase: 'egreso',
    etiqueta: 'Egresos',
    vacio: 'Ningún comprobante de egreso del sistema anterior quedó colgado acá.',
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
      'Ninguna factura del sistema anterior quedó colgada acá. Una factura se cuelga cuando su concepto nombra al inquilino o al propietario; si el export las trae como «Factura 57521», sin cliente, no hay por dónde colgarlas y hace falta pedirlo con la columna del cliente.',
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

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-3"
      data-testid="comprobantes-del-sistema-anterior"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">
            Comprobantes del sistema anterior
          </h3>
        </div>
        {/* El total sale del back (la suma de las pestañas), no del largo de
            la lista: con el tope de por medio, contar las filas visibles
            diría 500 para siempre. */}
        {totalGeneral > 0 ? (
          <span
            className="font-mono text-sm tabular-nums text-fg-muted"
            data-testid="comprobantes-total"
          >
            {totalGeneral.toLocaleString('es-CO')}
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
          titulo="Sin comprobantes del sistema anterior"
          descripcion={`${contractId ? 'Este contrato' : 'Este inmueble'} no tiene comprobantes de la contabilidad vieja colgados. Aparecen acá cuando se sube el export de comprobantes en Migración → Registros contables y el concepto nombra al inquilino o al propietario.`}
        />
      ) : (
        <Tabs value={clase} onValueChange={(v) => setClase(v as ClaseDeComprobante)}>
          <TabsList variant="segmented" className="justify-start">
            {visibles.map((p) => (
              <TabsTrigger
                key={p.clase}
                value={p.clase}
                className="gap-2 whitespace-nowrap"
                data-testid={`pestana-${p.clase}`}
              >
                {p.etiqueta}
                {/* Cada pestaña dice cuántos hay, y el número es del back. La
                    píldora es la misma de las pestañas de Documentos
                    (`documentos/page.tsx`), que ya resolvió cómo se ve un
                    conteo dentro de una pestaña segmentada. */}
                <span
                  className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full bg-surface-muted px-1.5 text-caption tabular-nums text-fg-muted"
                  data-testid={`conteo-${p.clase}`}
                >
                  {enPantalla[p.clase].toLocaleString('es-CO')}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={clase} className="mt-3 space-y-3">
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
              <TablaDeComprobantes documentos={documentos} />
            </EstadoDeDatos>

            {recortado ? (
              <p className="text-xs text-fg-muted" data-testid="comprobantes-recortados">
                Se muestran los {historia!.mostrados.toLocaleString('es-CO')} más recientes
                de {historia!.total.toLocaleString('es-CO')} en esta pestaña. Los demás están
                guardados —no se perdió ninguno—, pero acá sólo caben estos.
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </section>
  )
}

function TablaDeComprobantes({ documentos }: { documentos: DocumentoMigradoVista[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            {/* El tipo se repite dentro de una pestaña, pero en «Otros» es lo
                único que dice qué es cada fila (nota crédito, nómina…). */}
            <TableHead>Tipo</TableHead>
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
            <TableRow key={d.id} data-testid="comprobante-migrado">
              <TableCell className="whitespace-nowrap">
                {d.tipo || '—'}
                {d.anulado ? <span className="ml-2 text-xs text-danger">anulado</span> : null}
              </TableCell>
              {/* El prefijo puede venir vacío («FV-26766» vs «26766»), y el
                  consecutivo 0 es un consecutivo: `filter(Boolean)` lo
                  borraría. */}
              <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                {d.prefijo ? `${d.prefijo}-${d.consecutivo}` : String(d.consecutivo)}
              </TableCell>
              <TableCell className="whitespace-nowrap">{diaLegible(d.fecha)}</TableCell>
              <TableCell className="max-w-[28rem] text-fg-muted">
                <span className="line-clamp-2">{d.concepto || '—'}</span>
                {d.esAnticipo ? (
                  <span className="block text-xs text-fg-subtle">
                    Anticipo
                    {d.anticipoAplicado ? ' aplicado' : ' sin aplicar'}
                    {d.terceroAnticipo ? ` · ${d.terceroAnticipo}` : ''}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                {/* `null` es «no se pudo leer el monto» y se muestra así.
                    `formatCurrency(null)` devuelve «$ 0», que es un hecho
                    falso mostrado con total confianza. */}
                {d.debitos === null ? '—' : formatCurrency(d.debitos)}
                {d.descuadrado ? (
                  <span className="block text-xs font-sans text-warning">
                    descuadrado
                    {d.creditos === null ? '' : ` · créditos ${formatCurrency(d.creditos)}`}
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
