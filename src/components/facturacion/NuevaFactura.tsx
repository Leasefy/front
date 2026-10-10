'use client'

/**
 * «Nueva factura» — el mes que se emite, y hasta dónde se puede mirar.
 *
 * Nico (2026-09-12): «Facturar y que me arroje el listado completo de las
 * facturas que hay por generar, NO QUE ME PONGA A ESCOGER UNA… Una vez
 * seleccione el mes, debe separar por facturas de propietarios y facturas de
 * inquilinos pero debe arrojar el listado completo de las facturas que puedo
 * generar para ese mes.»
 *
 * Por eso el punto de partida es el MES: el back responde las dos listas
 * completas (`GET /inmobiliaria/facturacion/por-generar`) con todo marcado, y
 * lo normal es desmarcar lo que no va y apretar «Generar N facturas».
 *
 * ── 🔴 Y poder hacer UNA, sin dejar de tener la lista (Nico, 18-09 de noche) ─
 *
 * «Selecciono sólo una y no da el poder generar factura de sólo esa, y agrega
 * un buscador a la tabla.»
 *
 * No se contradice con lo de arriba, y la diferencia importa para no volver a
 * romper esto: el 12 rechazó una pantalla que OBLIGABA a elegir un contrato
 * para poder ver algo. La lista completa y premarcada se queda. Lo que
 * faltaba era poder **actuar sobre una sola fila** y poder **encontrarla**
 * entre 730. Tres cosas lo resuelven:
 *
 *   1. un **buscador dentro de la tabla** (contrato, tercero, documento,
 *      inmueble, concepto);
 *   2. **«Generar esta»** en la fila: una factura, un clic, sin tocar la
 *      selección de las otras 729;
 *   3. la casilla de la cabecera **limpia** cuando hay algo marcado, en vez de
 *      marcarlo todo. Estando en 726 de 730, apretarla subía a 730: para
 *      dejar una sola había que apretarla dos veces y adivinar el orden.
 *
 * 🔴 Y lo que de verdad lo bloqueaba: **el botón estaba apagado** porque la
 * inmobiliaria no tiene resolución de la DIAN para «Canon del inquilino». El
 * porqué vivía en un banner arriba de todo, a media pantalla del botón — o
 * sea, un control que no se mueve y no dice por qué, que se lee como roto.
 * Ahora el motivo y la salida («Cargar la resolución») están AL LADO del
 * botón, y cada «Generar esta» lo repite en su `title`.
 *
 * ── 🔴 Cada fila SALE de la cuota del contrato ──────────────────────────────
 *
 * La deuda nace con el contrato y vive en `contrato_cuotas`, diferida por mes:
 * esa fila ES la factura de ese mes, con su canon, su prorrateo, su IVA y sus
 * retenciones ya calculados el día que se firmó. La pantalla no recalcula nada
 * y el back tampoco — es la misma plata que el cliente ve en su estado de
 * cuenta, que es lo único que hace defendible una factura frente a un reclamo.
 *
 * ── Mirar hasta diciembre, emitir mes a mes ─────────────────────────────────
 *
 * El CEO (2026-09-13): «Si quiero mirar qué facturas tengo por generar hasta el
 * 31 de diciembre… Lo que NO se puede es enviarlas [antes de tiempo].» El
 * selector «Ver hasta» estira la consulta; las casillas y el botón siguen siendo
 * SÓLO del mes elegido, y una fila de un mes que no empezó viene con
 * `emitible: false` y su motivo — el back devuelve 400 si se intenta igual.
 *
 * ── Lo que la pantalla dice en voz alta ─────────────────────────────────────
 *
 * Las ya emitidas NO se esconden: se muestran con su número y sin casilla. Una
 * lista que sólo trae lo pendiente no deja verificar que el mes esté completo,
 * que es justamente lo que la persona de facturación necesita saber.
 *
 * Cada fila muestra su BASE, su IVA, lo que el cliente RETIENE y el TOTAL.
 * 🔴 La retención no baja el total: baja el neto, porque la practica quien
 * recibe la factura al pagar. Una fila cuya cuota se generó sin escenario
 * confirmado sale sin impuestos y se marca «sin confirmar». Y los `avisos` de la
 * fila se muestran: la plata que no se puede facturar se dice, no se pierde en
 * silencio.
 *
 * ── 🔴 El interés de mora, y de dónde salió ────────────────────────────────
 *
 * Nico: «el interés sí se va cargando a la factura cada vez que se genera.» Una
 * cuota en cartera lleva su recargo, y la fila dice con qué autoridad: **del
 * cobro** (finanzas ya lo liquidó, el número está escrito y no se mueve) o
 * **sobre la cuota** (el mismo motor de mora corriendo hoy, porque ningún cobro
 * reclamó ese mes — el caso normal). El segundo CRECE cada día hasta que la
 * factura se emita, y por eso no se puede pintar igual que el primero.
 *
 * Y el número: sale de la RESOLUCIÓN de la DIAN. Sin resolución vigente el back
 * no emite, así que el botón se apaga y la pantalla dice por qué y a dónde ir.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  DownloadSimple,
  Info,
  MagnifyingGlass,
  Receipt,
  SealWarning,
  Warning,
} from '@phosphor-icons/react'
import {
  generarPorTandas,
  quedaronPendientes,
  type ResultadoDeLaCorrida,
} from './facturasPorTandas'
import { InformeDeFacturacion, mensajeDelFalloDeEmision } from './InformeDeFacturacion'
import { abrirCentroDeProcesos, anunciarProceso } from '@/lib/api/procesos.service'
import { registrarDetenerEnElNavegador } from '@/components/procesos/detener-en-el-navegador'
import { CajonDeLaFactura } from './CajonDeLaFactura'
import { useDescargarFacturas } from './useDescargarFacturas'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  PAGE_SIZE_OPTIONS,
  useTablePagination,
} from '@/lib/hooks/use-table-pagination'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import { confirmar } from '@/components/ui/confirmar'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  facturacionPorMesService,
  fechaLegible,
  mesActual,
  mesLegible,
  mesesParaElegir,
  topesParaElegir,
  type DestinatarioDeFactura,
  type EstadoDeLaResolucion,
  type FacturaDelMes,
  type FacturasPorGenerar,
} from '@/lib/api/facturacion-por-mes.service'
import {
  aQuienSeFactura,
  expandirALasHermanas,
  hermanasDeLaFila,
  avisosDeLaFila,
  cuantos,
  escenarioSinConfirmar,
  estaAnulada,
  estadoDeLaFila,
  llevaIntereses,
  moraDelMes,
  motivoCorto,
  numerosQueSalen,
  porQueNoSeEmite,
  rutaDelEscenario,
  rutaDelMandante,
  rutaDeLasPartesDelContrato,
  rutaDelInquilino,
  frenaPorElDocumentoDelMandante,
  sePuedeEmitirHoy,
  seSugiere,
  sinLaRutaDeFacturacion,
} from '@/lib/facturacion/por-facturar'
import { Collapse, SegmentedControl } from '@leasefy/cadence'
import { PrefacturasDelRango, finDeAnio } from './PrefacturasDelRango'
import { FacturasDeIntereses } from './FacturasDeIntereses'

/**
 * El rango de fechas que trae el nombre de un renglón migrado de Nui
 * («Canon de arrendamiento. De 01-Oct-2026 hasta 31-Oct-2026»). En la fila y en
 * la confirmación sobra: el período se dice aparte («Mes completo», «20 de 30
 * días») y esas fechas no son las de la casa. El renglón entero sigue en el
 * cajón, que es el documento.
 */
const RANGO_DE_NUI = /\.?\s*De \d{1,2}-[A-Za-zñÑ]{3,4}-\d{4} hasta \d{1,2}-[A-Za-zñÑ]{3,4}-\d{4}\.?/i
/**
 * QA-FACT-PROF (04-10): el período en palabras de las cuotas nuevas («. Del 1 al
 * 31 de octubre de 2026»). Sin quitarlo, el diálogo decía «… Del 1 al 31 de
 * octubre de 2026 de octubre de 2026».
 */
const RANGO_EN_PALABRAS =
  /\.?\s*Del \d{1,2}(?: de [a-záéíóúñ]+(?: de \d{4})?)? al \d{1,2} de [a-záéíóúñ]+ de \d{4}\.?/i

/** Lo que se lee de un renglón cuando la fila resume sus conceptos. */
function conceptosLegibles(factura: FacturaDelMes): string {
  const nombres = factura.lineas
    .filter((l) => !l.resta)
    .map((l) => l.nombre.replace(RANGO_DE_NUI, '').replace(RANGO_EN_PALABRAS, '').trim() || l.nombre)
  if (nombres.length === 0) return '—'
  if (nombres.length <= 2) return nombres.join(' · ')
  return `${nombres.slice(0, 2).join(' · ')} +${nombres.length - 2}`
}

/** El recargo de mora que lleva la fila. `0` si no lleva. */
function moraDe(factura: FacturaDelMes): number {
  return factura.mora?.recargosCop ?? 0
}

/**
 * 🔴 EL INTERÉS DE MORA, CON SU ORIGEN — sólo si la factura de verdad lo lleva.
 *
 * Nico (03-10-2026): «intereses de mora → nunca en la factura del mes; sólo en
 * la factura aparte cuando se pagan». Con el back de esa decisión la factura del
 * mes ya no trae renglones de interés y esta línea no se pinta (la fila dice
 * «En mora · N días» y el porqué va UNA vez arriba). Se conserva para un back
 * anterior que todavía los mete en la factura: si van en el total, se dicen, y
 * con su origen —`del cobro` es un valor ya escrito; `sobre la cuota` crece
 * cada día hasta que se emita—.
 */
function InteresDeMora({ factura }: { factura: FacturaDelMes }) {
  const mora = factura.mora
  if (!mora || mora.recargosCop <= 0 || !llevaIntereses(factura)) return null
  const delCobro = mora.origen === 'COBRO'
  return (
    <p
      className="truncate text-caption text-fg-muted"
      data-testid={`mora-${factura.clave}`}
      title={
        delCobro
          ? 'Lo liquidó el cobro de ese mes: es un valor ya escrito y no se mueve.'
          : 'Lo calcula el motor de mora sobre la cuota, con las reglas de esta inmobiliaria. Crece cada día hasta que la factura se emita.'
      }
    >
      Mora <span className="font-mono tabular-nums">{formatCurrency(mora.recargosCop)}</span> ·{' '}
      {mora.diasDeMora} {mora.diasDeMora === 1 ? 'día' : 'días'} ·{' '}
      <span className={delCobro ? 'text-fg-subtle' : 'text-warning'}>
        {delCobro ? 'del cobro' : 'sobre la cuota'}
      </span>
    </p>
  )
}

/**
 * «En mora · 3 días»: la marca de la fila. Por qué la factura no lleva
 * intereses se dice UNA vez arriba de la tabla (FA-03: el mismo párrafo salía
 * en las 30 filas).
 */
