'use client'

/**
 * «Certificación del mandatario» — lo que el propietario necesita para declarar.
 *
 * Nico y Juan Camilo (2026-09-17): «la inmobiliaria emite el canon con su
 * propio NIT y numeración, marcando que actúa POR MANDATO, y le entrega al
 * propietario la CERTIFICACIÓN DEL MANDATARIO —lo facturado, IVA y
 * retenciones— para su declaración».
 *
 * ── Por qué se puede volver a generar ──────────────────────────────────────
 *
 * Porque la plata del período cambia: una nota crédito de marzo emitida en
 * mayo hace que la certificación de marzo diga otra cosa. Volver a generarla
 * ACTUALIZA la que había —hay una sola por propietario y período— en vez de
 * dejar dos documentos que se contradicen.
 *
 * ── Y por qué se exporta ───────────────────────────────────────────────────
 *
 * «Qué tan fácil de DISTRIBUIR sea dentro del software» (el CEO). La
 * certificación se descarga en CSV desde acá, con su detalle por factura: es lo
 * que el propietario le pasa a su contador.
 */

import { useCallback, useEffect, useState } from 'react'
import { Certificate, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import {
  facturacionElectronicaService,
  pesos,
  type CertificacionGenerada,
  type CertificacionesDelMandatario,
} from '@/lib/api/facturacion-electronica.service'

/** Las filas del CSV, como las lee un contador. */
export function comoCsv(c: CertificacionGenerada): string {
  const cabecera = [
    'Factura',
    'Mes',
    'Inmueble',
    'Inquilino',
    'Documento',
    'Base',
    'IVA',
    'Retefuente',
    'ReteIVA',
    'ReteICA',
    'Total',
    'Notas credito',
  ].join(';')
  const filas = c.detalle.map((r) =>
    [
      r.numeroDian ?? '',
      r.mes,
      r.inmueble.replace(/;/g, ','),
      r.inquilino.replace(/;/g, ','),
      r.inquilinoDocumento ?? '',
      r.baseCop,
      r.ivaCop,
      r.retefuenteCop,
      r.reteivaCop,
      r.reteicaCop,
      r.totalCop,
      r.notasCreditoCop,
    ].join(';'),
  )
  return [cabecera, ...filas].join('\n')
}

export interface CertificacionDelMandatarioProps {
  /** Precarga el propietario cuando se abre desde su ficha. */
  propietarioId?: string
}

export function CertificacionDelMandatario({
  propietarioId,
}: CertificacionDelMandatarioProps) {
  const [datos, setDatos] = useState<CertificacionesDelMandatario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [id, setId] = useState(propietarioId ?? '')
  const anio = new Date().getFullYear()
  const [desde, setDesde] = useState(`${anio}-01-01`)
  const [hasta, setHasta] = useState(`${anio}-12-31`)
  const [generando, setGenerando] = useState(false)
  const [ultima, setUltima] = useState<CertificacionGenerada | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(
        await facturacionElectronicaService.certificaciones(propietarioId),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [propietarioId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function generar() {
    if (id.trim() === '' || generando) return
    setGenerando(true)
    try {
      const c = await facturacionElectronicaService.generarCertificacion(
        id.trim(),
        { desde, hasta },
      )
      setUltima(c)
      toast.success(
        `Certificación de ${c.propietario.nombre} generada (${c.facturasContadas} facturas)`,
      )
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'No se pudo generar la certificación.',
      )
    } finally {
      setGenerando(false)
    }
  }

  const sinMigracion = datos && !datos.disponible

  return (
    <div className="space-y-4" data-testid="certificacion-del-mandatario">
      {sinMigracion && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="certificacion-sin-migracion"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">{datos.explicacion}</p>
        </div>
      )}

      <section
        className="rounded-lg border border-border bg-surface p-4 space-y-4"
        data-testid="certificacion-formulario"
      >
        <div>
          <h3 className="text-body font-semibold text-fg">
            Generar la certificación de un propietario
          </h3>
          <p className="text-caption text-fg-muted">
            Suma lo que le facturaste a sus inquilinos POR SU CUENTA en el
            período, restando las notas crédito. Volver a generarla actualiza la
            que había.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="cert-propietario">Propietario (id)</Label>
            <Input
              id="cert-propietario"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="id del propietario"
              data-testid="cert-propietario"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-desde">Desde</Label>
            <Input
              id="cert-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              data-testid="cert-desde"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-hasta">Hasta</Label>
            <Input
              id="cert-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              data-testid="cert-hasta"
            />
          </div>
        </div>
        <Button
          hideArrow
          onClick={() => void generar()}
          disabled={id.trim() === '' || generando}
          data-testid="cert-generar"
        >
          Generar la certificación
        </Button>

        {ultima && (
          <div
            className="rounded-lg border border-border bg-surface-muted p-3 space-y-2"
            data-testid="cert-resultado"
          >
            <p className="text-caption text-fg">
              {ultima.propietario.nombre} · {ultima.periodo.enPalabras} ·{' '}
              {ultima.facturasContadas} facturas · base {pesos(ultima.baseCop)} ·
              IVA {pesos(ultima.ivaCop)} · retenciones{' '}
              {pesos(
                ultima.retefuenteCop + ultima.reteivaCop + ultima.reteicaCop,
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              hideArrow
              onClick={() => {
                /*
                 * La descarga se arma acá, sin pedirle nada más al back: el
                 * detalle ya vino con la certificación. Es la misma idea del
                 * estado de cuenta — «qué tan fácil de distribuir sea».
                 */
                const blob = new Blob([comoCsv(ultima)], {
                  type: 'text/csv;charset=utf-8',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `certificacion-${ultima.propietario.nombre}-${ultima.periodo.desde.slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              data-testid="cert-exportar"
            >
              Descargar el detalle (CSV)
            </Button>
          </div>
        )}
      </section>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="las certificaciones del mandatario"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Propietario</TableHead>
                <TableHead className="whitespace-nowrap">Período</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Facturas
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">Base</TableHead>
                <TableHead className="whitespace-nowrap text-right">IVA</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Retenciones
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!datos || datos.certificaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <SinDatos
                      queSon="certificaciones del mandatario"
                      icono={Certificate}
                      titulo={
                        sinMigracion
                          ? 'La certificación llega con una migración que falta'
                          : 'Todavía no has generado ninguna certificación'
                      }
                      descripcion={
                        datos?.explicacion ??
                        'Es lo que cada propietario necesita para declarar: lo que le facturaste a sus inquilinos por su cuenta, con su IVA y sus retenciones.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                datos.certificaciones.map((c) => (
                  <TableRow key={c.id} data-testid={`certificacion-${c.id}`}>
                    <TableCell className="text-fg">
                      {c.propietarioNombre}
                      <p className="text-caption text-fg-muted">
                        {c.propietarioDocumento ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {c.enPalabras}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {c.facturasContadas}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {pesos(c.baseCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {pesos(c.ivaCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {pesos(c.retefuenteCop + c.reteivaCop + c.reteicaCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg">
                      {pesos(c.totalCop)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>
    </div>
  )
}
