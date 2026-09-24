'use client'

/**
 * «Documento soporte» — lo que se emite al pagarle a quien no factura.
 *
 * Nico y Juan Camilo (2026-09-17): «cuando se le paga a un proveedor no
 * obligado a facturar (técnicos), Leasefy genera el documento soporte
 * electrónico con su propia numeración y sus retenciones, y lo transmite».
 *
 * ── 🔴 Lo que la pantalla NO puede callar ──────────────────────────────────
 *
 * Que una retención no se pudo liquidar. Nadie dio las tarifas de retención
 * por servicios, así que el documento sale con ese impuesto en CERO y marcado,
 * y acá se dice con todas las letras qué falta configurar. «Este proveedor no
 * tiene retención» y «no sabemos cuál es su retención» no pueden verse iguales:
 * la primera es una decisión y la segunda es un error que alguien tiene que
 * arreglar antes de que lo encuentre el contador.
 *
 * La vista previa es obligatoria por lo mismo: el documento se ve ANTES de
 * emitirse, con sus retenciones y sus avisos, porque después lleva un número
 * que no se borra.
 */

import { useCallback, useEffect, useState } from 'react'
import { Receipt, Warning } from '@phosphor-icons/react'

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
import { Cajon, CajonCabecera, CajonCuerpo, CajonPie } from '@/components/ui/cajon'
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import {
  facturacionElectronicaService,
  pesos,
  type DocumentosSoporte as Documentos,
  type LiquidacionDelDocumentoSoporte,
  type ProveedoresNoObligados,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'

interface Formulario {
  proveedorId: string
  fecha: string
  concepto: string
  valorCop: string
}

const VACIO: Formulario = {
  proveedorId: '',
  fecha: '',
  concepto: '',
  valorCop: '',
}

export function DocumentoSoporte() {
  const [documentos, setDocumentos] = useState<Documentos | null>(null)
  const [proveedores, setProveedores] = useState<ProveedoresNoObligados | null>(
    null,
  )
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [form, setForm] = useState<Formulario>(VACIO)
  const [previa, setPrevia] = useState<LiquidacionDelDocumentoSoporte | null>(
    null,
  )
  const [trabajando, setTrabajando] = useState(false)
  /** El cajón de emitir: es un evento, no un filtro de la tabla. */
  const [emitiendo, setEmitiendo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [d, p] = await Promise.all([
        facturacionElectronicaService.documentosSoporte(),
        facturacionElectronicaService.proveedores(),
      ])
      setDocumentos(d)
      setProveedores(p)
    } catch (e) {
      setError(e)
      setDocumentos(null)
      setProveedores(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const campo = (clave: keyof Formulario) => (valor: string) => {
    setForm((previo) => ({ ...previo, [clave]: valor }))
    // Cualquier cambio invalida la vista previa: nunca se emite contra una
    // liquidación que ya no corresponde a lo que dice el formulario.
    setPrevia(null)
  }

  const completo =
    form.proveedorId !== '' &&
    form.fecha !== '' &&
    form.concepto.trim() !== '' &&
    Number(form.valorCop) > 0

  const lineas = [
    { concepto: form.concepto.trim(), valorCop: Number(form.valorCop) },
  ]

  async function previsualizar() {
    if (!completo || trabajando) return
    setTrabajando(true)
    try {
      setPrevia(
        await facturacionElectronicaService.previsualizarDocumentoSoporte({
          proveedorId: form.proveedorId,
          lineas,
        }),
      )
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo calcular el documento.',
      )
    } finally {
      setTrabajando(false)
    }
  }

  async function emitir() {
    if (!completo || !previa || trabajando) return
    setTrabajando(true)
    try {
      const r = await facturacionElectronicaService.emitirDocumentoSoporte({
        proveedorId: form.proveedorId,
        origenTipo: 'MANUAL',
        fecha: form.fecha,
        concepto: form.concepto.trim(),
        lineas,
      })
      toast.success(`Documento soporte ${r.numeroInterno} emitido`)
      setForm(VACIO)
      setPrevia(null)
      setEmitiendo(false)
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo emitir el documento.',
      )
    } finally {
      setTrabajando(false)
    }
  }

  const sinMigracion = documentos && !documentos.disponible

  return (
    <div className="space-y-4" data-testid="documento-soporte">
      {sinMigracion && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="documento-soporte-sin-migracion"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">{documentos.explicacion}</p>
        </div>
      )}

      {/* 🔴 EL CTA, NO EL FORMULARIO PUESTO (Nico, 22-09: «así hay muchas
          cosas no sólo en estas tablas dentro de facturación que deberían ser
          mejor un CTA que saque toda la información y ya funcione desde ahí»).
          Emitir un documento soporte se hace cuando le pagas a un técnico que
          no factura: es un evento, no un filtro. Cuatro campos debajo de la
          tabla se leen como los filtros de la tabla — pasó con la resolución,
          y acá tenía la misma forma. */}
      <section
        className="overflow-x-clip rounded-lg border border-border bg-surface"
        data-testid="documento-soporte-tarjeta"
      >
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-body font-semibold text-fg">
              Documentos soporte emitidos
            </h3>
            <p className="text-caption text-fg-muted">
              Lo que le pagas a un proveedor que NO factura. Lleva un número
              que no se borra y sustenta el gasto ante la DIAN.
            </p>
          </div>
          {proveedores?.disponible && (
            <Button
              hideArrow
              className="shrink-0"
              onClick={() => setEmitiendo(true)}
              data-testid="ds-abrir"
            >
              <Receipt className="h-4 w-4" weight="bold" />
              Emitir un documento soporte
            </Button>
          )}
        </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="los documentos soporte"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">N°</TableHead>
                <TableHead className="whitespace-nowrap">N° DIAN</TableHead>
                <TableHead className="whitespace-nowrap">Proveedor</TableHead>
                <TableHead className="whitespace-nowrap">Concepto</TableHead>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead className="whitespace-nowrap text-right">Base</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Retenciones
                </TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Se le paga
                </TableHead>
                <TableHead className="whitespace-nowrap">DIAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!documentos || documentos.documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <SinDatos
                      queSon="documentos soporte"
                      icono={Receipt}
                      titulo={
                        sinMigracion
                          ? 'El documento soporte llega con una migración que falta'
                          : 'Todavía no has emitido ningún documento soporte'
                      }
                      descripcion={
                        documentos?.explicacion ??
                        'Cuando le pagas a un técnico que no factura, el documento soporte es lo que soporta ese gasto ante la DIAN.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                documentos.documentos.map((d) => (
                  <TableRow key={d.id} data-testid={`documento-soporte-${d.id}`}>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg">
                      {d.numeroInterno}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {d.numeroDian ?? '—'}
                    </TableCell>
                    <TableCell className="text-fg-muted">
                      {d.proveedorNombre}
                    </TableCell>
                    <TableCell className="max-w-[18rem] truncate text-fg-muted">
                      {d.concepto}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {fechaLegible(d.fecha)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {pesos(d.baseCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {pesos(d.retefuenteCop + d.reteivaCop + d.reteicaCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg">
                      {pesos(d.netoCop)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {d.transmision?.estadoNombre ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>
      </section>

      {proveedores?.disponible && (
        <Cajon
          abierto={emitiendo}
          onOpenChange={(v) => {
            // Mientras la orden viaja no se cierra: cerrar a mitad dejaría sin
            // saber si el documento quedó emitido, y lleva número.
            if (!v && trabajando) return
            setEmitiendo(v)
          }}
          ancho="sm:max-w-xl"
          data-testid="cajon-del-documento-soporte"
        >
          <CajonCabecera
            titulo="Emitir un documento soporte"
            descripcion="Se ve primero con sus retenciones y después se emite: lleva un número que no se borra."
          />
          <CajonCuerpo className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ds-proveedor">Proveedor</Label>
              <select
                id="ds-proveedor"
                className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
                value={form.proveedorId}
                onChange={(e) => campo('proveedorId')(e.target.value)}
                data-testid="ds-proveedor"
              >
                <option value="">Elige el proveedor</option>
                {proveedores.proveedores
                  .filter((p) => p.activo)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                      {p.faltaPerfilTributario ? ' · falta su perfil' : ''}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-fecha">Fecha</Label>
              <Input
                id="ds-fecha"
                type="date"
                value={form.fecha}
                onChange={(e) => campo('fecha')(e.target.value)}
                data-testid="ds-fecha"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-concepto">Qué se le pagó</Label>
              <Input
                id="ds-concepto"
                value={form.concepto}
                onChange={(e) => campo('concepto')(e.target.value)}
                placeholder="Cambio de la llave del baño del apto 302"
                data-testid="ds-concepto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ds-valor">Valor</Label>
              <Input
                id="ds-valor"
                type="number"
                value={form.valorCop}
                onChange={(e) => campo('valorCop')(e.target.value)}
                placeholder="200000"
                data-testid="ds-valor"
              />
            </div>
          </div>

          {previa && (
            <div
              className="rounded-lg border border-border bg-surface-muted p-3 space-y-2"
              data-testid="ds-previa"
            >
              <p className="text-caption text-fg">
                Base {pesos(previa.baseCop)} · IVA {pesos(previa.ivaCop)} ·
                retenciones{' '}
                {pesos(
                  previa.retefuenteCop + previa.reteivaCop + previa.reteicaCop,
                )}{' '}
                · <strong>se le paga {pesos(previa.netoCop)}</strong>
              </p>
              {previa.sinConfirmar && (
                <p
                  className="text-caption text-warning"
                  data-testid="ds-sin-confirmar"
                >
                  Faltan datos para liquidar bien este documento. Sale igual —al
                  técnico hay que pagarle— pero queda marcado.
                </p>
              )}
              {previa.notas.length > 0 && (
                <ul className="space-y-0.5">
                  {previa.notas.map((n) => (
                    <li key={n} className="text-caption text-fg-muted">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          </CajonCuerpo>
          <CajonPie
            ayuda={
              !completo
                ? 'Faltan el proveedor, la fecha, el concepto y el valor.'
                : !previa
                  ? 'Primero mira las retenciones: es lo que de verdad se le paga.'
                  : 'Al emitirlo queda con número y no se borra.'
            }
          >
            <Button
              variant="outline"
              hideArrow
              onClick={() => void previsualizar()}
              disabled={!completo || trabajando}
              data-testid="ds-previsualizar"
            >
              Ver las retenciones
            </Button>
            <Button
              hideArrow
              onClick={() => void emitir()}
              disabled={!completo || !previa || trabajando}
              data-testid="ds-emitir"
            >
              Emitir el documento soporte
            </Button>
          </CajonPie>
        </Cajon>
      )}
    </div>
  )
}