function EnMora({ factura }: { factura: FacturaDelMes }) {
  const mora = factura.mora
  const dias = mora?.diasDeMora ?? 0
  if (!mora?.esCartera || llevaIntereses(factura) || dias <= 0) return null
  return (
    <p className="truncate text-caption text-fg-muted" data-testid={`en-mora-${factura.clave}`}>
      En mora · <span className="font-mono tabular-nums">{dias}</span>{' '}
      {dias === 1 ? 'día' : 'días'}
    </p>
  )
}

/**
 * 🔴 «Impuestos sin confirmar»: el escenario tributario del contrato está
 * DEDUCIDO o falta un dato. Nico (03-10-2026): así no se emite; se confirma en
 * el contrato. El motivo va en el `title`, con las palabras que da el back.
 */
function ImpuestosSinConfirmar({ factura }: { factura: FacturaDelMes }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-caption text-warning"
      title={
        factura.notasTributarias.join(' ') ||
        'Falta confirmar el escenario tributario del contrato.'
      }
      data-testid={`sin-confirmar-${factura.clave}`}
    >
      <SealWarning className="h-3.5 w-3.5" weight="fill" />
      Sin confirmar
    </span>
  )
}

interface TablaProps {
  titulo: string
  descripcion: string
  filas: FacturaDelMes[]
  seleccion: Set<string>
  onAlternarUna: (clave: string) => void
  onAlternarTodas: (claves: string[]) => void
  ocupado: boolean
  testid: string
  /**
   * Emitir UNA fila, sin tocar la selección de las demás (Nico, 18-09:
   * «selecciono sólo una y no da el poder generar factura de sólo esa»).
   * Antes de emitir se confirma a quién, cuánto y con qué número (FA-09).
   */
  onGenerarUna: (clave: string) => void
  /** Por qué no se puede emitir hoy (sin resolución de la DIAN). `null` = se puede. */
  motivoParaNoEmitir: string | null
  /**
   * 🔴 La fila abre el cajón con TODO (Nico, 22-09: «al dar clic se debería
   * abrir detalle de ese en un drawer y ahí quizás ver y accionar más cosas»).
   */
  onAbrirDetalle: (factura: FacturaDelMes) => void
  /**
   * 🔴 El pie de acciones masivas va DENTRO de la tabla, no debajo de ella
   * (Nico, 19-09: «cuando hay acciones masivas deben quedar también en la
   * tabla»). Se recibe armado porque quien sabe qué se hace con lo marcado es
   * la pantalla, no la tabla — pero dónde vive es asunto de la tabla.
   */
  accionesMasivas?: ReactNode
  /**
   * 🔴 Sin borde ni esquinas propias: la tabla es una PARTE de la tarjeta de
   * la pantalla, no otra caja (Nico, 20-09).
   */
  sinMarco?: boolean
  /**
   * 🔴 Bajar el PDF de una fila EMITIDA desde la columna de estado (Nico, 22-09:
   * «dónde puedo descargar […] esa factura en sí […] y también ahí donde dice
   * estado»).
   */
  onDescargarPdf?: (factura: FacturaDelMes) => void
  /** El `facturaId` que se está bajando, para no dejar apretar dos veces. */
  descargando?: string | null
}

/**
 * Lo que la búsqueda mira de una fila. Es lo que la persona tiene a mano
 * cuando quiere UNA factura: el número del contrato (el suyo y el nuestro),
 * el nombre o el documento del tercero, la dirección, y el concepto.
 */
function textoBuscableDe(f: FacturaDelMes): string {
  return [
    f.numeroExterno,
    f.codigo === null ? null : String(f.codigo),
    f.terceroNombre,
    f.terceroDocumento,
    f.inmueble,
    conceptosLegibles(f),
  ]
    .filter(Boolean)
    .join(' ')
}

/** Sin tildes y en minúsculas: nadie escribe «Ramírez» con tilde en un buscador. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** El número que la inmobiliaria conoce (el Nui) y el nuestro rotulado. */
function NumeroDelContrato({ factura }: { factura: FacturaDelMes }) {
  return (
    <span className="font-mono tabular-nums">
      <span className="text-fg">{factura.numeroExterno ?? `#${factura.codigo ?? '—'}`}</span>
      {factura.numeroExterno && factura.codigo !== null && (
        <span className="text-fg-muted"> · Leasefy #{factura.codigo}</span>
      )}
    </span>
  )
}

/**
 * La plata de la fila en UNA columna (FA-04, QA-FACT 03-10): el total grande y,
 * debajo, base e IVA y lo que el cliente retiene con su neto. En once columnas
 * la tabla no cabía a 1.440 px y Retenciones y Total quedaban fuera de vista.
 * 🔴 La retención no baja el total: baja el NETO, que es lo que se paga.
 */
function PlataDeLaFila({ factura }: { factura: FacturaDelMes }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="whitespace-nowrap font-mono font-medium tabular-nums text-fg">
        {formatCurrency(factura.totalCop)}
      </p>
      {/* 🔴 FA-04 (QA-FACT-CONTA-95, 05-10): un renglón corto por cifra. En dos
          renglones largos («Base … · IVA …», «Retiene … · Neto …») la columna
          medía 329 px y la tabla no cabía a 1.440: el valor quedaba debajo de
          la columna del estado. */}
      {(factura.ivaCop > 0 || factura.retencionesCop > 0) && (
        <p className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted" data-testid={`base-${factura.clave}`}>
          Base {formatCurrency(factura.baseCop)}
        </p>
      )}
      {factura.ivaCop > 0 && (
        <p className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted" data-testid={`iva-${factura.clave}`}>
          IVA {formatCurrency(factura.ivaCop)}
        </p>
      )}
      {factura.retencionesCop > 0 && (
        <>
          <p className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted" data-testid={`retiene-${factura.clave}`}>
            Retiene −{formatCurrency(factura.retencionesCop)}
          </p>
          <p className="whitespace-nowrap font-mono text-caption tabular-nums text-fg-muted" data-testid={`neto-${factura.clave}`}>
            Neto {formatCurrency(factura.netoCop)}
          </p>
        </>
      )}
      {factura.ivaCop > 0 &&
        factura.impuestosSinConfirmar === false &&
        factura.escenario && (
          // FA-R27: «Escenario 3», no el código «E3».
          <p className="text-caption text-fg-muted">
            {/^E\d+$/.test(factura.escenario.codigo)
              ? `Escenario ${factura.escenario.codigo.slice(1)}`
              : factura.escenario.nombre}
          </p>
        )}
      {factura.impuestosSinConfirmar && (
        <p>
          <ImpuestosSinConfirmar factura={factura} />
        </p>
      )}
    </div>
  )
}

/**
 * T-0163: las facturas de los inquilinos de un contrato salen juntas: o se
 * emiten todas o ninguna. Va una vez por contrato y mes, en su primera fila.
 */
function AvisoDeFacturaJunta({ factura }: { factura: FacturaDelMes }) {
  return (
    <p
      className="text-caption text-fg-muted"
      data-testid={`factura-junta-${factura.contractId}-${factura.mes}`}
    >
      La factura de este contrato se emite junta para todos los inquilinos.
    </p>
  )
}

/** Lo que se factura, el inmueble, el período y lo que la fila tiene que decir. */
function ConceptoDeLaFila({ factura }: { factura: FacturaDelMes }) {
  const avisos = avisosDeLaFila(factura)
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-fg" title={conceptosLegibles(factura)}>
        {conceptosLegibles(factura)}
      </p>
      <p className="truncate text-caption text-fg-muted" title={factura.inmueble}>
        {factura.inmueble}
      </p>
      <p className="truncate text-caption text-fg-muted">
        {factura.diasFacturados === factura.diasDelMes
          ? 'Mes completo'
          : `${factura.diasFacturados} de ${factura.diasDelMes} días`}
      </p>
      {factura.deduccionAlEgresoCop > 0 && (
        <p className="truncate text-caption text-fg-muted">
          <span className="font-mono tabular-nums">{formatCurrency(factura.deduccionAlEgresoCop)}</span> van a
          deducción del egreso, no a la factura
        </p>
      )}
      <InteresDeMora factura={factura} />
      <EnMora factura={factura} />
      {/* 🔴 Lo que esta factura tiene que decir y no cabe en un número. El
          aviso de «mora sin intereses» ya no va acá: es el mismo en todas las
          filas y se dice UNA vez arriba (FA-03). */}
      {avisos.length > 0 && (
        <p
          className="flex items-start gap-1 text-caption text-warning"
          title={avisos.join(' ')}
          data-testid={`aviso-${factura.clave}`}
        >
          <Warning className="mt-0.5 h-3 w-3 flex-shrink-0" weight="fill" />
          <span className="line-clamp-2">{avisos.join(' ')}</span>
        </p>
      )}
    </div>
  )
}

interface EstadoProps {
  factura: FacturaDelMes
  ocupado: boolean
  motivoParaNoEmitir: string | null
  onGenerarUna: (clave: string) => void
  onDescargarPdf?: (factura: FacturaDelMes) => void
  descargando: string | null
}

/**
 * La celda de estado: emitida (con su PDF), anulada, lo que la bloquea con su
 * salida, o «Generar esta».
 */
