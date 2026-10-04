'use client'

/**
 * «Entregas» — cómo le llegó el documento al cliente y en qué va su acuse.
 *
 * Nico y Juan Camilo (2026-09-17): «Leasefy envía el correo con XML y PDF,
 * guarda la constancia y muestra el estado (entregada / aceptada / rechazada)
 * en el contrato y en Facturación (la aceptación tácita corre a los 3 días
 * hábiles)» y «inquilino sin correo: se emite igual y se entrega por WhatsApp o
 * enlace».
 *
 * ── Las dos cosas que la pantalla tiene que dejar claras ───────────────────
 *
 *   1. **SIMULADA no es ENVIADA.** En un entorno con el envío apagado
 *      (`EMAIL_DELIVERY_ENABLED`) el documento NO le llegó a nadie. Se pinta
 *      distinto y se dice con esas palabras — el incidente del 14-09 (≈680
 *      correos reales a clientes) empezó por confundir esas dos cosas, y esto
 *      es su opuesto: no dar por enviado lo que no salió.
 *   2. **El canal ALTERNO es una deuda, no una solución.** Un documento
 *      entregado por enlace es un documento que espera a que alguien lo abra.
 *      La pantalla lo dice y manda a completar el correo.
 *
 * 🔴 Y desde el 03-10-2026 (Nico, QA-FACT FA-13 / FA-R04): sin correo el
 * documento queda **«Sin entregar · falta el correo»**, la aceptación tácita NO
 * corre y no se ofrece «La aceptó / La rechazó» mientras no le haya llegado. El
 * enlace descargable no existía (no hay ruta pública) y un back anterior lo
 * marcaba «Entregada» y, a los tres días hábiles, «Aceptada tácitamente».
 */

