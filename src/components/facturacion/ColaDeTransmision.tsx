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

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CloudArrowUp, Copy, Info, Warning } from '@phosphor-icons/react'

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
import { confirmar } from '@/components/ui/confirmar'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { usePermissionsContextSafe } from '@/lib/context/PermissionsContext'
import {
  ESTADOS_DE_TRANSMISION,
  NOMBRE_DEL_ESTADO_DE_TRANSMISION,
  facturacionElectronicaService,
  nombreDelDocumento,
  type ColaDeTransmision as Cola,
  type DocumentoEnLaCola,
  type EstadoDeTransmision,
  type EstadoVisibleDeTransmision,
  type SaltoDeLaNumeracion,
} from '@/lib/api/facturacion-electronica.service'
import { useEstadoAnteLaDian } from './EstadoAnteLaDian'
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
    /[A-Z]{3,}_[A-Z_]+|\bat\s+\S+\s*\(|[{}<>]|https?:\/\/|Error:|Exception|\bundefined\b|fetch failed|ECONN|HTTP \d{3}/.test(error)
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

/** DIAN-FEEL: el color del estado en palabras (el back lo manda desde el 04-10). */
const TONO_VISIBLE: Record<EstadoVisibleDeTransmision, string> = {
  EN_COLA: 'text-fg-muted',
  REINTENTANDO: 'text-warning',
  TRANSMITIENDO: 'text-fg',
  ESPERANDO_CONFIRMACION: 'text-warning',
  VALIDADA: 'text-success',
  RECHAZADA: 'text-danger',
  SIN_TRANSMITIR: 'text-warning',
}

function tonoDe(d: DocumentoEnLaCola): string {
  return (d.estadoVisible && TONO_VISIBLE[d.estadoVisible]) ?? TONO[d.estado] ?? 'text-fg'
}

/** El CUFE (o CUDE) de lo validado, con su número de FEEL, el PDF y la consulta en la DIAN. */
function AcuseDeLaDian({ d }: { d: DocumentoEnLaCola }) {
  const codigo = d.cufe ?? d.cude
  if (!codigo) return null
  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo!)
      toast.success('CUFE copiado')
    } catch {
      toast.error('No se pudo copiar. Selecciónalo y cópialo a mano.')
    }
  }
  return (
    <div className="space-y-1" data-testid={`acuse-${d.id}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-fg-subtle">{d.cufe ? 'CUFE' : 'CUDE'}</span>
        <span className="font-mono truncate max-w-[16rem] text-fg" title={codigo}>
          {codigo}
        </span>
        <button
          type="button"
          onClick={() => void copiar()}
          className="text-fg-muted hover:text-fg"
          aria-label="Copiar el CUFE"
          data-testid={`copiar-cufe-${d.id}`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      {(d.documentoGenerado || d.pdfUrl || d.qrDatos) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {d.documentoGenerado && (
            <span>
              Número en la DIAN: <span className="font-mono text-fg">{d.documentoGenerado}</span>
            </span>
          )}
          {d.pdfUrl && (
            <a
              href={d.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              data-testid={`pdf-dian-${d.id}`}
            >
              Ver el PDF
            </a>
          )}
          {d.qrDatos && /^https:\/\//.test(d.qrDatos) && (
            <a
              href={d.qrDatos}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              data-testid={`qr-dian-${d.id}`}
            >
              Consultarla en la DIAN
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function ColaDeTransmision() {
  // DIAN-FEEL: qué le falta a ESTA inmobiliaria para que Leasefy transmita.
  const { estado: anteLaDian } = useEstadoAnteLaDian()
  const permisos = usePermissionsContextSafe()
  const [datos, setDatos] = useState<Cola | null>(null)
  // DIAN-FEEL: los saltos en la numeración de las facturas (el 6 que no es factura).
  const [saltos, setSaltos] = useState<SaltoDeLaNumeracion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [filtro, setFiltro] = useState<EstadoDeTransmision | ''>('')
  const [reintentando, setReintentando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    // Los saltos no frenan la cola: si no se pueden leer, no se muestran.
    const pedirSaltos = facturacionElectronicaService.saltosDeLaNumeracion
    if (typeof pedirSaltos === 'function') {
      void pedirSaltos()
        .then((r) => setSaltos(r?.saltos ?? []))
        .catch(() => setSaltos([]))
    }
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

  async function reintentar(d: DocumentoEnLaCola) {
    if (reintentando) return
    /*
     * DIAN-FEEL: el envío anterior se cortó sin respuesta. Reenviarlo sin mirar
     * puede emitirlo dos veces (FEEL le pone el número a la nota crédito).
     */
    if (d.esperandoConfirmacion) {
      const si = await confirmar({
        tipo: 'advertencia',
        titulo: '¿Revisaste en FEEL que no está?',
        descripcion: `No sabemos si FEEL recibió ${d.numeroDian ?? nombreDelDocumento(d.documentoTipo).toLowerCase()}: la conexión se cortó esperando la respuesta. Si ya está en FEEL y lo vuelves a enviar, quedaría emitido dos veces.`,
        accion: 'No está: volver a enviar',
      })
      if (!si) return
    }
    setReintentando(d.id)
    try {
      await facturacionElectronicaService.reintentarTransmision(
        d.id,
        d.esperandoConfirmacion ? { confirmoQueNoLlego: true } : {},
      )
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
  /** DIAN-FEEL: ¿Leasefy transmite de verdad lo de esta inmobiliaria? Sin el estado (back anterior), lo de siempre. */
  const transmite = anteLaDian ? anteLaDian.transmite : datos?.proveedorConfigurado === true
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
            transmite
              ? 'bg-surface-muted border-border'
              : 'bg-warning-soft border-warning/30'
          }`}
          data-testid="cola-proveedor"
        >
          {transmite ? (
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
            {/* DIAN-FEEL: con el estado de la inmobiliaria, qué le falta a ELLA
                (también con FEEL prendido: la resolución puede no coincidir);
                con un back anterior, el texto de siempre. */}
            <p className="text-caption text-fg">
              {anteLaDian
                ? anteLaDian.transmite
                  ? anteLaDian.ambiente === 'PRUEBAS'
                    ? 'Leasefy transmite con FEEL al ambiente de PRUEBAS de la DIAN: lo transmitido sirve para la habilitación, pero no es una factura válida.'
                    : 'Leasefy transmite tus documentos a la DIAN con FEEL, su proveedor tecnológico.'
                  : `${anteLaDian.titulo}. ${anteLaDian.descripcion}`
                : datos.proveedorConfigurado
                  ? `Transmitiendo con ${datos.proveedor}.`
                  : 'Todavía no hay proveedor tecnológico conectado. Tus facturas se numeran con tu resolución y quedan en esta cola, pero NO están validadas ante la DIAN hasta que se conecte.'}
            </p>
            {anteLaDian && !anteLaDian.transmite && anteLaDian.estado !== 'APAGADA' && (
              permisos?.isAdmin ? (
                <Link
                  href="/panel/inmobiliaria/configuracion/facturacion"
                  className="text-caption font-semibold text-primary underline-offset-2 hover:underline"
                  data-testid="cola-ver-pasos"
                >
                  Ver los pasos
                </Link>
              ) : (
                <p className="text-caption text-fg-muted">
                  Los pasos los ve el administrador en Configuración → Facturación.
                </p>
              )
            )}
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
                {(a.motivo ?? errorLegible(a.ultimoError))
                  ? ` ${a.motivo ?? `Último error: ${errorLegible(a.ultimoError)}`}`
                  : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {saltos.length > 0 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 space-y-1"
          data-testid="cola-saltos"
        >
          <p className="text-caption font-semibold text-fg">
            {saltos.length === 1
              ? 'La numeración de tus facturas tiene 1 salto'
              : `La numeración de tus facturas tiene ${saltos.length} saltos`}
          </p>
          <p className="text-caption text-fg-muted">
            La DIAN recibe tus facturas por su número. Un número sin factura no se renumera: se explica.
          </p>
          <ul className="space-y-0.5">
            {saltos.slice(0, 10).map((s) => (
              <li key={`${s.resolucionId}-${s.numeroDian}`} className="text-caption text-fg">
                <span className="font-mono tabular-nums">{s.numero}</span>: {s.explicacion}
              </li>
            ))}
          </ul>
          {saltos.length > 10 && (
            <p className="text-caption text-fg-muted">Y {cuantos(saltos.length - 10, 'más', 'más')}.</p>
          )}
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
                    <TableCell className={`whitespace-nowrap ${tonoDe(d)}`}>
                      {d.estadoNombre}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-mono tabular-nums text-fg-muted">
                      {d.intentos}
                    </TableCell>
                    {/* DIAN-FEEL: 20 rem (antes 28): con el acuse y los motivos, a
                        1440 px la tabla se corría y tapaba «Volver a enviar». */}
                    <TableCell className="min-w-[16rem] max-w-[20rem] text-caption text-fg-muted">
                      {/* Sin proveedor, el porqué es el mismo en todas las filas y
                          ya lo dice el aviso de arriba: no se repite (como FA-03).
                          DIAN-FEEL: con la inmobiliaria lista, el porqué de UNA
                          fila sin transmitir es suyo (la nota débito, la
                          resolución que no coincide) y sí se dice. */}
                      {d.cufe || d.cude ? (
                        <AcuseDeLaDian d={d} />
                      ) : (
                        (d.estado === 'SIN_PROVEEDOR' && !anteLaDian?.transmite
                          ? null
                          : (d.motivo ?? errorLegible(d.ultimoError))) ?? '—'
                      )}
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
                          onClick={() => void reintentar(d)}
                          disabled={reintentando !== null}
                          data-testid={`transmision-reintentar-${d.id}`}
                        >
                          {d.esperandoConfirmacion ? 'Volver a enviar' : 'Volver a intentar'}
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
