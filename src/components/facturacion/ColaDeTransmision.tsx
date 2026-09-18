'use client'

/**
 * «Electrónica (DIAN)» — la COLA de transmisión.
 *
 * Nico y Juan Camilo (2026-09-17): «si el proveedor o la DIAN se caen, las
 * facturas quedan generadas y en cola con reintento automático, con aviso si
 * algo lleva N horas sin transmitirse; **el recaudo no se frena** (el recibo de
 * caja funciona igual)».
 *
 * ── Qué reemplaza ──────────────────────────────────────────────────────────
 *
 * Esta pestaña decía «El listado llega con el motor DIAN» sobre una tabla
 * vacía. Ahora muestra la cola de verdad: en qué va cada documento, cuántas
 * veces se intentó, qué dijo la DIAN cuando lo rechazó y su CUFE cuando lo
 * aceptó.
 *
 * ── Las tres cosas que la pantalla no puede callar ─────────────────────────
 *
 *   1. **El proveedor**. Mientras no haya proveedor tecnológico conectado, los
 *      documentos quedan `SIN_PROVEEDOR`: numerados y válidos como documento
 *      interno, pero SIN validar ante la DIAN. Se dice arriba, con esas
 *      palabras, en vez de dejar que alguien lo suponga.
 *   2. **El recaudo no se frena.** Una cola llena de rojo asusta; que el recibo
 *      de caja funcione igual es parte del mensaje.
 *   3. **Un RECHAZO no se reintenta solo.** Mandarlo igual daría el mismo
 *      rechazo mil veces: lo arregla una persona —normalmente con nota crédito
 *      y factura nueva— y vuelve a encolarlo con el botón.
 */

