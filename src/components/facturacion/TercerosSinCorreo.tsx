'use client'

/**
 * «Terceros sin correo» — la lista para completarlos.
 *
 * Nico (2026-09-17): «el correo es OBLIGATORIO (se exige al crear/actualizar el
 * tercero y queda marcado si falta)», y a la vez «inquilino sin correo: se
 * emite igual y se entrega por WhatsApp o enlace».
 *
 * Esta pantalla es la mitad amable de esa regla. Crear un tercero sin correo
 * ya se frena en el formulario; a los que YA existen sin él —Portofino migró
 * 1.733 propietarios y no todos lo traían— no se les bloquea nada: salen acá,
 * ordenados por lo que cuestan (primero el que más contratos tiene, y entre
 * iguales el que no tiene ni WhatsApp, porque a ése no le llega NADA).
 */

import { useCallback, useEffect, useState } from 'react'
import { EnvelopeSimpleOpen } from '@phosphor-icons/react'

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
import {
  facturacionElectronicaService,
  type ClaseDeTercero,
  type TercerosSinCorreo as Datos,
} from '@/lib/api/facturacion-electronica.service'

export function TercerosSinCorreo() {
  const [datos, setDatos] = useState<Datos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [clase, setClase] = useState<ClaseDeTercero | ''>('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(
        await facturacionElectronicaService.tercerosSinCorreo(
          clase || undefined,
        ),
      )
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [clase])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div className="space-y-4" data-testid="terceros-sin-correo">
      {datos && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2.5 ${
            datos.sinCorreo === 0
              ? 'bg-surface-muted border-border'
              : 'bg-warning-soft border-warning/30'
          }`}
          data-testid="terceros-resumen"
        >
          <EnvelopeSimpleOpen
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              datos.sinCorreo === 0 ? 'text-fg-muted' : 'text-warning'
            }`}
            weight="fill"
          />
          <div className="space-y-1">
            <p className="text-caption text-fg">
              {datos.sinCorreo === 0
                ? `Todos tus ${datos.total} terceros tienen correo: sus facturas salen con el XML y el PDF.`
                : `${datos.sinCorreo} de ${datos.total} terceros no tienen correo. A ${datos.sinCorreoConWhatsapp} les llega por WhatsApp; a ${datos.sinNingunCanal} no les llega nada y su factura queda esperando en un enlace.`}
            </p>
            <p className="text-caption text-fg-muted">
              {datos.exigido
                ? 'Un tercero nuevo no se crea sin correo. Los que ya existen no se bloquean: se completan desde su ficha.'
                : 'El correo obligatorio está apagado para esta inmobiliaria. Préndelo cuando tengas los correos cargados.'}
              {!datos.configurable &&
                ' (La política llega con una migración que todavía no está aplicada en esta base.)'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="terceros-clase" className="text-caption text-fg-muted">
          Tipo
        </label>
        <select
          id="terceros-clase"
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
          value={clase}
          onChange={(e) => setClase(e.target.value as ClaseDeTercero | '')}
          data-testid="terceros-clase"
        >
          <option value="">Todos</option>
          <option value="INQUILINO">Inquilinos</option>
          <option value="PROPIETARIO">Propietarios</option>
        </select>
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="los terceros sin correo"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nombre</TableHead>
                <TableHead className="whitespace-nowrap">Tipo</TableHead>
                <TableHead className="whitespace-nowrap">Documento</TableHead>
                <TableHead className="whitespace-nowrap">Teléfono</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Contratos
                </TableHead>
                <TableHead className="whitespace-nowrap">Mientras tanto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!datos || datos.terceros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <SinDatos
                      queSon="terceros sin correo"
                      icono={EnvelopeSimpleOpen}
                      titulo="Todos tus terceros tienen correo"
                      descripcion="Sus facturas electrónicas salen con el XML y el PDF, y queda la constancia de cada entrega."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                datos.terceros.map((t) => (
                  <TableRow key={`${t.clase}-${t.id}`} data-testid={`tercero-${t.id}`}>
                    <TableCell className="text-fg">{t.nombre}</TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {t.clase === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {t.documento ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {t.telefono ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {t.contratos}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${t.tieneWhatsapp ? 'text-fg-muted' : 'text-danger'}`}
                    >
                      {t.tieneWhatsapp
                        ? 'Se le entrega por WhatsApp'
                        : 'No le llega nada: queda en un enlace'}
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