function EstadoDeLaFactura({
  factura,
  ocupado,
  motivoParaNoEmitir,
  onGenerarUna,
  onDescargarPdf,
  descargando,
}: EstadoProps) {
  const estado = estadoDeLaFila(factura)
  if (estado === 'emitida') {
    /* 🔴 El estado dice que se EMITIÓ y con qué número, y al lado baja su PDF
       (Nico, 22-09). La celda frena la propagación: el botón baja y no abre. */
    return (
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-1.5">
          <Badge variant="success" data-testid={`emitida-${factura.clave}`}>
            Emitida · {factura.numeroDian ?? `N° ${factura.numero}`}
          </Badge>
          {factura.facturaId && onDescargarPdf && (
            <Button
              size="icon"
              variant="ghost"
              hideArrow
              className="h-8 w-8"
              disabled={descargando !== null}
              isLoading={descargando === factura.facturaId}
              aria-label={`Descargar el PDF de la factura ${factura.numeroDian ?? factura.numero ?? ''}`.trim()}
              title="Descargar el PDF"
              onClick={() => onDescargarPdf(factura)}
              data-testid={`descargar-pdf-${factura.clave}`}
            >
              <DownloadSimple className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        {/* El número que vale ante la DIAN es el autorizado por la resolución;
            el consecutivo interno queda debajo, para poder cruzarlo. */}
        {factura.numeroDian && (
          <span className="font-mono text-caption tabular-nums text-fg-muted">
            interna N° {factura.numero}
          </span>
        )}
      </div>
    )
  }
  if (estado === 'anulada') {
    /* 🔴 Una factura anulada con su nota crédito NO se ve como «Emitida»
       (FA-11, Nico 03-10). */
    return (
      <Badge variant="secondary" data-testid={`anulada-${factura.clave}`} title={porQueNoSeEmite(factura) ?? undefined}>
        {factura.saldadaPorNota
          ? `Anulada con la nota crédito ${factura.saldadaPorNota.numero}`
          : 'Anulada con nota crédito'}
      </Badge>
    )
  }
  if (estado === 'sin-escenario') {
    /* 🔴 Nico (03-10): sin escenario confirmado no se emite. La fila lo dice y
       lleva al contrato. */
    return (
      <div className="flex flex-col items-start gap-1">
        <ImpuestosSinConfirmar factura={factura} />
        <Link
          href={rutaDelEscenario(factura)}
          className="text-caption font-medium text-primary underline-offset-4 hover:underline"
          data-testid={`confirmar-escenario-${factura.clave}`}
        >
          Confirmar en el contrato
        </Link>
      </div>
    )
  }
  if (estado === 'espera-el-giro') {
    return (
      <span
        className="text-caption text-fg-muted"
        title={porQueNoSeEmite(factura) ?? undefined}
        data-testid={`espera-el-giro-${factura.clave}`}
      >
        Se factura cuando se le gire
      </span>
    )
  }
  if (
    estado === 'todavia-no' &&
    factura.codigoNoEmitible === 'INQUILINO_SIN_TIPO_DE_DOCUMENTO' &&
    factura.contratoInquilinoId
  ) {
    /* T-0163: la factura de un COARRENDATARIO. Su tipo de documento vive en las
       partes del contrato (no en Inquilinos, que sólo conoce al titular). */
    return (
      <div className="flex flex-col items-start gap-1" data-testid={`inquilino-sin-tipo-${factura.clave}`}>
        <span className="text-caption text-fg-subtle" title={factura.motivoNoEmitible ?? undefined}>
          {motivoCorto(factura)}
        </span>
        <Link
          href={rutaDeLasPartesDelContrato(factura)}
          className="text-caption font-medium text-primary underline-offset-4 hover:underline"
          data-testid={`completar-en-el-contrato-${factura.clave}`}
        >
          Completar en el contrato
        </Link>
      </div>
    )
  }
  if (estado === 'todavia-no' && factura.codigoNoEmitible === 'INQUILINO_SIN_TIPO_DE_DOCUMENTO') {
    /* 🔴 QA-FACT-CONTA-95 r2 (decisión de Nico 05-10, «la a»): sin el tipo de
       documento GUARDADO del inquilino no se numera (nunca se adivina por el
       largo). La fila lleva a la persona en Inquilinos, donde se completa. */
    const ruta = rutaDelInquilino(factura)
    return (
      <div className="flex flex-col items-start gap-1" data-testid={`inquilino-sin-tipo-${factura.clave}`}>
        <span className="text-caption text-fg-subtle" title={factura.motivoNoEmitible ?? undefined}>
          {motivoCorto(factura)}
        </span>
        {ruta && (
          <Link
            href={ruta}
            className="text-caption font-medium text-primary underline-offset-4 hover:underline"
            data-testid={`completar-inquilino-${factura.clave}`}
          >
            Completar en el inquilino
          </Link>
        )}
      </div>
    )
  }
  if (estado === 'todavia-no' && frenaPorElDocumentoDelMandante(factura.codigoNoEmitible)) {
    /* QA-FACT-PROF (04-10): la factura sale a nombre del propietario (mandato)
       y la DIAN exige su tipo de documento. La fila lleva a su ficha.
       QA-FACT-CONTA-95 · B-08 (05-10): el mismo aviso cuando la ficha dice
       «CC» con un número que parece un NIT. */
    const ruta = rutaDelMandante(factura)
    return (
      <div className="flex flex-col items-start gap-1" data-testid={`mandante-sin-tipo-${factura.clave}`}>
        <span className="text-caption text-fg-subtle" title={factura.motivoNoEmitible ?? undefined}>
          {motivoCorto(factura)}
        </span>
        {ruta && (
          <Link
            href={ruta}
            className="text-caption font-medium text-primary underline-offset-4 hover:underline"
            data-testid={`completar-mandante-${factura.clave}`}
          >
            Completar en el propietario
          </Link>
        )}
      </div>
    )
  }
  if (estado === 'todavia-no') {
    /* 🔴 MOSTRAR NO ES EMITIR. El motivo va en el `title` con las palabras del
       back: «Diciembre de 2026 todavía no empieza…». */
    return (
      <span
        className="text-caption text-fg-subtle"
        title={factura.motivoNoEmitible ?? undefined}
        data-testid={`todavia-no-${factura.clave}`}
      >
        {motivoCorto(factura)}
      </span>
    )
  }
  const generada = factura.estado === 'GENERADA'
  return (
    <div className="flex flex-col items-start gap-1.5">
      {/* CONSISTENCIA (04-10-2026): el botón decía «Generar esta» y abría
          «¿Emitir la factura…?»; la fila GENERADA decía «Generada · sin
          número». Las dos cosas son lo mismo: falta EMITIRLA (ahí toma su
          número), y así se dice. */}
      <span className="text-caption text-primary">
        {generada ? 'Sin número todavía: falta emitirla' : 'Por emitir'}
      </span>
      {/* 🔴 «Selecciono sólo una y no da el poder generar factura de sólo esa»
          (Nico, 18-09). Una factura, un clic —y su confirmación con el número
          que va a llevar (FA-09)—, sin tocar la selección de las otras. Apagado
          dice por qué: el mismo motivo del botón grande. */}
      <Button
        size="sm"
        variant="outline"
        hideArrow
        disabled={ocupado || motivoParaNoEmitir !== null}
        title={motivoParaNoEmitir ?? undefined}
        onClick={() => onGenerarUna(factura.clave)}
        data-testid={`generar-una-${factura.clave}`}
      >
        Emitir esta
      </Button>
    </div>
  )
}

function TablaDeFacturas({
  titulo,
  descripcion,
  filas,
  seleccion,
  onAlternarUna,
  onAlternarTodas,
  ocupado,
  testid,
  onGenerarUna,
  motivoParaNoEmitir,
  onAbrirDetalle,
  accionesMasivas,
  sinMarco = false,
  onDescargarPdf,
  descargando = null,
}: TablaProps) {
  /*
   * 🔴 FA-15 (QA-FACT, 03-10): a 390 px la tabla medía 1.416 px y se corría de
   * lado: sólo se veían la casilla, el contrato y el estado. En el celular cada
   * factura es una TARJETA con el cliente, el concepto, el total y su acción.
   */
  const esCelular = useIsMobile()

  /**
   * T-0163: un mes de un contrato con varios inquilinos son N filas pegadas, una
   * por inquilino. Se marcan con una raya a la izquierda y el aviso de que salen
   * juntas va UNA vez, en la primera. `null` = fila suelta (lo de siempre).
   */
  const grupoDe = (factura: FacturaDelMes): { primera: boolean } | null => {
    const hermanas = hermanasDeLaFila(factura, filas)
    return hermanas.length > 1 ? { primera: hermanas[0].clave === factura.clave } : null
  }
  /*
   * 🔴 El buscador va DENTRO de la tabla (Nico, 18-09). Con 730 filas, querer
   * una factura y no poder llegar a su fila es lo mismo que no poder hacerla.
   * Es local y no toca la selección: buscar ESCONDE filas, nunca desmarca.
   */
  const [busqueda, setBusqueda] = useState('')
  /*
   * 🔴 Las facturas cuyo contrato NO tiene el escenario tributario confirmado.
   * Nico (03-10-2026): no se emiten hasta confirmarlo. Se cuentan ARRIBA con la
   * frase entera y se pueden aislar para revisarlas una por una.
   */
  const sinEscenario = useMemo(
    () =>
      filas.filter(
        (f) => escenarioSinConfirmar(f) && f.estado !== 'EMITIDA' && !estaAnulada(f),
      ),
    [filas],
  )
  const [soloSinEscenario, setSoloSinEscenario] = useState(false)
  const verSoloSinEscenario = soloSinEscenario && sinEscenario.length > 0
  const visibles = useMemo(() => {
    const base = verSoloSinEscenario ? sinEscenario : filas
    const q = normalizar(busqueda)
    if (q === '') return base
    return base.filter((f) => normalizar(textoBuscableDe(f)).includes(q))
  }, [filas, sinEscenario, verSoloSinEscenario, busqueda])

  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(visibles, {
      resetKey: `${testid}|${filas.length}|${busqueda}|${verSoloSinEscenario}`,
    })

  /*
   * 🔴 Sólo lo que HOY se puede emitir entra a la selección: ni el mes que no
   * empezó, ni la comisión que espera su giro, ni la factura sin escenario
   * confirmado. Una casilla que produce un error no es una opción, es una trampa.
   */
  const porEmitir = useMemo(
    () => visibles.filter(sePuedeEmitirHoy).map((f) => f.clave),
    [visibles],
  )
  const sinConfirmar = filas.filter((f) => f.impuestosSinConfirmar).length
  // Un back anterior a la decisión del 03-10 todavía mete los recargos en la
  // factura del mes: si van en el total, se totalizan aparte.
  const conMora = filas.filter((f) => moraDe(f) > 0 && llevaIntereses(f))
  const moraCop = conMora.reduce((s, f) => s + moraDe(f), 0)
  /*
   * 🔴 FA-03: «Esta cuota está en mora hace 3 días y la factura NO lleva
   * intereses. La inmobiliaria no tiene reglas de mora activas…» salía en CADA
   * fila (30 veces). Es lo mismo para todas: va UNA vez arriba.
   */
  const mora = useMemo(() => moraDelMes(filas), [filas])
  const hayMoraSinIntereses = mora.enMora > 0 && conMora.length === 0

  const elegidas = porEmitir.filter((c) => seleccion.has(c))
  const todas = porEmitir.length > 0 && elegidas.length === porEmitir.length
  const algunas = elegidas.length > 0 && !todas

  const casilla = (factura: FacturaDelMes) => {
    const puede = sePuedeEmitirHoy(factura)
    return (
      <Checkbox
        checked={puede && seleccion.has(factura.clave)}
        disabled={!puede || ocupado}
        onCheckedChange={() => onAlternarUna(factura.clave)}
        aria-label={
          factura.estado === 'EMITIDA'
            ? 'Ya emitida'
            : !puede
              ? (porQueNoSeEmite(factura) ?? 'Todavía no se puede emitir')
              : `Seleccionar la factura de ${aQuienSeFactura(factura)}`
        }
      />
    )
  }

  const estado = (factura: FacturaDelMes) => (
    <EstadoDeLaFactura
      factura={factura}
      ocupado={ocupado}
      motivoParaNoEmitir={motivoParaNoEmitir}
      onGenerarUna={onGenerarUna}
      onDescargarPdf={onDescargarPdf}
      descargando={descargando}
    />
  )

  const vacioDeLaTabla = (
    <SinDatos
      hayFiltros={busqueda.trim() !== ''}
      queSon={`facturas de ${titulo.toLowerCase()} este mes`}
      icono={Receipt}
      descripcion={descripcion}
      onLimpiarFiltros={busqueda.trim() !== '' ? () => setBusqueda('') : undefined}
    />
  )

  return (
    <section
      /* 🔴 `overflow-x-clip`, NO `overflow-hidden`: con `hidden` esta tarjeta
         se vuelve el contenedor de desplazamiento más cercano y el pie
         pegajoso de adentro deja de medirse contra la ventana. */
      className={cn(
        'overflow-x-clip bg-surface',
        !sinMarco && 'rounded-lg border border-border',
      )}
      data-testid={`facturacion-${testid}`}
    >
      <div className="border-b border-border p-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-body font-semibold text-fg">{titulo}</h3>
          <p className="text-caption text-fg-muted">{descripcion}</p>
        </div>
        <div className="text-caption text-fg-muted sm:text-right">
          {/* 🔴 Del MES entero, no de lo que el buscador dejó a la vista. */}
          <p className="whitespace-nowrap">
            <span className="font-mono tabular-nums">{filas.length}</span>{' '}
            {filas.length === 1 ? 'factura' : 'facturas'} ·{' '}
            <span className="font-mono tabular-nums">
              {formatCurrency(filas.reduce((s, f) => s + f.totalCop, 0))}
            </span>
          </p>
          <p className="whitespace-nowrap">
            IVA{' '}
            <span className="font-mono tabular-nums">
              {formatCurrency(filas.reduce((s, f) => s + f.ivaCop, 0))}
            </span>{' '}
            · retenciones{' '}
            <span className="font-mono tabular-nums">
              {formatCurrency(filas.reduce((s, f) => s + f.retencionesCop, 0))}
            </span>
            {sinConfirmar > 0 && ` · ${sinConfirmar} sin confirmar`}
          </p>
          {conMora.length > 0 && (
            /* «Recargos», no «interés»: `recargosCop` suma el interés de mora
               Y el gasto administrativo. */
            <p
              className="whitespace-nowrap"
              data-testid={`facturacion-${testid}-mora`}
              title="Interés de mora y gasto administrativo, según las reglas de mora de la inmobiliaria."
            >
              Recargos de mora{' '}
              <span className="font-mono tabular-nums">{formatCurrency(moraCop)}</span> en{' '}
              {conMora.length} {conMora.length === 1 ? 'factura' : 'facturas'}
            </p>
          )}
        </div>
      </div>

      {sinEscenario.length > 0 && (
        <div
          className="flex flex-col gap-2 border-b border-border bg-warning-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          data-testid={`facturacion-${testid}-sin-escenario`}
        >
          <p className="flex items-start gap-2 text-sm text-fg">
            <SealWarning
              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
              weight="fill"
              aria-hidden="true"
            />
            <span>
              <span className="font-mono tabular-nums">
                {sinEscenario.length.toLocaleString('es-CO')}
              </span>{' '}
              {sinEscenario.length === 1
                ? 'factura del mes no se puede emitir: su contrato no tiene el escenario tributario confirmado y saldría sin los impuestos que lleva.'
                : 'facturas del mes no se pueden emitir: su contrato no tiene el escenario tributario confirmado y saldrían sin los impuestos que llevan.'}{' '}
              Confírmalo en el contrato con «Confirmar en el contrato».
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setSoloSinEscenario((v) => !v)}
            aria-pressed={verSoloSinEscenario}
            data-testid={`facturacion-${testid}-ver-sin-escenario`}
          >
            {verSoloSinEscenario ? 'Ver todas' : 'Ver sólo esas'}
          </Button>
        </div>
      )}

      {hayMoraSinIntereses && (
        <div
          className="flex items-start gap-2 border-b border-border bg-surface-muted px-4 py-3 text-sm text-fg"
          data-testid={`facturacion-${testid}-mora-del-mes`}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" weight="fill" aria-hidden="true" />
          <p>
            <span className="font-mono tabular-nums">{mora.enMora.toLocaleString('es-CO')}</span>{' '}
            {mora.enMora === 1
              ? 'cuota de este mes está en mora.'
              : 'cuotas de este mes están en mora.'}{' '}
            La factura del mes no lleva intereses: se facturan aparte, cuando se pagan.
            {mora.motivos.map((m) => ` ${m}`).join('')}
          </p>
        </div>
      )}

      {/* 🔴 El buscador, DENTRO de la tabla (Nico, 18-09). A su lado, cuántas
          filas quedaron a la vista. */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Contrato, tercero, documento, inmueble o concepto"
            aria-label={`Buscar en las facturas de ${titulo.toLowerCase()}`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid={`facturacion-${testid}-buscar`}
          />
        </div>
        <p
          className="text-caption text-fg-muted tabular-nums"
          data-testid={`facturacion-${testid}-alcance`}
        >
          {busqueda.trim() === '' ? (
            <>
              {filas.length} {filas.length === 1 ? 'factura' : 'facturas'} en el mes
            </>
          ) : (
            <>
              {visibles.length} de {filas.length} facturas.{' '}
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="font-medium text-primary underline-offset-4 hover:underline"
                data-testid={`facturacion-${testid}-limpiar-busqueda`}
              >
                Quitar la búsqueda
              </button>
            </>
          )}
        </p>
      </div>

      {esCelular ? (
        /* 🔴 FA-15: una tarjeta por factura. La tarjeta abre el cajón; la
           casilla marca y el botón emite (cada uno frena el clic). */
        pageItems.length === 0 ? (
          vacioDeLaTabla
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
              <Checkbox
                checked={todas}
                indeterminate={algunas}
                disabled={ocupado || porEmitir.length === 0}
                onCheckedChange={() => onAlternarTodas(porEmitir)}
                aria-label={
                  elegidas.length > 0
                    ? `Quitar la selección de ${titulo.toLowerCase()}`
                    : `Seleccionar todas las facturas de ${titulo.toLowerCase()}`
                }
                data-testid={`facturacion-${testid}-todas`}
              />
              <span className="text-caption text-fg-muted">
                {elegidas.length > 0 ? 'Quitar la selección' : 'Marcar todas las que se pueden emitir'}
              </span>
            </div>
            <ul className="divide-y divide-border" data-testid={`facturacion-${testid}-tarjetas`}>
              {pageItems.map((factura) => {
                const apagada = estadoDeLaFila(factura) !== 'por-emitir'
                const grupo = grupoDe(factura)
                return (
                  <li
                    key={factura.clave}
                    data-testid={`factura-${factura.clave}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver el detalle de la factura de ${aQuienSeFactura(factura)}`}
                    onClick={() => onAbrirDetalle(factura)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onAbrirDetalle(factura)
                      }
                    }}
                    className={cn(
                      'flex cursor-pointer gap-3 px-4 py-3.5 transition hover:bg-surface-muted/60',
                      apagada && 'opacity-70',
                      grupo && 'border-l-2 border-l-primary/50',
                    )}
                  >
                    <span className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      {casilla(factura)}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words font-medium text-fg">
                          {aQuienSeFactura(factura)}
                        </p>
                        <p className="shrink-0 font-mono font-medium tabular-nums text-fg">
                          {formatCurrency(factura.totalCop)}
                        </p>
                      </div>
                      <ConceptoDeLaFila factura={factura} />
                      <div className="text-caption">
                        <NumeroDelContrato factura={factura} />
                      </div>
                      {grupo?.primera ? <AvisoDeFacturaJunta factura={factura} /> : null}
                      <div onClick={(e) => e.stopPropagation()}>{estado(factura)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {/* 🔴 Con algo marcado, esta casilla LIMPIA (Nico, 18-09). Con
                      búsqueda puesta sólo toca lo que se ve. */}
                  <Checkbox
                    checked={todas}
                    indeterminate={algunas}
                    disabled={ocupado || porEmitir.length === 0}
                    onCheckedChange={() => onAlternarTodas(porEmitir)}
                    aria-label={
                      elegidas.length > 0
                        ? `Quitar la selección de ${titulo.toLowerCase()}`
                        : `Seleccionar todas las facturas de ${titulo.toLowerCase()}`
                    }
                    data-testid={`facturacion-${testid}-todas`}
                  />
                </TableHead>
                {/* 🔴 FA-04 (QA-FACT, 03-10): cinco columnas, no once. El
                    contrato va debajo del cliente; el inmueble y el período,
                    debajo del concepto; base, IVA y retención, debajo del total.
                    Así cabe entera a 1.440 px y nada queda fuera de vista. */}
                <TableHead className="whitespace-nowrap">Cliente</TableHead>
                <TableHead className="whitespace-nowrap">Concepto</TableHead>
                <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                {/* 🔴 19-09: la acción de la fila («Generar esta») tiene que estar
                    siempre donde se la busca: la columna se ancla a la derecha. */}
                <TableHead className="sticky right-0 z-20 whitespace-nowrap border-l border-border bg-bg dark:bg-surface-muted">
                  Estado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    {vacioDeLaTabla}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((factura) => {
                  const apagada =
                    factura.estado === 'EMITIDA' || estadoDeLaFila(factura) !== 'por-emitir'
                  const grupo = grupoDe(factura)
                  return (
                    /* 🔴 La fila tiene DOS blancos: la casilla marca (y el botón
                       del final emite), y todo el resto abre el cajón. */
                    <TableRow
                      key={factura.clave}
                      data-testid={`factura-${factura.clave}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver el detalle de la factura de ${aQuienSeFactura(factura)}`}
                      onClick={() => onAbrirDetalle(factura)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onAbrirDetalle(factura)
                        }
                      }}
                      className={cn(
                        'cursor-pointer transition hover:bg-surface-muted/60',
                        apagada && 'opacity-70',
                      )}
                    >
                      <TableCell
                        className={cn('w-10', grupo && 'border-l-2 border-l-primary/50')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {casilla(factura)}
                      </TableCell>
                      <TableCell className="w-[30%] min-w-[180px] max-w-[260px] align-top">
                        {/* El nombre en dos renglones si hace falta, nunca «Ana So…». */}
                        <p className="line-clamp-2 break-words text-fg" title={aQuienSeFactura(factura)}>
                          {aQuienSeFactura(factura)}
                        </p>
                        {factura.terceroDocumento && (
                          <p className="truncate font-mono text-caption tabular-nums text-fg-muted">
                            {factura.terceroDocumento}
                          </p>
                        )}
                        <p className="truncate text-caption text-fg-muted">
                          Contrato <NumeroDelContrato factura={factura} />
                        </p>
                        {grupo?.primera ? <AvisoDeFacturaJunta factura={factura} /> : null}
                      </TableCell>
                      <TableCell className="min-w-[200px] max-w-[320px] align-top">
                        <ConceptoDeLaFila factura={factura} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap align-top">
                        <PlataDeLaFila factura={factura} />
                      </TableCell>
                      <TableCell
                        className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-surface align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {estado(factura)}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
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

      {accionesMasivas}
    </section>
  )
}

/**
 * CU-F-02 (QA-FACT-CONTA-95 r2): arriba de la lista de propietarios se dice que
 * la comisión SALE AL GIRAR (FA-R13, Nico 03-10: «se factura al marcar pagado su
 * giro»). Antes sólo cada fila decía «Se factura cuando se le gire».
 */
export const DESCRIPCION_DE_LAS_COMISIONES =
  'La comisión de administración del mes sale al girar: se factura cuando el giro al propietario queda pagado (o con «Facturar ahora» al marcar pagado el lote). Lo que el propietario paga y no se factura va a deducción del egreso.'

export interface NuevaFacturaProps {
  /**
   * Llevar a la pestaña «Resolución». La pestaña es estado local de la página,
   * no una URL, así que se recibe como callback: sin esto, el aviso de «no hay
   * resolución» diría a dónde ir y no llevaría.
   */
  onIrAResolucion?: () => void
}

export function NuevaFactura({ onIrAResolucion }: NuevaFacturaProps = {}) {
  const [mes, setMes] = useState(() => mesActual())
  /**
   * Hasta dónde MIRAR. Arranca en el mes elegido —que es el trabajo diario— y
   * el botón de al lado lo estira al 31 de diciembre, que es la pregunta del
   * CEO. Arrancar en diciembre le cobraría a todos los días una consulta que se
   * usa de vez en cuando.
   */
  const [hasta, setHasta] = useState(() => mesActual())
  const [datos, setDatos] = useState<FacturasPorGenerar | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  /**
   * 🔴 ¿La selección la pusimos nosotros o la puso la persona?
   *
   * Arranca en `true` porque al cargar el mes marcamos solas las facturas
   * emitibles. En cuanto toca una casilla pasa a `false` y ya no se vuelve a
   * prender hasta que se recargue el mes: a partir de ese clic la selección es
   * suya y llamarla «preseleccionamos» sería mentir.
   */
  const [seleccionSugerida, setSeleccionSugerida] = useState(true)
  /** Qué tabla se está mirando. Sólo una a la vez. */
  const [aQuien, setAQuien] = useState<DestinatarioDeFactura>('INQUILINO')
  const [generando, setGenerando] = useState(false)
  /** El «Ver más» del pie (FA-04 / FA-15): lo que explica, plegado. */
  const [verMasDelPie, setVerMasDelPie] = useState(false)

  const meses = useMemo(() => mesesParaElegir(), [])
  /* Los topes se recalculan con el mes elegido: un tope anterior al mes sería
     un rango al revés, y el back lo rechaza. */
  const topes = useMemo(() => topesParaElegir(mes), [mes])

  const cargar = useCallback(async (elMes: string, elTope: string, silencioso = false) => {
    // 🔴 Después de emitir se relee EN SILENCIO (22-09, visto en vivo): con el
    // spinner de carga, la tabla desaparecía y el spinner se quedaba girando
    // debajo mientras el back volvía a armar el mes (730 contratos tardan). La
    // tabla que ya se ve se queda hasta que llega la nueva.
    if (!silencioso) setCargando(true)
    setError(null)
    try {
      const r = await facturacionPorMesService.porGenerar({
        desde: elMes,
        // Un tope anterior al mes elegido sería un rango al revés (400 del
        // back): se pide el mes solo, que es lo que la persona quiso decir.
        hasta: elTope && elTope >= elMes ? elTope : elMes,
      })
      setDatos(r)
      /*
       * Arranca seleccionado lo de INQUILINOS que se puede emitir HOY y es DEL
       * MES elegido: el pedido es facturar el mes, no ir marcando 800
       * casillas. Los meses de más adelante se miran, no se marcan.
       *
       * 🔴 Las comisiones de propietarios NO vienen marcadas (FA-R13, Nico
       * 03-10: «se factura al marcar pagado su giro»), ni lo que tiene el
       * escenario sin confirmar.
       */
      setSeleccionSugerida(true)
      setSeleccion(
        new Set(
          [...r.inquilinos, ...r.propietarios]
            .filter((f) => seSugiere(f, elMes))
            .map((f) => f.clave),
        ),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar(mes, hasta)
  }, [cargar, mes, hasta])

  /**
   * T-0163: un mes de un contrato con varios inquilinos sale en una factura por
   * inquilino y se emite junto: marcar o desmarcar una mueve a las demás. Es
   * comodidad de la pantalla; el back también expande al emitir.
   */
  const filasDelListado = useMemo(
    () => (datos ? [...datos.inquilinos, ...datos.propietarios] : []),
    [datos],
  )

  const alternarUna = (clave: string) => {
    setSeleccionSugerida(false)
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      const fila = filasDelListado.find((f) => f.clave === clave)
      const grupo = fila ? hermanasDeLaFila(fila, filasDelListado).map((f) => f.clave) : [clave]
      if (siguiente.has(clave)) {
        for (const c of grupo) siguiente.delete(c)
      } else {
        for (const c of expandirALasHermanas([clave], filasDelListado)) siguiente.add(c)
      }
      return siguiente
    })
  }

  /**
   * 🔴 Con ALGO marcado, limpia; sólo con nada marcado, marca todo.
   *
   * Antes la condición era «si están TODAS marcadas, quita»: estando en 726 de
   * 730 —el estado normal después de desmarcar cuatro— apretarla subía a 730,
   * y para dejar una sola había que apretarla dos veces y adivinar el orden.
   * Es media explicación de «selecciono sólo una y no da» (Nico, 18-09).
   *
   * `claves` son las filas VISIBLES de esa tabla: con el buscador puesto,
   * marcar toca sólo lo que se ve, que es lo que hace posible «sólo estas».
   */
  const alternarTodas = (claves: string[]) => {
    setSeleccionSugerida(false)
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (claves.some((c) => siguiente.has(c))) {
        for (const c of claves) siguiente.delete(c)
      } else {
        for (const c of expandirALasHermanas(claves, filasDelListado)) siguiente.add(c)
      }
      return siguiente
    })
  }

  /**
   * Las filas DEL MES elegido: son las que llevan casilla y las que se emiten.
   * Los meses de más adelante viven en `PrefacturasDelRango`, sin casillas.
   */
  const delMes = useMemo(() => {
    if (!datos) return { inquilinos: [], propietarios: [] }
    return {
      inquilinos: datos.inquilinos.filter((f) => f.mes === mes),
      propietarios: datos.propietarios.filter((f) => f.mes === mes),
    }
  }, [datos, mes])

  /**
   * 🔴 Las filas de la tabla que se está mirando. Nico, 19-09: «debe haber
   * algo para que sólo se pueda ver la tabla de inquilino y otra la de
   * propietarios, como un switch tab, para ver sólo una tabla».
   *
   * No es sólo comodidad: **mientras las dos tablas estaban una encima de la
   * otra, la acción masiva no podía vivir dentro de ninguna** —una sola
   * selección repartida en dos tablas obligaba a sacar el botón afuera, que es
   * de donde venimos—. Con una tabla a la vez, la selección de la vista, su
   * plata y su botón son de ESA tabla, y el pie vuelve adentro.
   */
  const filasDeLaVista = aQuien === 'INQUILINO' ? delMes.inquilinos : delMes.propietarios

  /** Las de la vista que HOY se pueden emitir: son las que llevan casilla. */
  const emitiblesDeLaVista = useMemo(
    () => filasDeLaVista.filter(sePuedeEmitirHoy),
    [filasDeLaVista],
  )

  /** La salida de la sugerencia, en un clic. Sólo suelta lo de ESTA tabla. */
  const quitarSeleccion = () => {
    setSeleccionSugerida(false)
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      for (const f of filasDeLaVista) siguiente.delete(f.clave)
      return siguiente
    })
  }

  const elegidas = useMemo(
    () => emitiblesDeLaVista.filter((f) => seleccion.has(f.clave)).map((f) => f.clave),
    [emitiblesDeLaVista, seleccion],
  )
  const totalElegido = useMemo(
    () =>
      emitiblesDeLaVista
        .filter((f) => seleccion.has(f.clave))
        .reduce((s, f) => s + f.totalCop, 0),
    [emitiblesDeLaVista, seleccion],
  )

  /**
   * 🔴 Cuántas filas del mes NO entran en la selección, y por qué. Sin este
   * renglón, «730 facturas en el mes» arriba y «Preseleccionamos 729» abajo se
   * leen como un error de la pantalla. Casi siempre es una que ya se emitió.
   */
  const yaEmitidas = filasDeLaVista.filter((f) => f.estado === 'EMITIDA').length
  const noEmitibles = filasDeLaVista.length - emitiblesDeLaVista.length - yaEmitidas

  /**
   * 🔴 Lo marcado en la OTRA pestaña. Emitir pasó a ser por tabla —es lo que
   * hace posible que el botón viva dentro de ella— y sin este renglón alguien
   * podría emitir los 729 de inquilinos y creer que el mes quedó facturado,
   * con 725 comisiones de propietario todavía marcadas y sin emitir.
   */
  const marcadasEnLaOtra = useMemo(() => {
    const otras = aQuien === 'INQUILINO' ? delMes.propietarios : delMes.inquilinos
    return otras.filter((f) => seleccion.has(f.clave) && sePuedeEmitirHoy(f)).length
  }, [aQuien, delMes, seleccion])

  /*
   * F3 (auditoría 13-09): la corrida va en tandas de 200 con «Detener». F2: si
   * algo NO salió —detenida, sin números o caída a mitad— queda un informe con
   * lo que salió, lo que no y qué hacer, hasta que se cierre o se cambie de
   * mes. Antes una tanda caída decía «No se pudieron emitir las facturas»
   * sobre las que sí habían salido.
   *
   * 🔴 El AVANCE y el «Detener» ya no se pintan acá (Nico, 23-09: «¿para qué
   * muestras la carga también en la tabla? Ya tenemos centro de procesos,
   * todas las cargas déjalas que sucedan allí y deja la pantalla quieta»).
   * Viven en la fila del centro: la corrida le presta su «Detener» apenas el
   * back le da el id del proceso (`registrarDetenerEnElNavegador`).
   */
  const detenerRef = useRef(false)
  const [corridaHecha, setCorridaHecha] = useState<ResultadoDeLaCorrida | null>(null)
  /** La fila abierta en el cajón. Es la MISMA que pinta la tabla. */
  const [detalle, setDetalle] = useState<FacturaDelMes | null>(null)
  /** La misma descarga para la fila, el cajón y el informe de la corrida. */
  const { descargarUna, descargando } = useDescargarFacturas()
  const descargarPdf = useCallback(
    (f: FacturaDelMes) => {
      if (f.facturaId) void descargarUna(f.facturaId, f.numeroDian)
    },
    [descargarUna],
  )

  useEffect(() => {
    // El informe es de UN mes: con otro mes elegido se leería como de éste.
    setCorridaHecha(null)
  }, [mes])

  /**
   * Emite. Sin argumento, lo que esté seleccionado; con `soloEstas`, esas y
   * nada más —es el botón «Generar esta» de la fila (Nico, 18-09)—, que no
   * toca la selección de las demás ni obliga a limpiarla primero.
   */
  async function generar(soloEstas?: string[]) {
    const claves = soloEstas ?? [...elegidas]
    if (claves.length === 0 || generando) return
    if (motivoParaNoEmitir !== null) return
    setGenerando(true)
    setCorridaHecha(null)
    detenerRef.current = false
    // Se asigna desde `onProceso`: un objeto para que TS no lo dé por `null`.
    const prestado: { soltar: (() => void) | null } = { soltar: null }
    try {
      // 🔴 El centro de procesos se hace presente (Nico, 22-09: «mandé a
      // emitir y el centro ni se abrió»): se abre solo con una emisión de
      // VARIAS. Con UNA no (FA-10, QA-FACT 03-10: se montaba encima de la
      // pantalla por una sola factura): basta el aviso con «Ver en el centro».
      if (claves.length > 1) {
        anunciarProceso({
          titulo: `Emitiendo ${claves.length} facturas`,
          tipoDeProceso: 'EMISION_DE_FACTURAS',
        })
      }
      const resultado = await generarPorTandas(
        mes,
        claves,
        (elMes, lote, corrida) => facturacionPorMesService.generar(elMes, lote, corrida),
        undefined,
        {
          debeParar: () => detenerRef.current,
          onProceso: (procesoId) => {
            prestado.soltar?.()
            prestado.soltar = registrarDetenerEnElNavegador(procesoId, detenerCorrida)
          },
        },
      )
      const { informe, corte } = resultado
      /*
       * 🔴 El resultado va al CENTRO DE PROCESOS, no a la página (Nico, 22-09:
       * «no creo que sea el lugar para mostrar eso ya cargado»). La fila
       * terminada tiene su resumen y «Descargar»; acá, un toast breve con
       * «Ver en el centro». En la página sólo queda el informe cuando algo
       * NO salió y hay que decir qué hacer.
       */
      setCorridaHecha(quedaronPendientes(informe) ? resultado : null)

      if (informe.emitidas > 0 || informe.yaEstaban > 0) {
        const partes = [
          `${informe.emitidas} ${informe.emitidas === 1 ? 'factura emitida' : 'facturas emitidas'}`,
          formatCurrency(informe.totalCop),
        ]
        if (informe.yaEstaban > 0) partes.push(`${informe.yaEstaban} ya estaban emitidas`)
        const ultimo = informe.procesosConZip.at(-1) ?? null
        toast.success(partes.join(' · '), {
          action: {
            label: 'Ver en el centro',
            onClick: () => abrirCentroDeProcesos({ procesoId: ultimo }),
          },
        })
      }
      // El rango de la resolución no alcanzó para todas: se emitió lo que cabía
      // y lo demás NO se numeró. Es un aviso aparte, no un renglón del éxito.
      if (informe.sinNumero > 0 && informe.motivos[0]) toast.error(informe.motivos[0])
      // QA-FACT: las que hoy no se pueden emitir no salieron, y se dice por qué.
      if ((informe.bloqueadas ?? 0) > 0) {
        toast.error(
          `${cuantos(informe.bloqueadas ?? 0, 'factura no se emitió', 'facturas no se emitieron')}. ${informe.motivosDeBloqueo?.[0] ?? ''}`.trim(),
        )
      }
      // FA-R10: lo numerado con una resolución de PRUEBA no se le entrega a nadie.
      if (informe.noEntregadasPorPrueba && informe.noEntregadasPorPrueba > 0) {
        toast.info(
          `${cuantos(informe.noEntregadasPorPrueba, 'factura salió', 'facturas salieron')} con una resolución de prueba: no se le entregan a ningún cliente.`,
        )
      }
      if (corte === 'fallo') toast.error(mensajeDelFalloDeEmision(resultado.error))

      // Lo que salió tiene que verse como emitido, también después de un
      // corte: y lo que quedó por emitir vuelve seleccionado para reintentar.
      await cargar(mes, hasta, true)
    } finally {
      prestado.soltar?.()
      setGenerando(false)
    }
  }

  /** El «Detener» de la fila del centro: se respeta al cerrar la tanda en curso. */
  function detenerCorrida() {
    detenerRef.current = true
    toast.info('Se detiene al terminar la tanda en curso.', {
      description: 'Lo que ya salió queda emitido, y volver a «Generar» no duplica nada.',
    })
  }

  /**
   * 🔴 FA-09 (QA-FACT, 03-10; Nico, la recomendada): emitir pide confirmación
   * con A QUIÉN, CUÁNTO y CON QUÉ NÚMERO va a salir. «Generar esta» emitía con
   * un clic una factura numerada (LABQA-1, Juliana $ 4.100.000) que no se
   * deshace: sólo se anula con una nota crédito. Lo mismo el botón del pie.
   */
  async function pedirYGenerar(pedidas: string[]) {
    if (pedidas.length === 0 || generando || motivoParaNoEmitir !== null) return
    const todasLasFilas = [...delMes.inquilinos, ...delMes.propietarios]
    // T-0163: «emitir esta» en un mes dividido emite a todos los inquilinos de ese
    // contrato: la confirmación tiene que decir cuántas facturas son de verdad.
    const expandidas = expandirALasHermanas(pedidas, todasLasFilas)
    const claves = [
      // En el orden del listado (el titular primero), que es el que numera el back.
      ...todasLasFilas.map((f) => f.clave).filter((c) => expandidas.has(c)),
      ...pedidas.filter((c) => !todasLasFilas.some((f) => f.clave === c)),
    ]
    const filas = claves
      .map((c) => todasLasFilas.find((f) => f.clave === c))
      .filter((f): f is FacturaDelMes => Boolean(f))
    const totalCop = filas.reduce((s, f) => s + f.totalCop, 0)
    const numeros = numerosQueSalen(resolucionDeLaVista, claves.length)
    const irreversible =
      'Una factura emitida no se borra: si algo está mal, se anula con una nota crédito.'
    const una = filas.length === 1 ? filas[0] : null
    const ok = await confirmar(
      una
        ? {
            titulo: numeros ? `¿Emitir la factura ${numeros}?` : '¿Emitir esta factura?',
            descripcion: (
              <>
                A nombre de <strong>{aQuienSeFactura(una)}</strong>
                {una.terceroDocumento ? ` (${una.terceroDocumento})` : ''}, por{' '}
                <span className="whitespace-nowrap font-mono tabular-nums">
                  {formatCurrency(una.totalCop)}
                </span>
                : {conceptosLegibles(una)} de {mesLegible(una.mes)}. {irreversible}
              </>
            ),
            accion: numeros ? `Emitir la ${numeros}` : 'Emitir la factura',
          }
        : {
            titulo: `¿Emitir ${claves.length.toLocaleString('es-CO')} facturas ${
              aQuien === 'INQUILINO' ? 'de inquilinos' : 'de propietarios'
            } de ${mesLegible(mes)}?`,
            descripcion: (
              <>
                Por{' '}
                <span className="whitespace-nowrap font-mono tabular-nums">
                  {formatCurrency(totalCop)}
                </span>
                {numeros ? `, numeradas de la ${numeros.replace(' a ', ' a la ')}` : ''}.
                {numerosQueFaltan !== null
                  ? ` La resolución sólo alcanza para ${resolucionDeLaVista?.disponibles.toLocaleString('es-CO')}: las demás van a fallar por rango agotado.`
                  : ''}{' '}
                {irreversible}
              </>
            ),
            accion: `Emitir ${claves.length.toLocaleString('es-CO')} facturas`,
          },
    )
    if (ok) await generar(claves)
  }

  /*
   * 🔴 FA-R24 (QA-FACT, 03-10): la pestaña de Propietarios miraba la resolución
   * del CANON (`datos.resolucion`). Las comisiones se numeran con la suya: la
   * que manda el back (`resolucionDeLaComision`) o, con un back anterior, la de
   * `GET /resolucion` (`porTipo`). Sin numeración por tipo, la general numera
   * todo y es la misma.
   */
  const [comisionPorTipo, setComisionPorTipo] = useState<EstadoDeLaResolucion | null>(null)
  useEffect(() => {
    if (!datos || datos.resolucionDeLaComision !== undefined) return
    let vivo = true
    void (async () => {
      try {
        const r = await facturacionPorMesService.resoluciones()
        const t = r.porTipoDisponible
          ? r.porTipo.find((x) => x.tipo === 'COMISION_PROPIETARIO')
          : undefined
        if (!vivo) return
        setComisionPorTipo(
          t
            ? {
                puedeNumerar: t.puedeNumerar,
                motivo: null,
                explicacion: t.explicacion,
                numero: t.resolucionNumero,
                prefijo: t.prefijo,
                desde: null,
                hasta: null,
                vigenteHasta: null,
                disponibles: t.disponibles,
                siguiente: t.siguiente,
              }
            : null,
        )
      } catch {
        // Sin esa lectura queda la general: es lo que hacía la pantalla antes.
      }
    })()
    return () => {
      vivo = false
    }
  }, [datos])

  const resolucionDeComision: EstadoDeLaResolucion | null = datos
    ? (datos.resolucionDeLaComision ?? comisionPorTipo ?? datos.resolucion)
    : null
  /** La resolución con la que se numera la pestaña que se está mirando. */
  const resolucionDeLaVista: EstadoDeLaResolucion | null = datos
    ? aQuien === 'PROPIETARIO'
      ? resolucionDeComision
      : datos.resolucion
    : null
  /**
   * Los números son UNA bolsa para las dos pestañas sólo si las dos numeran con
   * la misma resolución; con una propia para las comisiones, cada una cuenta lo
   * suyo.
   */
  const mismaBolsa =
    datos !== null &&
    resolucionDeComision !== null &&
    resolucionDeComision.numero === datos.resolucion.numero &&
    resolucionDeComision.prefijo === datos.resolucion.prefijo

  /**
   * 🔴 Por qué HOY no se puede emitir nada, en las palabras del back.
   *
   * Sin resolución vigente el back devuelve 400, así que el botón se apaga
   * — y hasta el 18-09 se apagaba MUDO: el porqué vivía en un banner arriba
   * de todo, a media pantalla de distancia. Nico apretó, no pasó nada, y lo
   * leyó como «no da el poder generar». Un control que no se mueve y no dice
   * por qué se lee como roto: el motivo va al lado del control, y con la
   * salida puesta.
   */
  const motivoParaNoEmitir: string | null =
    datos !== null && resolucionDeLaVista !== null && !resolucionDeLaVista.puedeNumerar
      ? sinLaRutaDeFacturacion(resolucionDeLaVista.explicacion) ||
        'No hay una resolución de facturación vigente con la cual numerar.'
      : null

  /*
   * 🔴 19-09 (visto en el navegador): el botón decía «Generar 208 facturas» y
   * justo encima, en la misma tarjeta, «50 números disponibles». La pantalla
   * tenía el dato y no sacaba la cuenta. Y no es un susto teórico: probado
   * contra datos reales el 19-09, el back numera las que alcanzan y las demás
   * fallan con «rango agotado» — o sea, apretar dejaba 50 facturas emitidas,
   * 158 errores y a alguien preguntándose qué pasó.
   *
   * Se AVISA, no se apaga: emitir las 50 que caben es trabajo legítimo, y
   * bloquear el botón obligaría a deseleccionar 158 filas a mano para hacerlo.
   */
  /**
   * 🔴 Los números de la resolución son UNA sola bolsa para las dos pestañas.
   * Emitir pasó a ser por tabla, pero el rango no se parte en dos: si hay 49
   * números y entre inquilinos y propietarios hay 1.454 marcadas, 1.405 van a
   * fallar sin importar en qué orden se emitan. Por eso el aviso cuenta las
   * DOS pestañas, aunque el botón emita una.
   */
  const marcadasEnTotal = elegidas.length + (mismaBolsa ? marcadasEnLaOtra : 0)
  const numerosQueFaltan: number | null =
    datos !== null &&
    resolucionDeLaVista !== null &&
    resolucionDeLaVista.puedeNumerar &&
    marcadasEnTotal > resolucionDeLaVista.disponibles
      ? marcadasEnTotal - resolucionDeLaVista.disponibles
      : null

  const vacio =
    datos !== null &&
    delMes.inquilinos.length === 0 &&
    delMes.propietarios.length === 0

  /*
   * 🔴 EL PIE de la tabla que se está mirando: lo marcado y lo que se puede
   * hacer con ello, pegado al borde de abajo mientras se recorren las filas y
   * DENTRO de la tarjeta de la tabla.
   *
   * Nico, 19-09: «mira que dejaste separado lo de acciones masivas con donde
   * se seleccionan, y sabes que cuando hay acciones masivas deben quedar
   * también en la tabla». Estaba suelto debajo porque las dos tablas
   * compartían una selección; con el switch tab hay una sola a la vez, así que
   * el pie vuelve adentro y todo lo que cuenta —las marcadas, la plata, el
   * botón— es de ESA tabla.
   */
  /*
   * 🔴 FA-04 / FA-15 (QA-FACT, 03-10-2026): el pie medía ~170 px a 1.440 (cinco
   * renglones) y tapaba ~40 % de la pantalla a 390. Queda UNA línea con lo
   * marcado y la acción; lo que explica (que es una sugerencia, cuántas quedan
   * fuera y por qué, lo marcado en la otra pestaña) va en «Ver más». Lo que
   * frena o va a fallar (sin resolución, rango corto) sigue a la vista, al lado
   * del botón.
   */
  const hayDetallesDelPie =
    (elegidas.length > 0 && seleccionSugerida) ||
    yaEmitidas > 0 ||
    noEmitibles > 0 ||
    marcadasEnLaOtra > 0
  const pieDeAccionesMasivas = (
  <BarraDeAccionesMasivas
    variant="pie"
    compacta
    // Bajo `lg` la barra de navegación del celular (56 px + la zona segura)
    // está fija abajo: el pie se pega ENCIMA de ella, no detrás (FA-15).
    className="bottom-[calc(env(safe-area-inset-bottom)+3.5625rem)] lg:bottom-0"
    testid="facturacion-acciones"
    marcadas={elegidas.length}
    queSon={['factura', 'facturas']}
    monto={elegidas.length > 0 ? formatCurrency(totalElegido) : null}
    sugerida={seleccionSugerida}
    deDonde={aQuien === 'INQUILINO' ? 'de inquilinos' : 'de propietarios'}
    onQuitar={quitarSeleccion}
    ocupado={generando}
    cuandoNoHayNada={`No hay ninguna factura marcada ${
      aQuien === 'INQUILINO' ? 'de inquilinos' : 'de propietarios'
    }. Marca las que quieras, o usa «Emitir esta» en una fila.`}
    nota={
      <>
        <Collapse open={verMasDelPie && hayDetallesDelPie} id="facturacion-acciones-detalle" className="space-y-0.5 pb-0.5">
        {/* La preselección dice que es nuestra (Nico, 19-09). */}
        {elegidas.length > 0 && seleccionSugerida && (
          <p className="text-caption text-fg-muted" data-testid="facturacion-acciones-es-sugerencia">
            Es una sugerencia de {mesLegible(mes)}: desmarca lo que no va, o quita la selección.
          </p>
        )}
        {/* 🔴 Por qué la preselección es más chica que la tabla. Sin este
            renglón, «730 facturas en el mes» arriba y «Preseleccionamos 729»
            abajo se leen como un error de la pantalla. */}
        {(yaEmitidas > 0 || noEmitibles > 0) && (
          <p className="text-caption text-fg-muted" data-testid="facturacion-fuera-de-la-tanda">
            {[
              yaEmitidas > 0
                ? `${yaEmitidas.toLocaleString('es-CO')} ${yaEmitidas === 1 ? 'ya está emitida' : 'ya están emitidas'}`
                : null,
              noEmitibles > 0
                ? `${noEmitibles.toLocaleString('es-CO')} todavía no se ${noEmitibles === 1 ? 'puede' : 'pueden'} emitir`
                : null,
            ]
              .filter(Boolean)
              .join(' y ')}{' '}
            de las {filasDeLaVista.length.toLocaleString('es-CO')} del mes.
          </p>
        )}
        {/* El mes no queda facturado con una sola tanda: lo dice acá. */}
        {marcadasEnLaOtra > 0 && (
          <p className="text-caption text-fg-muted" data-testid="facturacion-marcadas-en-la-otra">
            Y {marcadasEnLaOtra.toLocaleString('es-CO')}{' '}
            {marcadasEnLaOtra === 1 ? 'marcada' : 'marcadas'} en la pestaña de{' '}
            <button
              type="button"
              onClick={() => setAQuien(aQuien === 'INQUILINO' ? 'PROPIETARIO' : 'INQUILINO')}
              className="font-medium text-primary underline-offset-4 hover:underline"
              data-testid="facturacion-ir-a-la-otra"
            >
              {aQuien === 'INQUILINO' ? 'propietarios' : 'inquilinos'}
            </button>
            , que se emiten aparte.
          </p>
        )}
        </Collapse>
        {/* 🔴 Por qué está apagado, AL LADO del botón y con la salida
            puesta. El mismo motivo vivía sólo en un banner arriba de
            todo: Nico apretó, no pasó nada, y lo leyó como «no da el
            poder generar». Un control que no se mueve y no dice por
            qué se lee como roto. */}
        {!generando &&
          motivoParaNoEmitir === null &&
          numerosQueFaltan !== null &&
          datos !== null && (
            <p
              className="max-w-xl text-caption text-warning"
              data-testid="facturacion-rango-corto"
            >
              La resolución sólo tiene{' '}
              {(resolucionDeLaVista?.disponibles ?? 0).toLocaleString('es-CO')}{' '}
              {resolucionDeLaVista?.disponibles === 1 ? 'número' : 'números'} y
              tienes {marcadasEnTotal.toLocaleString('es-CO')}{' '}
              {marcadasEnTotal === 1 ? 'marcada' : 'marcadas'}
              {mismaBolsa && marcadasEnLaOtra > 0 ? ' entre las dos pestañas' : ''}: se
              numeran las primeras y{' '}
              {numerosQueFaltan === 1
                ? 'la otra va a fallar'
                : `las ${numerosQueFaltan.toLocaleString('es-CO')} restantes van a fallar`}{' '}
              por rango agotado.{' '}
              {onIrAResolucion && (
                <button
                  type="button"
                  onClick={onIrAResolucion}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  data-testid="facturacion-ir-a-resolucion-rango"
                >
                  Cargar otra resolución
                </button>
              )}
            </p>
          )}
        {!generando && motivoParaNoEmitir !== null && (
          <p
            className="max-w-xl text-caption text-warning"
            data-testid="facturacion-motivo-apagado"
          >
            {motivoParaNoEmitir}{' '}
            {onIrAResolucion && (
              <button
                type="button"
                onClick={onIrAResolucion}
                className="font-medium underline underline-offset-4"
                data-testid="facturacion-ir-a-resolucion"
              >
                Cargar la resolución
              </button>
            )}
          </p>
        )}
        {hayDetallesDelPie && (
          <button
            type="button"
            onClick={() => setVerMasDelPie((v) => !v)}
            aria-expanded={verMasDelPie}
            aria-controls="facturacion-acciones-detalle"
            className="text-caption font-medium text-primary underline-offset-4 hover:underline"
            data-testid="facturacion-acciones-ver-mas"
          >
            {verMasDelPie ? 'Ver menos' : 'Ver más'}
          </button>
        )}
      </>
    }
  >
    <Button
      hideArrow
      disabled={
        elegidas.length === 0 ||
        generando ||
        cargando ||
        // 🔴 Sin resolución vigente el back devuelve 400: apagar el
        // botón dice lo mismo sin hacer perder la selección. La de ESTA
        // pestaña: las comisiones pueden tener su propia resolución (FA-R24).
        motivoParaNoEmitir !== null
      }
      onClick={() => void pedirYGenerar([...elegidas])}
      data-testid="facturacion-generar"
    >
      <Receipt className="h-4 w-4" weight="bold" />
      {/* 🔴 Sin spinner ni «200 de 450» (Nico, 23-09): el avance es del centro
          de procesos. El botón queda apagado mientras la corrida manda sus
          tandas —apretarlo otra vez no haría nada útil— y dice dónde mirar. */}
      {generando
        ? 'Emitiendo: míralo en el centro de procesos'
        : // Sin nada marcado, «Generar 0 facturas» es un rótulo que
          // nadie escribiría: el botón dice qué hace y el pie de al
          // lado dice por qué está apagado.
          elegidas.length === 0
          ? 'Emitir facturas'
          : (
            // UN solo hijo de texto: el `Button` es flex con `gap`, y dos hijos
            // sueltos se leían «Generar 25 facturas  de inquilinos» (doble espacio).
            <span>
              {`Emitir ${elegidas.length} ${elegidas.length === 1 ? 'factura' : 'facturas'}`}
              {/* FA-15: a 390 px «de inquilinos» no cabe al lado de la ✕; la
                  pestaña ya lo dice. */}
              <span className="hidden sm:inline">
                {` ${aQuien === 'INQUILINO' ? 'de inquilinos' : 'de propietarios'}`}
              </span>
            </span>
          )}
    </Button>
  </BarraDeAccionesMasivas>
  )

  return (
    <div className="space-y-4">
      {/* 🔴 La resolución de la DIAN manda: sin una vigente el back no emite
          nada, así que la pantalla lo dice ANTES de que alguien seleccione
          ochocientas filas y apriete un botón que va a fallar. El texto es el
          del back, con el motivo exacto (no cargada, vencida, anulada, rango
          agotado): cada uno se arregla distinto. */}
      {datos && !datos.resolucion.puedeNumerar && (
        <div
          className="rounded-lg bg-warning-soft border border-warning/30 p-3 flex items-start gap-2.5"
          data-testid="facturacion-sin-resolucion"
        >
          <SealWarning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">
            {sinLaRutaDeFacturacion(datos.resolucion.explicacion) ||
              'No hay una resolución de facturación vigente con la cual numerar.'}{' '}
            {onIrAResolucion && (
              <button
                type="button"
                onClick={onIrAResolucion}
                className="font-medium underline underline-offset-4"
                data-testid="facturacion-ir-a-resolucion-banner"
              >
                Cargar la resolución
              </button>
            )}
          </p>
        </div>
      )}


      {/* 🔴 UNA sola tarjeta: el mes, la resolución, las pestañas, la tabla y
          el pie de acciones masivas. Nico, 20-09, viendo los tres bloques
          sueltos uno encima del otro: «¿por qué esto no está pegado a la tabla
          de cada uno, inquilino y propietario?». Es el mismo chasis que ya
          había pedido para Pagos el 18 —«esto tiene que hacer parte de la
          tabla»—: el control con el que se filtra una tabla no es otro objeto
          que la tabla. */}
      {/* 🔴 23-09 (Nico: «tarjeta dentro de tarjeta dentro de tarjeta»): esto
          YA vive dentro de la tarjeta de pestañas de Facturación; un segundo
          borde acá era la tarjeta de adentro. Pestañas + filtros + tabla son UNA
          tarjeta: acá sólo hay separadores. */}
      <section className="overflow-x-clip" data-testid="facturacion-por-facturar">
      <div className="border-b border-border px-4 py-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="facturacion-mes"
              className="text-caption font-medium text-fg-muted"
            >
              Filtrar por mes
            </label>
            <Select
              value={mes}
              onValueChange={(m) => {
                setMes(m)
                // El tope nunca puede quedar antes del mes elegido: sería un
                // rango al revés y el back lo rechaza.
                setHasta((h) => (h && h >= m ? h : m))
              }}
            >
              <SelectTrigger
                id="facturacion-mes"
                className="w-56"
                data-testid="facturacion-selector-mes"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meses.map((m) => (
                  <SelectItem key={m} value={m}>
                    {mesLegible(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔴 «Ver hasta» es MIRAR, no emitir. El CEO (13-09): «Si quiero
              mirar qué facturas tengo por generar hasta el 31 de diciembre…
              Lo que NO se puede es enviarlas [antes de tiempo].» Por eso
              estira la consulta y no toca ni las casillas ni el botón. */}
          {/* 🔴 Un SELECT del design system, no el campo nativo de mes (Nico,
              21-09: «no estás usando los componentes de cadence, eso de hasta
              diciembre no se entiende como un filtro»).
              El `<input type="month">` pintaba el nombre EN EL IDIOMA DEL
              NAVEGADOR —«September 2026» en una pantalla entera en español— y
              abría el calendario del sistema, que no se parece a nada del
              producto. Y «Hasta diciembre» era un botón al lado, que se lee
              como una acción; ahora diciembre es una opción más de la misma
              lista, que es lo que siempre fue. */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="facturacion-hasta"
              className="text-caption font-medium text-fg-muted"
            >
              Ver hasta (sólo mirar)
            </label>
            <Select value={hasta || mes} onValueChange={(v) => setHasta(v)}>
              <SelectTrigger
                id="facturacion-hasta"
                className="w-56"
                data-testid="facturacion-hasta"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {mesLegible(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 🔴 Acá arriba quedan los FILTROS y lo que hay que saber antes de
            emitir. El botón que emite se fue al pie: hay DOS tablas debajo
            —Inquilinos y Propietarios— que comparten una sola selección, y
            desde arriba quedaba fuera de la pantalla justo cuando se estaba
            marcando (Nico, 19-09). */}
        {/* El resumen es UNA frase, debajo de los filtros y en su lugar de
            lectura —no dos líneas grises sueltas a la derecha—, y la
            numeración se dice como un dato: con qué resolución, cuál sigue y
            cuántos quedan. */}
        {datos && (
          <p className="text-body-sm text-fg-muted" data-testid="facturacion-resumen">
            <span className="font-medium text-fg tabular-nums">
              {datos.totales.contratos.toLocaleString('es-CO')}{' '}
              {datos.totales.contratos === 1 ? 'contrato' : 'contratos'}
            </span>{' '}
            {datos.totales.meses === 1
              ? `con cuotas de ${mesLegible(mes)}`
              : `con cuotas en ${datos.totales.meses} meses, hasta ${mesLegible(datos.hasta)}`}
            .
            {datos.resolucion.puedeNumerar && (
              <span data-testid="facturacion-siguiente-numero">
                {' '}
                {mismaBolsa ? 'Se numeran' : 'El canon se numera'} con la resolución{' '}
                <span className="font-mono text-fg">{datos.resolucion.numero}</span>: sigue la{' '}
                <span className="font-mono text-fg">{datos.resolucion.siguiente}</span> y quedan{' '}
                <span className="font-mono text-fg tabular-nums">{datos.resolucion.disponibles}</span>{' '}
                {datos.resolucion.disponibles === 1 ? 'número' : 'números'} hasta el{' '}
                {fechaLegible(datos.resolucion.vigenteHasta)}.
              </span>
            )}
            {/* FA-R24: las comisiones con su propia resolución, dicha aparte. */}
            {!mismaBolsa && resolucionDeComision?.puedeNumerar && (
              <span data-testid="facturacion-siguiente-numero-comision">
                {' '}Las comisiones, con la{' '}
                <span className="font-mono text-fg">{resolucionDeComision.numero}</span>: sigue la{' '}
                <span className="font-mono text-fg">{resolucionDeComision.siguiente}</span>.
              </span>
            )}
          </p>
        )}
      </div>

      {/* F2: lo que salió y lo que no, hasta que se cierre o cambie el mes. */}
      {corridaHecha && !generando && (
        <InformeDeFacturacion
          corrida={corridaHecha}
          onCerrar={() => setCorridaHecha(null)}
        />
      )}

      {/* 🔴 El rango sólo aparece cuando la persona lo pidió: con «Ver hasta»
          en el mismo mes, esta pantalla se ve exactamente como antes. Es la
          MISMA consulta mirada más lejos —la misma cuota, los mismos números—,
          pero sin casillas: emitir sigue siendo del mes de arriba. */}
      {datos && datos.meses.length > 1 && (
        <PrefacturasDelRango datos={datos} />
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={vacio}
        queEs="las facturas del mes"
        onReintentar={() => void cargar(mes, hasta)}
        cuandoVacio={
          <SinDatos
            queSon={`facturas por generar en ${mesLegible(mes)}`}
            icono={Receipt}
            descripcion="Ningún contrato de la inmobiliaria cubre ese mes. Elige otro mes o revisa las fechas de los contratos."
          />
        }
      >
        {datos && (
          <>
            {/* 🔴 UNA tabla a la vez. Nico, 19-09: «debe haber algo para que
                sólo se pueda ver la tabla de inquilino y otra la de
                propietarios, como un switch tab». El conteo va en la pestaña
                —el número y la forma de ver ese número, el mismo control— y
                las dos suman las facturas del mes. */}
            <div className="border-b border-border px-4 py-3">
            <SegmentedControl<DestinatarioDeFactura>
              aria-label="A quién se le factura"
              value={aQuien}
              onChange={setAQuien}
              options={[
                {
                  value: 'INQUILINO',
                  ariaLabel: 'Inquilinos',
                  label: (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      Inquilinos
                      <span className="tabular-nums text-fg-muted">
                        {delMes.inquilinos.length.toLocaleString('es-CO')}
                      </span>
                    </span>
                  ),
                },
                {
                  value: 'PROPIETARIO',
                  ariaLabel: 'Propietarios',
                  label: (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      Propietarios
                      <span className="tabular-nums text-fg-muted">
                        {delMes.propietarios.length.toLocaleString('es-CO')}
                      </span>
                    </span>
                  ),
                },
              ]}
            />
            </div>

            <TablaDeFacturas
              titulo={aQuien === 'INQUILINO' ? 'Inquilinos' : 'Propietarios'}
              descripcion={
                aQuien === 'INQUILINO'
                  ? 'El canon del período y los conceptos que se le facturan al inquilino.'
                  : DESCRIPCION_DE_LAS_COMISIONES
              }
              filas={filasDeLaVista}
              seleccion={seleccion}
              onAlternarUna={alternarUna}
              onAlternarTodas={alternarTodas}
              ocupado={generando}
              testid={aQuien === 'INQUILINO' ? 'inquilinos' : 'propietarios'}
              onGenerarUna={(clave) => void pedirYGenerar([clave])}
              motivoParaNoEmitir={motivoParaNoEmitir}
              onAbrirDetalle={setDetalle}
              accionesMasivas={pieDeAccionesMasivas}
              sinMarco
              onDescargarPdf={descargarPdf}
              descargando={descargando}
            />

            {/* 🔴 El cajón lee la MISMA fila que la tabla: no le pide nada al
                back, así que no puede decir algo distinto de lo que se acaba
                de ver ni dejar a nadie esperando. */}
            <CajonDeLaFactura
              factura={detalle}
              onCerrar={() => setDetalle(null)}
              onGenerarUna={(clave) => void pedirYGenerar([clave])}
              motivoParaNoEmitir={motivoParaNoEmitir}
              ocupado={generando}
              onDescargarPdf={descargarPdf}
              descargando={descargando}
            />

            {/* 🔴 Q6 (QA-FACT): los intereses que ya se pagaron, en su factura
                aparte y con la resolución de «Otros». Sólo se pinta si hay. */}
            {aQuien === 'INQUILINO' && <FacturasDeIntereses />}

            {/* Los contratos que tocan el mes y NO generan factura. Sin esto,
                la diferencia entre «735 contratos» y «730 facturas» no tiene
                explicación en ninguna parte. Va DENTRO de la tarjeta, como su
                último renglón: es una nota al pie de esta tabla, no otro tema. */}
            {datos.omitidos.length > 0 && (
              <details
                className="border-t border-border p-4"
                data-testid="facturacion-omitidos"
              >
                <summary className="cursor-pointer text-body-sm text-fg flex items-center gap-2">
                  <Warning className="h-4 w-4 text-fg-muted" weight="fill" />
                  {datos.omitidos.length}{' '}
                  {datos.omitidos.length === 1
                    ? 'cuota no genera factura'
                    : 'cuotas no generan factura'}
                </summary>
                <ul className="mt-3 space-y-1.5">
                  {datos.omitidos.slice(0, 50).map((o) => (
                    <li
                      key={`${o.contractId}-${o.mes}-${o.destinatario}`}
                      className="text-caption text-fg-muted"
                    >
                      {/* El número que la inmobiliaria conoce, y el nuestro rotulado. */}
                      <span className="tabular-nums">
                        {o.numeroExterno ?? `#${o.codigo ?? '—'}`}
                        {o.numeroExterno && o.codigo !== null && ` · Leasefy #${o.codigo}`}
                      </span>{' '}
                      · {o.inmueble} · {mesLegible(o.mes)} ·{' '}
                      {o.destinatario === 'INQUILINO' ? 'inquilino' : 'propietario'}:{' '}
                      {o.motivo}
                    </li>
                  ))}
                  {datos.omitidos.length > 50 && (
                    <li className="text-caption text-fg-muted">
                      …y {datos.omitidos.length - 50} más.
                    </li>
                  )}
                </ul>
              </details>
            )}
          </>
        )}
      </EstadoDeDatos>
      </section>
    </div>
  )
}