import { useCallback, useEffect, useState } from 'react'
import { CloudArrowUp, Info, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
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
  ESTADOS_DE_TRANSMISION,
  facturacionElectronicaService,
  type ColaDeTransmision as Cola,
  type EstadoDeTransmision,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'

/** El color de cada estado. Rojo sólo para lo que de verdad está mal. */
const TONO: Record<EstadoDeTransmision, string> = {
  POR_TRANSMITIR: 'text-fg-muted',
  TRANSMITIDA: 'text-fg',
  ACEPTADA_DIAN: 'text-success',
  RECHAZADA_DIAN: 'text-danger',
  SIN_PROVEEDOR: 'text-warning',
}

export function ColaDeTransmision() {
  const [datos, setDatos] = useState<Cola | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [filtro, setFiltro] = useState<EstadoDeTransmision | ''>('')
  const [reintentando, setReintentando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await facturacionElectronicaService.cola(filtro || undefined))
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [filtro])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function reintentar(id: string) {
    if (reintentando) return
    setReintentando(id)
    try {
      await facturacionElectronicaService.reintentarTransmision(id)
      toast.success('El documento volvió a la cola')
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudo volver a encolar.',
      )
    } finally {
      setReintentando(null)
    }
  }

  async function reintentarLosSinProveedor() {
    if (reintentando) return
    setReintentando('todos')
    try {
      const r = await facturacionElectronicaService.reintentarLosSinProveedor()
      toast.success(
        r.reencolados === 0
          ? 'No había documentos esperando proveedor'
          : `${r.reencolados} documentos volvieron a la cola`,
      )
      await cargar()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'No se pudieron volver a encolar.',
      )
    } finally {
      setReintentando(null)
    }
  }

  const sinProveedor = datos?.resumen.SIN_PROVEEDOR ?? 0

  return (
    <div className="space-y-4" data-testid="cola-de-transmision">
      {datos && !datos.disponible && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="cola-sin-migracion"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">{datos.explicacion}</p>
        </div>
      )}

      {datos?.disponible && (
        <div
          className={`rounded-lg border p-3 flex items-start gap-2.5 ${
            datos.proveedorConfigurado
              ? 'bg-surface-muted border-border'
              : 'bg-warning-soft border-warning/30'
          }`}
          data-testid="cola-proveedor"
        >
          {datos.proveedorConfigurado ? (
            <CloudArrowUp
              className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5"
              weight="fill"
            />
          ) : (
            <Info
              className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
              weight="fill"
            />
          )}
          <div className="space-y-1">
            <p className="text-caption text-fg">
              {datos.proveedorConfigurado
                ? `Transmitiendo con ${datos.proveedor}.`
                : `Todavía no hay proveedor tecnológico conectado (${datos.proveedor}). Tus facturas se numeran con tu resolución y quedan en esta cola, pero NO están validadas ante la DIAN hasta que se conecte.`}
            </p>
            <p className="text-caption text-fg-muted">
              El recaudo no depende de esto: puedes hacer recibos de caja con la
              factura en cualquier estado.
            </p>
          </div>
        </div>
      )}

      {datos?.disponible && datos.avisos.length > 0 && (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 space-y-1"
          data-testid="cola-avisos"
        >
          <p className="text-caption font-semibold text-danger">
            {datos.avisos.length === 1
              ? 'Hay 1 documento que lleva demasiado tiempo sin transmitirse'
              : `Hay ${datos.avisos.length} documentos que llevan demasiado tiempo sin transmitirse`}
          </p>
          <ul className="space-y-0.5">
            {datos.avisos.slice(0, 10).map((a) => (
              <li key={a.transmisionId} className="text-caption text-fg">
                {a.numeroDian ?? a.documentoTipo}: {a.horas} horas y{' '}
                {a.intentos} intentos.
                {a.ultimoError ? ` Último error: ${a.ultimoError}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="cola-filtro" className="text-caption text-fg-muted">
          Estado
        </label>
        <select
          id="cola-filtro"
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as EstadoDeTransmision | '')}
          data-testid="cola-filtro"
        >
          <option value="">Todos</option>
          {ESTADOS_DE_TRANSMISION.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        {datos?.disponible && sinProveedor > 0 && (
          <Button
            variant="outline"
            hideArrow
            onClick={() => void reintentarLosSinProveedor()}
            disabled={reintentando !== null}
            data-testid="cola-reintentar-sin-proveedor"
          >
            Volver a encolar {sinProveedor} sin proveedor
          </Button>
        )}
      </div>

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="la cola de transmisión a la DIAN"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Documento</TableHead>
                <TableHead className="whitespace-nowrap">N° DIAN</TableHead>
                <TableHead className="whitespace-nowrap">Estado</TableHead>
                <TableHead className="whitespace-nowrap text-right">
                  Intentos
                </TableHead>
                <TableHead className="whitespace-nowrap">CUFE / motivo</TableHead>
                <TableHead className="whitespace-nowrap">En cola desde</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!datos || datos.documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <SinDatos
                      queSon="documentos en la cola de la DIAN"
                      icono={CloudArrowUp}
                      titulo={
                        datos && !datos.disponible
                          ? 'La cola llega con una migración que falta'
                          : 'Todavía no hay documentos en la cola'
                      }
                      descripcion={
                        datos?.explicacion ??
                        'Cada factura, nota o documento soporte que emitas entra acá y se transmite sola. El recaudo no espera a esto.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                datos.documentos.map((d) => (
                  <TableRow key={d.id} data-testid={`transmision-${d.id}`}>
                    <TableCell className="whitespace-nowrap text-fg">
                      {d.documentoNombre}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-fg-muted">
                      {d.numeroDian ?? '—'}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${TONO[d.estado] ?? 'text-fg'}`}
                    >
                      {d.estadoNombre}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-fg-muted">
                      {d.intentos}
                    </TableCell>
                    <TableCell className="max-w-[28rem] text-caption text-fg-muted">
                      {d.cufe ?? d.cude ?? d.ultimoError ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {fechaLegible(d.encoladaAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {d.reintentable && (
                        <Button
                          variant="outline"
                          size="sm"
                          hideArrow
                          onClick={() => void reintentar(d.id)}
                          disabled={reintentando !== null}
                          data-testid={`transmision-reintentar-${d.id}`}
                        >
                          Volver a intentar
                        </Button>
                      )}
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
