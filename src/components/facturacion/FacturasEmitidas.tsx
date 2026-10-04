'use client'

/**
 * Lo YA emitido de un mes, y cómo se anula.
 *
 * 🔴 DECISIÓN DE NEGOCIO (Nico, 2026-09-15) — CAMBIABLE, y por eso está escrita
 * acá y en `back-erp/src/inmobiliaria/facturacion/nota-credito.ts`: una factura
 * emitida NO se anula borrándola. Lleva un número que la DIAN autorizó y ese
 * número tiene que poder rastrearse siempre. Anular es emitir OTRO documento
 * —la NOTA CRÉDITO— con concepto y motivo obligatorios; quedan los dos, cada
 * uno apuntando al otro, y la contabilidad refleja el neteo.
 *
 * Y cuando la anulación no se puede (la factura se emitió antes de que
 * existiera la resolución, o ya tiene su nota), la fila lo DICE en vez de
 * ofrecer un botón que va a fallar.
 *
 * Esta pantalla también cierra F4 de la auditoría del 13-09: las pestañas de
 * documentos decían «todavía no tienes facturas de venta» después de emitir
 * 800, porque no había NINGUNA ruta que listara lo emitido. Ahora la hay
 * (`GET /inmobiliaria/facturacion/emitidas`).
 *
 * 🔴 QA-FACT (03-10-2026), con las decisiones de Nico de ese día:
 *   · la nota crédito BAJA la deuda de la cuota (con su renglón en el estado de
 *     cuenta): el diálogo ya no dice «el neteo lo hace tu contador»; si el
 *     error era sólo de un dato del documento, sale en el mismo paso la factura
 *     corregida y la deuda queda igual (`efecto: 'SOLO_EL_DOCUMENTO'`);
 *   · «Notas (NC/ND)» también lista las notas DÉBITO con su IVA, y las notas
 *     crédito GENERADAS (sin número) se emiten desde ahí;
 *   · la plata con un solo formato (`formatCurrency`) y en la fuente de cifras;
 *     el concepto con el `Select` del DS.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DownloadSimple, MagnifyingGlass, Prohibit, Receipt, SealWarning } from '@phosphor-icons/react'
import { RadioGroup, RadioGroupItem } from '@leasefy/cadence'
import { toast } from '@/components/ui/toast'
import { confirmar } from '@/components/ui/confirmar'
import { formatCurrency } from '@/lib/format'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { CorregirFactura } from './CorregirFactura'
import { useDescargarFacturas } from './useDescargarFacturas'
import { Input } from '@/components/ui/input'
import { TablePagination } from '@/components/ui/pagination'
import { PAGE_SIZE_OPTIONS, useTablePagination } from '@/lib/hooks/use-table-pagination'
import { EsqueletoTabla } from '@/components/estado/EsqueletoTabla'
import { SinDatos } from '@/components/estado/SinDatos'
import {
  facturacionPorMesService,
  fechaLegible,
  mesLegible,
  NOMBRE_DEL_CONCEPTO,
  type ConceptoDeNotaCredito,
  type FacturaEmitida,
  type FacturasEmitidasDelMes,
  type NotaCreditoDeLaFactura,
  type NotaDelMes,
} from '@/lib/api/facturacion-por-mes.service'
import { descargarBlob } from '@/lib/reportes/exportables'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  facturacionElectronicaService,
  type NotaDebito,
} from '@/lib/api/facturacion-electronica.service'

const CONCEPTOS: ConceptoDeNotaCredito[] = [
  'ANULACION',
  'DEVOLUCION',
  'REBAJA',
  'AJUSTE_DE_PRECIO',
  'OTROS',
]

/** El motivo que exige el back: al menos diez caracteres de verdad. */
export const MOTIVO_MINIMO = 10

export function motivoSuficiente(motivo: string): boolean {
  return motivo.trim().length >= MOTIVO_MINIMO
}