import { useCallback, useEffect, useState } from 'react'
import { EnvelopeSimple, Warning } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos'
import { SinDatos } from '@/components/estado/SinDatos'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import {
  facturacionElectronicaService,
  type EntregaDeDocumento,
  type EntregasDeDocumentos,
  type EstadoDeEntrega,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'
import { nombreDelDocumento } from '@/lib/api/facturacion-electronica.service'
import { cuantos, faltaEnLaBase } from '@/lib/facturacion/por-facturar'

const TONO: Record<EstadoDeEntrega, string> = {
  POR_ENVIAR: 'text-fg-muted',
  ENVIADA: 'text-fg',
  // 🔴 Amarillo, no verde: no le llegó a nadie.
  SIMULADA: 'text-warning',
  FALLIDA: 'text-danger',
  ACEPTADA: 'text-success',
  ACEPTADA_TACITA: 'text-success',
  RECHAZADA_CLIENTE: 'text-danger',
}

/** «Sin entregar · falta el correo» va en ámbar: no le llegó a nadie. */
const TONO_SIN_ENTREGAR = 'text-warning'

/** Los estados que dicen que el documento salió (o hasta que el cliente lo aceptó). */
const SALIO: readonly string[] = ['ENVIADA', 'ACEPTADA_TACITA']

/**
 * 🔴 No le llegó porque falta el correo. Como lo marca el back de QA-FACT
 * (`entrega-del-documento.ts::quedoSinEntregar`: por correo, «por enviar» y sin
 * destinatario), y también lo que un back anterior daba por «Entregada» por un
 * enlace que no existía o un WhatsApp que no sale.
 */
function quedoSinEntregar(e: EntregaDeDocumento): boolean {
  if (typeof e.sinEntregar === 'boolean') return e.sinEntregar
  if (e.canal === 'CORREO') return e.estado === 'POR_ENVIAR' && !e.destinatario
  return SALIO.includes(e.estado) || e.estado === 'POR_ENVIAR'
}

/** Le llegó por correo: desde ahí corre la aceptación tácita y caben los acuses. */
function leLlego(e: EntregaDeDocumento): boolean {
  return e.canal === 'CORREO' && SALIO.includes(e.estado)
}

/** Lo que dice la columna de estado. */
function estadoParaMostrar(e: EntregaDeDocumento): { texto: string; tono: string } {
  if (quedoSinEntregar(e)) return { texto: 'Sin entregar · falta el correo', tono: TONO_SIN_ENTREGAR }
  return { texto: e.estadoNombre, tono: TONO[e.estado] ?? 'text-fg' }
}

export function EntregasYAcuse() {
  const [datos, setDatos] = useState<EntregasDeDocumentos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<unknown>(null)
  /** La entrega que se está rechazando: el diálogo pide el motivo. */
  const [porRechazar, setPorRechazar] = useState<EntregaDeDocumento | null>(null)
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await facturacionElectronicaService.entregas())
    } catch (e) {
      setError(e)
      setDatos(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function aceptar(e: EntregaDeDocumento) {
    if (guardando) return
    setGuardando(e.id)
    try {
      await facturacionElectronicaService.registrarAcuse(e.id, {
        aceptada: true,
      })
      toast.success('Queda registrado que el cliente la aceptó')
      await cargar()
    } catch (err) {
      // Con la regla de oro (02-10-2026).
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: 'No se pudo registrar el acuse.',
          accion: 'registrar el acuse',
        }),
      )
    } finally {
      setGuardando(null)
    }
  }

  const motivoLimpio = motivo.trim()

  async function rechazar() {
    const e = porRechazar
    // El back exige el motivo de un rechazo: es lo que después se corrige con
    // la nota crédito. El botón ya está apagado; esto es por si llega un Enter.
    if (!e || motivoLimpio === '' || guardando) return
    setGuardando(e.id)
    try {
      await facturacionElectronicaService.registrarAcuse(e.id, {
        aceptada: false,
        motivo: motivoLimpio,
      })
      toast.success('Queda registrado el rechazo del cliente')
      setPorRechazar(null)
      setMotivo('')
      await cargar()
    } catch (err) {
      toast.error(
        mensajeParaLaPersona(err, {
          porDefecto: 'No se pudo registrar el rechazo.',
          accion: 'registrar el rechazo',
        }),
      )
    } finally {
      setGuardando(null)
    }
  }

  const sinEntregar = (datos?.entregas ?? []).filter(quedoSinEntregar).length
  const simuladas = datos?.resumen.SIMULADA ?? 0

  return (
    <div className="space-y-4" data-testid="entregas-y-acuse">
      {datos && !datos.disponible && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="entregas-sin-migracion"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">
            {faltaEnLaBase('La entrega de los documentos y su acuse')}
          </p>
        </div>
      )}

      {simuladas > 0 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="entregas-simuladas"
        >
          <Warning
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          {/* 🔴 FA-R19: decía «Cuando se prenda, se vuelven a enviar», y no hay
              nada que los vuelva a enviar. Y «1 documentos». */}
          <p className="text-caption text-fg">
            {cuantos(simuladas, 'documento no salió', 'documentos no salieron')}: en este
            entorno el envío de correos está apagado y no le llegaron a nadie.
          </p>
        </div>
      )}

      {sinEntregar > 0 && (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft p-3 flex items-start gap-2.5"
          data-testid="entregas-alternas"
        >
          <EnvelopeSimple
            className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
            weight="fill"
          />
          {/* 🔴 FA-R19: decía «salieron por WhatsApp o por enlace»; el WhatsApp
              no sale y el enlace no existe. No le llegaron: se dice así. */}
          <p className="text-caption text-fg">
            {cuantos(sinEntregar, 'documento quedó', 'documentos quedaron')} sin entregar
            porque a su cliente le falta el correo. Mientras no lo tenga, la
            aceptación tácita no corre. Complétalo en «Mandato y correos».
          </p>
        </div>
      )}

      <EstadoDeDatos
        cargando={cargando}
        error={error}
        vacio={false}
        queEs="las entregas de documentos"
        onReintentar={cargar}
      >
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Documento</TableHead>
                <TableHead className="whitespace-nowrap">Canal</TableHead>
                <TableHead className="whitespace-nowrap">Destinatario</TableHead>
                <TableHead className="whitespace-nowrap">Estado</TableHead>
                <TableHead className="whitespace-nowrap">Entregada</TableHead>
                <TableHead className="whitespace-nowrap">
                  Aceptación tácita
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!datos || datos.entregas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <SinDatos
                      queSon="entregas de documentos"
                      icono={EnvelopeSimple}
                      titulo={
                        datos && !datos.disponible
                          ? 'La entrega llega con una migración que falta'
                          : 'Todavía no se ha entregado ningún documento'
                      }
                      descripcion={
                        datos && !datos.disponible
                          ? faltaEnLaBase('La entrega de los documentos y su acuse')
                          : 'Cada documento que emites se le manda por correo a su cliente, y acá queda la constancia de si le llegó.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                datos.entregas.map((e) => {
                  const estado = estadoParaMostrar(e)
                  return (
                  <TableRow key={e.id} data-testid={`entrega-${e.id}`}>
                    <TableCell className="whitespace-nowrap font-mono tabular-nums text-fg">
                      {e.numeroDian ?? nombreDelDocumento(e.documentoTipo)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {/* El «enlace descargable» de antes no existía. */}
                      {quedoSinEntregar(e) && e.canal === 'ENLACE' ? '—' : e.canalNombre}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-fg-muted">
                      {e.destinatario ?? '—'}
                    </TableCell>
                    <TableCell className={`min-w-[11rem] ${estado.tono}`}>
                      <span data-testid={`entrega-estado-${e.id}`}>{estado.texto}</span>
                      {/* Sin correo o con el envío apagado, el porqué es el mismo
                          en todas las filas y ya lo dice el aviso de arriba (y el
                          del back nombraba `EMAIL_DELIVERY_ENABLED`, FA-R27). */}
                      {e.motivo && !quedoSinEntregar(e) && e.estado !== 'SIMULADA' && (
                        <p className="text-caption text-fg-muted whitespace-normal">
                          {e.motivo}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {e.enviadaAt && leLlego(e) ? fechaLegible(e.enviadaAt) : '—'}
                    </TableCell>
                    <TableCell className="min-w-[9rem] text-fg-muted">
                      {/* 🔴 La tácita corre desde que el documento LLEGA: ni sin
                          correo, ni con el envío apagado, ni si falló. */}
                      {leLlego(e) || e.estado === 'ACEPTADA_TACITA'
                        ? e.aceptaTacitoAt
                          ? fechaLegible(e.aceptaTacitoAt)
                          : '—'
                        : e.estado === 'ACEPTADA' || e.estado === 'RECHAZADA_CLIENTE'
                          ? '—'
                          : 'No corre: no le ha llegado'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {/* 🔴 Nico (03-10): ni «La aceptó» ni «La rechazó» sobre un
                          documento que no le llegó (simulado, sin correo). */}
                      {e.esperaAcuse && e.estado === 'ENVIADA' && leLlego(e) && (
                        <span className="inline-flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            hideArrow
                            onClick={() => void aceptar(e)}
                            disabled={guardando !== null}
                            data-testid={`entrega-aceptar-${e.id}`}
                          >
                            La aceptó
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            hideArrow
                            onClick={() => {
                              setMotivo('')
                              setPorRechazar(e)
                            }}
                            disabled={guardando !== null}
                            data-testid={`entrega-rechazar-${e.id}`}
                          >
                            La rechazó
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </EstadoDeDatos>

      <AlertDialog
        open={porRechazar !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setPorRechazar(null)
        }}
      >
        <AlertDialogContent data-testid="entrega-rechazo-dialogo">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Por qué rechazó el documento {porRechazar?.numeroDian ?? ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El motivo queda en la constancia y es lo que después corriges con
              una nota crédito y una factura nueva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            placeholder="El canon no corresponde al del contrato."
            data-testid="entrega-rechazo-motivo"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={guardando !== null}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault()
                void rechazar()
              }}
              disabled={motivoLimpio === ''}
              loading={guardando !== null}
              data-testid="entrega-rechazo-confirmar"
            >
              Registrar el rechazo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
