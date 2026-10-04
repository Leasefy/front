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
 *
 * 🔴 QA-FACT (03-10-2026, FA-16 / FA-R19 / FA-R27 / FA-R30): el filtro de estado
 * era un `<select>` del navegador con los códigos crudos (`POR_TRANSMITIR`,
 * `SIN_PROVEEDOR`); ahora es el `Select` del DS con los nombres de la casa. Y
 * sin proveedor conectado no se ofrecen «Volver a encolar N sin proveedor» ni
 * «Volver a intentar»: el documento volvía a «Sin proveedor» a los cinco
 * minutos, un botón que no sirve de nada.
 */

import { useCallback, useEffect, useState } from 'react'
import { CloudArrowUp, Info, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
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
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  ESTADOS_DE_TRANSMISION,
  NOMBRE_DEL_ESTADO_DE_TRANSMISION,
  facturacionElectronicaService,
  nombreDelDocumento,
  type ColaDeTransmision as Cola,
  type EstadoDeTransmision,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'
import { cuantos, faltaEnLaBase } from '@/lib/facturacion/por-facturar'

/** El `Select` del DS no acepta `''`: «todos» viaja con su clave. */
const TODOS = 'TODOS'

/**
 * 🔴 FA-R27: el «último error» llegaba tal cual del proveedor (códigos, trazas,
 * JSON). Se muestra si se lee como una frase; si no, se dice qué hacer.
 */
export function errorLegible(error: string | null): string | null {
  if (!error) return null
  const tecnico =
    /[A-Z]{3,}_[A-Z_]+|\bat\s+\S+\s*\(|[{}<>]|https?:\/\/|Error:|Exception|\bundefined\b/.test(error)
  return tecnico
    ? 'El proveedor respondió con un error técnico. Si se repite, escríbenos con el número del documento.'
    : error
}

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
      // Con la regla de oro (02-10-2026).
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudo volver a encolar.',
          accion: 'volver a encolar el documento',
        }),
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
          : `${cuantos(r.reencolados, 'documento volvió', 'documentos volvieron')} a la cola`,
      )
      await cargar()
    } catch (e) {
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No se pudieron volver a encolar.',
          accion: 'volver a encolar los documentos',
        }),
      )
    } finally {
      setReintentando(null)
    }
  }

  const sinProveedor = datos?.resumen.SIN_PROVEEDOR ?? 0
  /** Sin proveedor conectado, volver a encolar no transmite nada. */
  const hayProveedor = datos?.disponible === true && datos.proveedorConfigurado

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
          <p className="text-caption text-fg">
            {faltaEnLaBase('La cola de transmisión a la DIAN')}
          </p>
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
                : 'Todavía no hay proveedor tecnológico conectado. Tus facturas se numeran con tu resolución y quedan en esta cola, pero NO están validadas ante la DIAN hasta que se conecte.'}
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
                <span className="font-mono tabular-nums">
                  {a.numeroDian ?? nombreDelDocumento(a.documentoTipo)}
                </span>
                : {cuantos(a.horas, 'hora', 'horas')} y {cuantos(a.intentos, 'intento', 'intentos')}.
                {a.ultimoError ? ` Último error: ${errorLegible(a.ultimoError)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label htmlFor="cola-filtro" className="text-caption text-fg-muted">
          Estado
        </label>
        <Select
          value={filtro === '' ? TODOS : filtro}
          onValueChange={(v) => setFiltro(v === TODOS ? '' : (v as EstadoDeTransmision))}
        >
          <SelectTrigger id="cola-filtro" className="w-full sm:w-64" data-testid="cola-filtro">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los estados</SelectItem>
            {ESTADOS_DE_TRANSMISION.map((e) => (
              <SelectItem key={e} value={e}>
                {NOMBRE_DEL_ESTADO_DE_TRANSMISION[e]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hayProveedor && sinProveedor > 0 && (
          <Button
            variant="outline"
            hideArrow
            onClick={() => void reintentarLosSinProveedor()}
            disabled={reintentando !== null}
            data-testid="cola-reintentar-sin-proveedor"
          >
            Volver a encolar {cuantos(sinProveedor, 'documento', 'documentos')} sin proveedor
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
                          ? 'La cola todavía no está disponible'
                          : 'Todavía no hay documentos en la cola'
                      }
                      descripcion={
                        datos && !datos.disponible
                          ? faltaEnLaBase('La cola de transmisión a la DIAN')
                          : 'Cada documento que emitas entra acá y se transmite a la DIAN cuando el proveedor tecnológico esté conectado. El recaudo no espera a esto.'
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
                    <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg-muted">
                      {d.numeroDian ?? '—'}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${TONO[d.estado] ?? 'text-fg'}`}
                    >
                      {d.estadoNombre}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                      {d.intentos}
                    </TableCell>
                    <TableCell className="max-w-[28rem] text-caption text-fg-muted">
                      {/* Sin proveedor, el porqué es el mismo en todas las filas y
                          ya lo dice el aviso de arriba: no se repite (como FA-03). */}
                      {d.cufe ??
                        d.cude ??
                        (d.estado === 'SIN_PROVEEDOR' ? null : errorLegible(d.ultimoError)) ??
                        '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {fechaLegible(d.encoladaAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {/* Sin proveedor conectado, reintentar no transmite nada. */}
                      {d.reintentable && hayProveedor && (
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
