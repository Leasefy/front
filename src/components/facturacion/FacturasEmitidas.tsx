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
 */

import { useCallback, useEffect, useState } from 'react'
import { Receipt, SealWarning } from '@phosphor-icons/react'
import { toast } from '@/components/ui/toast'

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
} from '@/lib/api/facturacion-por-mes.service'

const pesos = (v: number) => `$${v.toLocaleString('es-CO')}`

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

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await facturacionPorMesService.emitidas(mes))
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [mes])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function anular() {
    if (!porAnular || !motivoSuficiente(motivo)) return
    setAnulando(true)
    try {
      const nota = await facturacionPorMesService.emitirNotaCredito(
        porAnular.id,
        { concepto, motivo: motivo.trim() },
      )
      toast.success(
        `Nota crédito ${nota.numeroDeLaNota} por ${pesos(nota.valorCop)}. La factura queda, neteada.`,
      )
      setPorAnular(null)
      setMotivo('')
      await cargar()
    } catch (e) {
      // El back manda el porqué con su `code`; mostrarlo es la diferencia
      // entre «no se pudo» y saber qué hacer.
      toast.error(
        e instanceof Error ? e.message : 'No se pudo emitir la nota crédito.',
      )
    } finally {
      setAnulando(false)
    }
  }

  const facturas = datos?.facturas ?? []
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
        vacio={filas.length === 0}
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
                : `Ninguna factura de ${mesLegible(mes)} se anuló`
            }
            descripcion={
              vista === 'ventas'
                ? 'Las que corresponde emitir están en «Nueva factura»: ahí se calculan y se emiten.'
                : 'Una nota crédito aparece acá cuando anulas una factura ya emitida. La factura no se borra: quedan las dos.'
            }
          />
        }
      >
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
            {facturas.map((f) =>
              vista === 'ventas' ? (
                <TableRow key={f.id} data-testid={`factura-${f.numero}`}>
                  <TableCell className="tabular-nums">{f.numero}</TableCell>
                  <TableCell className="tabular-nums">
                    {f.numeroDian ?? '—'}
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
                  <TableCell className="text-right tabular-nums">
                    {pesos(f.totalCop)}
                  </TableCell>
                  <TableCell>
                    {f.anulacion.puede ? (
                      <Button
                        variant="outline"
                        size="sm"
                        hideArrow
                        onClick={() => {
                          setConcepto('ANULACION')
                          setMotivo('')
                          setPorAnular(f)
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
                  </TableCell>
                </TableRow>
              ) : null,
            )}
            {vista === 'notas' &&
              notas.map(({ factura: f, nota }) => (
                <TableRow key={nota.id} data-testid={`nota-${nota.numero}`}>
                  <TableCell className="tabular-nums">
                    {nota.numero}
                    {nota.parcial && (
                      <span className="block text-caption text-fg-muted">
                        Parcial
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
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
                  <TableCell className="text-right tabular-nums">
                    {pesos(nota.valorCop)}
                  </TableCell>
                  <TableCell>{fechaLegible(nota.createdAt)}</TableCell>
                  <TableCell className="max-w-[20rem] text-caption text-fg-muted">
                    {nota.notaContable ?? 'Se está registrando…'}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </EstadoDeDatos>

      <AlertDialog
        open={porAnular !== null}
        onOpenChange={(abierto) => {
          if (!abierto && !anulando) setPorAnular(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Anular la factura{' '}
              {porAnular?.numeroDian ?? `N.º ${porAnular?.numero ?? ''}`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La factura NO se borra: lleva un número que la DIAN autorizó. Se
              emite una nota crédito por {pesos(porAnular?.totalCop ?? 0)} que la
              netea, y quedan los dos documentos. En el libro se reversa la
              causación de ese mes; si el inquilino ya pagó, el neteo lo hace tu
              contador y la nota lo dice.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-concepto">Concepto (lo pide la DIAN)</Label>
              <select
                id="nc-concepto"
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={concepto}
                onChange={(e) =>
                  setConcepto(e.target.value as ConceptoDeNotaCredito)
                }
                disabled={anulando}
              >
                {CONCEPTOS.map((c) => (
                  <option key={c} value={c}>
                    {NOMBRE_DEL_CONCEPTO[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nc-motivo">Por qué la anulas</Label>
              <Textarea
                id="nc-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="El contrato se terminó el 3 y el mes se facturó completo."
                maxLength={500}
                disabled={anulando}
              />
              <p className="text-caption text-fg-muted">
                Queda en la nota crédito: la leen tu contador y la DIAN. Al menos{' '}
                {MOTIVO_MINIMO} caracteres.
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={anulando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void anular()
              }}
              disabled={anulando || !motivoSuficiente(motivo)}
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
