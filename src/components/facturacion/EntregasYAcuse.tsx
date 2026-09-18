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
import {
  facturacionElectronicaService,
  type EntregaDeDocumento,
  type EntregasDeDocumentos,
  type EstadoDeEntrega,
} from '@/lib/api/facturacion-electronica.service'
import { fechaLegible } from '@/lib/api/facturacion-por-mes.service'

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
      toast.error(
        err instanceof Error ? err.message : 'No se pudo registrar el acuse.',
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
        err instanceof Error ? err.message : 'No se pudo registrar el rechazo.',
      )
    } finally {
      setGuardando(null)
    }
  }

  const alternas = (datos?.entregas ?? []).filter(
    (e) => e.canal !== 'CORREO',
  ).length
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
          <p className="text-caption text-fg">{datos.explicacion}</p>
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
          <p className="text-caption text-fg">
            {simuladas} documentos figuran como <strong>simulados</strong>: en
            este entorno el envío de correos está apagado y no le llegaron a
            nadie. Cuando se prenda, se vuelven a enviar.
          </p>
        </div>
      )}

      {alternas > 0 && (
        <div
          className="rounded-lg border border-border bg-surface-muted p-3 flex items-start gap-2.5"
          data-testid="entregas-alternas"
        >
          <EnvelopeSimple
            className="w-5 h-5 text-fg-muted flex-shrink-0 mt-0.5"
            weight="fill"
          />
          <p className="text-caption text-fg">
            {alternas} documentos salieron por WhatsApp o por enlace porque su
            cliente no tiene correo. El correo es obligatorio para la factura
            electrónica: complétalo en «Terceros sin correo».
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
                        datos?.explicacion ??
                        'Cada factura que emites sale por correo con su XML y su PDF, y acá queda la constancia.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                datos.entregas.map((e) => (
                  <TableRow key={e.id} data-testid={`entrega-${e.id}`}>
                    <TableCell className="whitespace-nowrap text-fg">
                      {e.numeroDian ?? e.documentoTipo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {e.canalNombre}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-fg-muted">
                      {e.destinatario ?? '—'}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap ${TONO[e.estado] ?? 'text-fg'}`}
                    >
                      {e.estadoNombre}
                      {e.motivo && (
                        <p className="text-caption text-fg-muted whitespace-normal">
                          {e.motivo}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {e.enviadaAt ? fechaLegible(e.enviadaAt) : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-fg-muted">
                      {e.aceptaTacitoAt ? fechaLegible(e.aceptaTacitoAt) : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {e.esperaAcuse && (
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
                ))
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(ev) => {
                ev.preventDefault()
                void rechazar()
              }}
              disabled={motivoLimpio === '' || guardando !== null}
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