interface Props {
  mes: string
  /** `ventas` lista las facturas; `notas`, las notas crédito que las anulan. */
  vista: 'ventas' | 'notas'
}

export function FacturasEmitidas({ mes, vista }: Props) {
  const [datos, setDatos] = useState<FacturasEmitidasDelMes | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)

  /** La factura que se está por anular: abre el diálogo que pide el motivo. */
  const [porAnular, setPorAnular] = useState<FacturaEmitida | null>(null)
  const [concepto, setConcepto] = useState<ConceptoDeNotaCredito>('ANULACION')
  const [motivo, setMotivo] = useState('')
  const [anulando, setAnulando] = useState(false)
  /**
   * ¿Qué estaba mal? `cobro` = la deuda baja; `documento` = sale la corregida
   * en el mismo paso y la deuda queda igual (Nico, 03-10).
   */
  const [queEstabaMal, setQueEstabaMal] = useState<'cobro' | 'documento'>('cobro')
  /** Las notas DÉBITO del mes (Q8): van en «Notas (NC/ND)» con su IVA. */
  const [notasDebito, setNotasDebito] = useState<NotaDebito[]>([])
  /** La nota GENERADA que se está emitiendo. */
  const [emitiendoNota, setEmitiendoNota] = useState<string | null>(null)
  /**
   * 🔴 Las notas del mes como las lista el back de QA-FACT (`notas/lista`): por
   * el mes en que se EMITIERON, crédito y débito, con lo que movieron en la
   * deuda. `null` = un back sin esa ruta: se arman con las facturas del mes,
   * como antes.
   */
  const [notasDelMes, setNotasDelMes] = useState<NotaDelMes[] | null>(null)
  const [bajandoNota, setBajandoNota] = useState<string | null>(null)
  /** Lo que el back dijo del concepto o del motivo (02-10-2026): bajo su campo. */
  const [delServidor, setDelServidor] = useState<Partial<Record<'concepto' | 'motivo', string>>>({})
  // El foco va al primer campo rechazado cuando el diálogo vuelve a estar
  // habilitado (mientras viaja la orden, los campos están apagados).
  const [enfocar, setEnfocar] = useState<string | null>(null)
  useEffect(() => {
    if (anulando || !enfocar) return
    document.getElementById(enfocar)?.focus()
    setEnfocar(null)
  }, [enfocar, anulando])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    if (vista === 'notas') {
      try {
        const n = await facturacionPorMesService.notasDelMes(mes)
        if (n.disponible) {
          setNotasDelMes(n.notas)
          setDatos({ mes, anulacionDisponible: true, notaParcialDisponible: true, facturas: [] })
          setCargando(false)
          return
        }
      } catch {
        // Un back sin la ruta: lo de antes (las notas de las facturas del mes).
      }
      setNotasDelMes(null)
    }
    try {
      setDatos(await facturacionPorMesService.emitidas(mes))
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
    if (vista !== 'notas') return
    try {
      const nd = await facturacionElectronicaService.notasDebito()
      // Del mes de su factura, como las notas crédito de esta lista.
      setNotasDebito(nd.disponible ? nd.notas.filter((n) => n.mes === mes) : [])
    } catch {
      // Sin la lista de notas débito, las notas crédito se ven igual.
      setNotasDebito([])
    }
  }, [mes, vista])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function anular() {
    if (!porAnular || !motivoSuficiente(motivo)) return
    setAnulando(true)
    try {
      const soloElDocumento = queEstabaMal === 'documento'
      const nota = await facturacionPorMesService.emitirNotaCredito(porAnular.id, {
        concepto,
        motivo: motivo.trim(),
        ...(soloElDocumento ? { efecto: 'SOLO_EL_DOCUMENTO' as const } : {}),
      })
      const corregida = nota.facturaCorregida?.numeroDian ?? null
      toast.success(
        soloElDocumento
          ? `Nota crédito ${nota.numeroDeLaNota} por ${formatCurrency(nota.valorCop)}${
              corregida ? ` y factura corregida ${corregida}` : ''
            }. La deuda queda igual.`
          : `Nota crédito ${nota.numeroDeLaNota} por ${formatCurrency(nota.valorCop)}. ${
              nota.deuda?.explicacion ?? 'La deuda de la cuota baja en ese valor.'
            }`,
      )
      // La corregida que no pudo salir en el mismo paso: el porqué del back.
      if (soloElDocumento && !corregida && nota.facturaCorregida?.motivo) {
        toast.error(nota.facturaCorregida.motivo)
      }
      setPorAnular(null)
      setMotivo('')
      await cargar()
    } catch (e) {
      // El back manda el porqué con su `code`; mostrarlo es la diferencia
      // entre «no se pudo» y saber qué hacer. Con la regla de oro
      // (02-10-2026): lo que es del concepto o del motivo va debajo de su
      // campo; lo demás al toast (un 5xx dice «de nuestro lado» con la
      // referencia; «conexión», sólo sin respuesta).
      const { porCampo, sueltos } = repartirErroresDelServidor<'concepto' | 'motivo'>(e, {
        campos: ['concepto', 'motivo'],
        porDefecto: 'No se pudo emitir la nota crédito.',
        accion: 'emitir la nota crédito',
      })
      setDelServidor(porCampo)
      if (porCampo.concepto) setEnfocar('nc-concepto')
      else if (porCampo.motivo) setEnfocar('nc-motivo')
      if (sueltos.length > 0) toast.error(sueltos.join(' · '))
    } finally {
      setAnulando(false)
    }
  }

  /**
   * 🔴 Emitir una nota crédito GENERADA (la que nació sin número al anular un
   * cobro con factura; Q6, 03-10). Numera: se confirma.
   */
  async function emitirNota(
    factura: { numeroDian: string | null; numero?: number | null },
    nota: { id: string; valorCop: number; deCobroAnulado?: boolean },
  ) {
    if (emitiendoNota) return
    const ok = await confirmar({
      titulo: `¿Emitir la nota crédito de la factura ${factura.numeroDian ?? `N.º ${factura.numero ?? ''}`}?`,
      descripcion: nota.deCobroAnulado
        ? `Por ${formatCurrency(nota.valorCop)}. Es la de un cobro anulado: queda con su número, la deuda sigue y el mes vuelve a «Por facturar». Una nota emitida no se borra.`
        : `Por ${formatCurrency(nota.valorCop)}. Queda con su número y no se borra.`,
      accion: 'Emitir la nota crédito',
    })
    if (!ok) return
    setEmitiendoNota(nota.id)
    try {
      const r = await facturacionPorMesService.emitirNotaGenerada(nota.id)
      toast.success(`Nota crédito ${r.numeroDeLaNota} emitida`)
      await cargar()
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo emitir la nota crédito.',
          accion: 'emitir la nota crédito',
        }),
      )
    } finally {
      setEmitiendoNota(null)
    }
  }

  /** El PDF de una nota crédito emitida (FA-R02: la nota tiene su papel). */
  async function bajarNota(n: NotaDelMes) {
    if (bajandoNota) return
    setBajandoNota(n.id)
    try {
      const blob = await facturacionPorMesService.pdfDeLaNota(n.id)
      descargarBlob(blob, `nota-credito-${n.numero ?? 'sin-numero'}.pdf`)
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo bajar el PDF de la nota.',
          accion: 'bajar el PDF de la nota',
        }),
      )
    } finally {
      setBajandoNota(null)
    }
  }

  const facturas = useMemo(() => datos?.facturas ?? [], [datos])

  /** Bajar el PDF de una factura con número (la fila y la tarjeta). */
  const botonDelPdf = (f: FacturaEmitida) =>
    f.numeroDian ? (
      <Button
        size="icon"
        variant="ghost"
        hideArrow
        className="ml-1 h-8 w-8 align-middle"
        disabled={descargando !== null}
        isLoading={descargando === f.id}
        aria-label={`Descargar el PDF de la factura ${f.numeroDian}`}
        title="Descargar el PDF"
        onClick={() => void descargarUna(f.id, f.numeroDian)}
        data-testid={`ventas-pdf-${f.numero}`}
      >
        <DownloadSimple className="h-4 w-4" aria-hidden="true" />
      </Button>
    ) : null

  /** Anular con nota crédito, o por qué no; y las correcciones (la fila y la tarjeta). */
  const accionesDeLaFactura = (f: FacturaEmitida) => (
    <>
      {f.anulacion.puede ? (
        <Button
          variant="outline"
          size="sm"
          hideArrow
          onClick={() => {
            setConcepto('ANULACION')
            setMotivo('')
            setQueEstabaMal('cobro')
            setPorAnular(f)
            setDelServidor({})
          }}
          data-testid={`anular-${f.numero}`}
        >
          Anular con nota crédito
        </Button>
      ) : (
        /* 🔴 Sin botón, con la razón: un botón que va a fallar es
           peor que no tenerlo. */
        <span
          className="text-caption text-fg-muted"
          data-testid={`sin-anular-${f.numero}`}
        >
          {f.anulacion.explicacion}
        </span>
      )}
      {/* 🔴 Y las dos correcciones nuevas del 17-09: acreditar
          una PARTE y cobrar de más. Se ofrecen sólo cuando el
          back dice que se puede. */}
      <span className="mt-1 block">
        <CorregirFactura factura={f} onHecho={cargar} />
      </span>
    </>
  )
  /*
   * 🔴 FA-R30 (QA-FACT, 03-10-2026): Ventas no tenía buscador, ni paginación,
   * ni PDF por fila (la migrada trae 800 facturas en un mes, y el PDF sólo se
   * bajaba desde «Por facturar»).
   */
  const [busqueda, setBusqueda] = useState('')
  const sinTildes = (t: string) =>
    t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const ventas = useMemo(() => {
    const q = sinTildes(busqueda)
    if (vista !== 'ventas' || q === '') return facturas
    return facturas.filter((f) =>
      sinTildes(
        [String(f.numero), f.numeroDian, f.terceroNombre, f.terceroDocumento, f.inmueble]
          .filter(Boolean)
          .join(' '),
      ).includes(q),
    )
  }, [facturas, busqueda, vista])
  const paginado = useTablePagination(ventas, { resetKey: `${mes}|${busqueda}` })
  /*
   * 🔴 QA-FACT ronda 2 (Nico, la recomendada): a 390 px la tabla de Ventas se
   * corría de lado dentro de su tarjeta. Por debajo de 768 px cada factura es una
   * TARJETA con el cliente, el número y el total, con su PDF y sus acciones, como
   * «Por facturar». En escritorio sigue la tabla.
   */
  const esCelular = useIsMobile()
  const { descargarUna, descargando } = useDescargarFacturas()
  /*
   * 🔴 «Notas» lista TODAS las notas crédito de cada factura, no una sola.
   * Desde el 17-09 una factura puede tener varias PARCIALES además de la total,
   * y una pestaña que muestra sólo la primera esconde plata que ya se acreditó.
   */
  const notas = facturas.flatMap((f) =>
    (f.notasCredito ?? (f.notaCredito ? [f.notaCredito] : [])).map((n) => ({
      factura: f,
      nota: n,
    })),
  )
  const filas: (FacturaEmitida | { factura: FacturaEmitida; nota: NotaCreditoDeLaFactura })[] =
    vista === 'ventas' ? facturas : notas

  return (
    <div className="space-y-3">
      {datos && !datos.anulacionDisponible && vista === 'ventas' ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3 text-caption text-fg"
          data-testid="anulacion-no-disponible"
        >
          <SealWarning
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          Anular una factura con nota crédito todavía no está disponible en esta
          base: falta aplicar la migración. Avísale a tu equipo técnico; el resto
          de facturación funciona igual.
        </p>
      ) : null}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={
          vista === 'notas' && notasDelMes !== null
            ? notasDelMes.length === 0
            : filas.length === 0 && (vista === 'ventas' || notasDebito.length === 0)
        }
        queEs={
          vista === 'ventas'
            ? 'las facturas emitidas'
            : 'las notas crédito del mes'
        }
        onReintentar={cargar}
        esqueleto={<EsqueletoTabla filas={4} columnas={6} />}
        cuandoVacio={
          <SinDatos
            queSon={
              vista === 'ventas'
                ? 'facturas emitidas'
                : 'notas crédito'
            }
            icono={Receipt}
            titulo={
              vista === 'ventas'
                ? `Todavía no emitiste facturas de ${mesLegible(mes)}`
                : `No hay notas de las facturas de ${mesLegible(mes)}`
            }
            descripcion={
              vista === 'ventas'
                ? 'Las que corresponde emitir están en «Por facturar»: ahí se calculan y se emiten.'
                : 'Una nota crédito aparece acá cuando anulas o acreditas una factura ya emitida; una nota débito, cuando le cobras de más. La factura no se borra: quedan los dos documentos.'
            }
          />
        }
      >
        {vista === 'ventas' && facturas.length > 0 && (
          <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                aria-hidden="true"
              />
              <Input
                className="pl-9"
                placeholder="Número, cliente, documento o inmueble"
                aria-label="Buscar en las facturas emitidas"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                data-testid="ventas-buscar"
              />
            </div>
            <p className="text-caption text-fg-muted tabular-nums" data-testid="ventas-alcance">
              {busqueda.trim() === ''
                ? `${facturas.length.toLocaleString('es-CO')} ${facturas.length === 1 ? 'factura' : 'facturas'} en el mes`
                : `${ventas.length.toLocaleString('es-CO')} de ${facturas.length.toLocaleString('es-CO')} facturas`}
            </p>
          </div>
        )}
        {vista === 'ventas' && esCelular ? (
          ventas.length === 0 ? (
            <SinDatos
              hayFiltros
              queSon="facturas emitidas"
              icono={Receipt}
              onLimpiarFiltros={() => setBusqueda('')}
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border" data-testid="ventas-tarjetas">
              {paginado.pageItems.map((f) => (
                <li key={f.id} className="space-y-2 py-3.5" data-testid={`factura-${f.numero}`}>
                  <div className="flex items-start justify-between gap-3">
                    {/* El nombre en dos renglones si hace falta, nunca «Ana So…». */}
                    <p className="min-w-0 break-words font-medium text-fg">{f.terceroNombre}</p>
                    <p className="shrink-0 font-mono font-medium tabular-nums text-fg">
                      {formatCurrency(f.totalCop)}
                    </p>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-2 text-caption text-fg-muted">
                    <span>{f.destinatario === 'INQUILINO' ? 'Inquilino' : 'Propietario'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-fg">{f.numeroDian ?? 'Sin número DIAN'}</span>
                    <span className="font-mono tabular-nums">interna N.º {f.numero}</span>
                    {botonDelPdf(f)}
                  </p>
                  <p className="truncate text-caption text-fg-muted" title={f.inmueble}>
                    {f.inmueble}
                  </p>
                  <div>{accionesDeLaFactura(f)}</div>
                </li>
              ))}
            </ul>
          )
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {vista === 'ventas' ? (
                <>
                  <TableHead>Número</TableHead>
                  <TableHead>DIAN</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Inmueble</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Nota</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>En el libro</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vista === 'ventas' && ventas.length === 0 && facturas.length > 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <SinDatos
                    hayFiltros
                    queSon="facturas emitidas"
                    icono={Receipt}
                    onLimpiarFiltros={() => setBusqueda('')}
                  />
                </TableCell>
              </TableRow>
            )}
            {(vista === 'ventas' ? paginado.pageItems : facturas).map((f) =>
              vista === 'ventas' ? (
                <TableRow key={f.id} data-testid={`factura-${f.numero}`}>
                  <TableCell className="font-mono tabular-nums">{f.numero}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono tabular-nums">
                    {f.numeroDian ?? '—'}
                    {botonDelPdf(f)}
                  </TableCell>
                  <TableCell>
                    <span className="block">{f.terceroNombre}</span>
                    <span className="text-caption text-fg-muted">
                      {f.destinatario === 'INQUILINO'
                        ? 'Inquilino'
                        : 'Propietario'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[18rem] truncate">
                    {f.inmueble}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                    {formatCurrency(f.totalCop)}
                  </TableCell>
                  <TableCell>{accionesDeLaFactura(f)}</TableCell>
                </TableRow>
              ) : null,
            )}
            {/* 🔴 Las notas del mes como las lista el back de QA-FACT: por el día en
                que se emitieron, con lo que movieron en la deuda y su PDF. */}
            {vista === 'notas' &&
              notasDelMes !== null &&
              notasDelMes.map((n) => (
                <TableRow key={n.id} data-testid={`nota-del-mes-${n.id}`}>
                  <TableCell>
                    <span className="block font-mono tabular-nums">{n.numero ?? 'Sin número'}</span>
                    <span className="block text-caption text-fg-muted">
                      {n.tipo === 'NOTA_DEBITO' ? 'Nota débito' : 'Nota crédito'}
                      {n.parcial ? ' · parcial' : ''}
                    </span>
                    {n.estado === 'GENERADA' && n.puedeEmitir && (
                      <Button
                        variant="outline"
                        size="sm"
                        hideArrow
                        className="mt-1"
                        disabled={emitiendoNota !== null}
                        isLoading={emitiendoNota === n.id}
                        onClick={() => void emitirNota(n.factura, n)}
                        data-testid={`emitir-nota-${n.id}`}
                      >
                        Emitir
                      </Button>
                    )}
                    {n.estado === 'GENERADA' && !n.puedeEmitir && n.porQueNoSePuedeEmitir && (
                      <span className="mt-1 block max-w-[14rem] text-caption text-fg-muted">
                        {n.porQueNoSePuedeEmitir}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {n.factura.numeroDian ?? '—'}
                    <span className="block font-sans text-caption text-fg-muted">
                      {n.factura.terceroNombre}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[22rem]">
                    <span className="block">{n.conceptoNombre}</span>
                    <span className="text-caption text-fg-muted">{n.motivo}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="block font-mono tabular-nums">{formatCurrency(n.valorCop)}</span>
                    {n.ivaCop !== null && n.ivaCop > 0 && (
                      <span className="block font-mono text-caption tabular-nums text-fg-muted">
                        IVA {formatCurrency(n.ivaCop)}
                      </span>
                    )}
                    {n.enLaDeuda && (
                      <span className="block text-caption text-fg-muted" data-testid={`nota-deuda-${n.id}`}>
                        {n.enLaDeuda.movimiento === 'BAJA' ? 'Bajó' : 'Subió'} la deuda de{' '}
                        {mesLegible(n.enLaDeuda.mes)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fechaLegible(n.dia)}</TableCell>
                  <TableCell className="max-w-[20rem] text-caption text-fg-muted">
                    {n.notaContable ?? (n.estado === 'GENERADA' ? 'Sin emitir todavía.' : '—')}
                    {n.tienePdf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        hideArrow
                        className="mt-1 h-8 px-2"
                        disabled={bajandoNota !== null}
                        isLoading={bajandoNota === n.id}
                        onClick={() => void bajarNota(n)}
                        data-testid={`nota-pdf-${n.id}`}
                      >
                        <DownloadSimple className="h-4 w-4" aria-hidden="true" />
                        PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            {vista === 'notas' &&
              notasDelMes === null &&
              notas.map(({ factura: f, nota }) => (
                <TableRow key={nota.id} data-testid={`nota-${nota.numero ?? nota.id}`}>
                  <TableCell>
                    <span className="block font-mono tabular-nums">
                      {nota.numero ?? 'Sin número'}
                    </span>
                    {nota.parcial && (
                      <span className="block text-caption text-fg-muted">
                        Parcial
                      </span>
                    )}
                    {/* 🔴 Una nota GENERADA (al anular un cobro con factura) se
                        emite desde acá (Q6, 03-10): antes quedaba sin número
                        para siempre. */}
                    {(nota.estado === 'GENERADA' || nota.numero === null) && (
                      <Button
                        variant="outline"
                        size="sm"
                        hideArrow
                        className="mt-1"
                        disabled={emitiendoNota !== null}
                        isLoading={emitiendoNota === nota.id}
                        onClick={() => void emitirNota(f, nota)}
                        data-testid={`emitir-nota-${nota.id}`}
                      >
                        Emitir
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {f.numeroDian ?? `N.º ${f.numero}`}
                  </TableCell>
                  <TableCell className="max-w-[22rem]">
                    <span className="block">
                      {NOMBRE_DEL_CONCEPTO[nota.concepto]}
                    </span>
                    <span className="text-caption text-fg-muted">
                      {nota.motivo}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">
                    {formatCurrency(nota.valorCop)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fechaLegible(nota.createdAt)}</TableCell>
                  <TableCell className="max-w-[20rem] text-caption text-fg-muted">
                    {nota.notaContable ?? (nota.numero === null ? 'Sin emitir todavía.' : 'Se está registrando…')}
                  </TableCell>
                </TableRow>
              ))}
            {/* 🔴 Las notas DÉBITO (Q8, 03-10): con su IVA. Antes no salían en
                ninguna lista. */}
            {vista === 'notas' &&
              notasDelMes === null &&
              notasDebito.map((nd) => {
                const suFactura = facturas.find((f) => f.id === nd.facturaId) ?? null
                return (
                <TableRow key={nd.id} data-testid={`nota-debito-${nd.id}`}>
                  <TableCell>
                    <span className="block font-mono tabular-nums">
                      {nd.numeroDian ?? nd.numeroInterno}
                    </span>
                    <span className="block text-caption text-fg-muted">Nota débito</span>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums">
                    {suFactura?.numeroDian ?? (suFactura ? `N.º ${suFactura.numero}` : '—')}
                    <span className="block font-sans text-caption text-fg-muted">{nd.terceroNombre}</span>
                  </TableCell>
                  <TableCell className="max-w-[22rem]">
                    <span className="block">{nd.conceptoNombre}</span>
                    <span className="text-caption text-fg-muted">{nd.motivo}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="block font-mono tabular-nums">{formatCurrency(nd.valorCop)}</span>
                    <span className="block font-mono text-caption tabular-nums text-fg-muted">
                      {nd.ivaCop > 0 ? `IVA ${formatCurrency(nd.ivaCop)}` : 'Sin IVA'}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fechaLegible(nd.createdAt)}</TableCell>
                  <TableCell className="max-w-[20rem] text-caption text-fg-muted">—</TableCell>
                </TableRow>
                )
              })}
          </TableBody>
        </Table>
        )}
        {vista === 'ventas' && paginado.shouldPaginate && (
          <div className="border-t border-border pt-3">
            <TablePagination
              total={paginado.total}
              page={paginado.page}
              pageSize={paginado.pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={paginado.setPage}
              onPageSizeChange={paginado.setPageSize}
            />
          </div>
        )}
      </EstadoDeDatos>

      <AlertDialog
        open={porAnular !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !anulando) setPorAnular(null)
        }}
      >
        <AlertDialogContent variant="destructive" icon={<Prohibit weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Anular la factura{' '}
              {porAnular?.numeroDian ?? `N.º ${porAnular?.numero ?? ''}`}?
            </AlertDialogTitle>
            {/* 🔴 Nico (03-10-2026): la nota crédito BAJA la deuda. Antes decía
                «si el inquilino ya pagó, el neteo lo hace tu contador», y la
                cuota seguía debiendo lo mismo. */}
            <AlertDialogDescription>
              La factura NO se borra: lleva un número que la DIAN autorizó. Se
              emite una nota crédito por{' '}
              <span className="whitespace-nowrap font-mono tabular-nums">
                {formatCurrency(porAnular?.totalCop ?? 0)}
              </span>{' '}
              y quedan los dos documentos.{' '}
              {queEstabaMal === 'documento'
                ? 'En el mismo paso sale la factura corregida del mes, así que la deuda queda igual.'
                : porAnular?.destinatario === 'PROPIETARIO'
                  ? 'Es la comisión del propietario: no mueve la deuda del inquilino.'
                  : `La deuda de la cuota de ${porAnular ? mesLegible(porAnular.mes) : 'ese mes'} baja en ese valor, con su renglón en el estado de cuenta.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            {porAnular && (
              <div className="space-y-1.5">
                <Label id="nc-que-estaba-mal">Qué estaba mal</Label>
                {/* Radios del sistema de diseño, no los del navegador. */}
                <RadioGroup
                  className="space-y-2"
                  aria-labelledby="nc-que-estaba-mal"
                  value={queEstabaMal}
                  onValueChange={(v) => setQueEstabaMal(v === 'documento' ? 'documento' : 'cobro')}
                  disabled={anulando}
                >
                  {(
                    [
                      [
                        'cobro',
                        'El cobro: no se debía',
                        porAnular.destinatario === 'PROPIETARIO'
                          ? 'La comisión no se debía: la nota la anula.'
                          : 'La deuda de la cuota baja en el valor de la nota.',
                      ],
                      ['documento', 'Sólo un dato del documento', 'El nombre o un dato salió mal: sale la factura corregida y la deuda queda igual.'],
                    ] as const
                  ).map(([valor, nombre, ayuda]) => (
                    <label
                      key={valor}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-surface-hover"
                    >
                      <RadioGroupItem value={valor} className="mt-1" data-testid={`nc-mal-${valor}`} />
                      <span>
                        <span className="block text-sm text-fg">{nombre}</span>
                        <span className="block text-caption text-fg-muted">{ayuda}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="nc-concepto">Concepto (lo pide la DIAN)</Label>
              {/* FA-R30: el `Select` del DS, no el del navegador. */}
              <Select
                value={concepto}
                onValueChange={(v) => {
                  setConcepto(v as ConceptoDeNotaCredito)
                  setDelServidor((d) => ({ ...d, concepto: undefined }))
                }}
                disabled={anulando}
              >
                <SelectTrigger
                  id="nc-concepto"
                  className="w-full"
                  aria-invalid={delServidor.concepto ? true : undefined}
                  aria-describedby={delServidor.concepto ? 'nc-concepto-error' : undefined}
                  data-testid="nc-concepto"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONCEPTOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {NOMBRE_DEL_CONCEPTO[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorDelCampo id="nc-concepto-error" mensaje={delServidor.concepto} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-motivo">Por qué la anulas</Label>
              <Textarea
                id="nc-motivo"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  setDelServidor((d) => ({ ...d, motivo: undefined }))
                }}
                placeholder="El contrato se terminó el 3 y el mes se facturó completo."
                maxLength={500}
                disabled={anulando}
                aria-invalid={delServidor.motivo ? true : undefined}
                aria-describedby={delServidor.motivo ? 'nc-motivo-error' : undefined}
              />
              <p className="text-caption text-fg-muted">
                Queda en la nota crédito: la leen tu contador y la DIAN. Al menos{' '}
                {MOTIVO_MINIMO} caracteres.
              </p>
              <ErrorDelCampo id="nc-motivo-error" mensaje={delServidor.motivo} />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void anular()
              }}
              disabled={!motivoSuficiente(motivo)}
              loading={anulando}
              data-testid="confirmar-nota-credito"
            >
              {anulando ? 'Emitiendo…' : 'Emitir la nota crédito'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
