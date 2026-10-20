'use client'

/**
 * «Radicar la póliza» (COTIZ-17, Nico 19-10-2026: «construir los cuatro»):
 * la persona registra A MANO el número de la póliza de la aseguradora elegida
 * (no hay conexión con las aseguradoras). Queda en la cotización con quién y
 * cuándo, y «Enviar a contrato» la lleva al contrato.
 *
 * Sin la elegida todavía, se guarda junto con la recomendada (es lo mismo que
 * «Avanzar con la recomendada»). Sin la actualización de la base, lo dice y no
 * deja guardar.
 */

import { useEffect, useState } from 'react'

import { Presence } from '@leasefy/cadence'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ErrorDelCampo } from '@/components/estado/ErrorDelCampo'
import { toast } from '@/components/ui/toast'
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { nombreDeLaAseguradora } from '@/lib/cotizador/nombre-de-la-aseguradora'
import {
  LARGO_MAXIMO_DE_LA_POLIZA,
  faltaLaActualizacion,
  guardarSeguimiento,
  type SeguimientoDeLaCotizacion,
} from '@/lib/cotizador/seguimiento'

export const SIN_LA_ACTUALIZACION =
  'Todavía no podemos guardarlo: falta aplicar una actualización de la base de datos y no es algo que puedas resolver desde el panel.'

interface Props {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  agencyId: string | null
  quoteId: string
  seguimiento: SeguimientoDeLaCotizacion | null
  /** La aseguradora de la póliza: la elegida o, si no hay, la recomendada. */
  aseguradora: string | null
  onGuardado: (s: SeguimientoDeLaCotizacion) => void
}

export function RegistrarPolizaDialog({ abierto, onOpenChange, agencyId, quoteId, seguimiento, aseguradora, onGuardado }: Props) {
  const [numero, setNumero] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const sinActualizacion = seguimiento?.disponible === false
  const yaTiene = seguimiento?.polizaNumero ?? null
  const elegida = seguimiento?.opcionElegida ?? null

  useEffect(() => {
    if (abierto) {
      setNumero(yaTiene ?? '')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const guardar = async (valor: string | null) => {
    if (!agencyId || !aseguradora) return
    const limpio = valor === null ? null : valor.replace(/\s+/g, ' ').trim()
    if (limpio !== null && !limpio) {
      setError('Escribe el número de la póliza.')
      document.getElementById('poliza-numero')?.focus()
      return
    }
    setGuardando(true)
    try {
      const s = await guardarSeguimiento(agencyId, quoteId, {
        polizaNumero: limpio,
        ...(elegida ? {} : { opcionElegida: aseguradora }),
      })
      onGuardado(s)
      toast.success(limpio ? `Registramos la póliza N.º ${limpio} de ${nombreDeLaAseguradora(aseguradora)}.` : 'Quitamos el número de la póliza.')
      onOpenChange(false)
    } catch (err) {
      setError(
        faltaLaActualizacion(err)
          ? SIN_LA_ACTUALIZACION
          : mensajeParaLaPersona(err, { porDefecto: 'No pudimos guardar la póliza. Intenta de nuevo.', accion: 'guardar la póliza' }),
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent size="sm" data-testid="registrar-poliza">
        <DialogHeader>
          <DialogTitle>Registrar la póliza</DialogTitle>
          <DialogDescription>
            {aseguradora
              ? `El número de la póliza de ${nombreDeLaAseguradora(aseguradora)}. Queda en esta cotización y pasa al contrato.`
              : 'Disponible cuando haya una opción asegurable.'}
          </DialogDescription>
        </DialogHeader>

        {sinActualizacion ? (
          <p role="status" className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-fg-muted" data-testid="poliza-sin-actualizacion">
            {SIN_LA_ACTUALIZACION}
          </p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="poliza-numero" className="text-sm font-medium text-fg">
              Número de la póliza
            </label>
            <Input
              id="poliza-numero"
              value={numero}
              maxLength={LARGO_MAXIMO_DE_LA_POLIZA}
              onChange={(e) => {
                setNumero(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void guardar(numero)
                }
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'poliza-numero-error' : undefined}
              disabled={!aseguradora || guardando}
              autoFocus
            />
            <ErrorDelCampo id="poliza-numero-error" mensaje={error ?? undefined} className="mt-0" />
          </div>
        )}

        <Presence show={!elegida && Boolean(aseguradora) && !sinActualizacion}>
          <p className="text-xs text-fg-muted">
            {`También queda ${aseguradora ? nombreDeLaAseguradora(aseguradora) : ''} como la opción elegida.`}
          </p>
        </Presence>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {yaTiene && !sinActualizacion && (
            <Button variant="ghost" hideArrow onClick={() => void guardar(null)} disabled={guardando} className="sm:mr-auto">
              Quitar la póliza
            </Button>
          )}
          <Button variant="secondary" hideArrow onClick={() => onOpenChange(false)} disabled={guardando}>
            {sinActualizacion ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!sinActualizacion && (
            <Button hideArrow onClick={() => void guardar(numero)} disabled={guardando || !aseguradora} data-testid="poliza-guardar">
              {guardando ? <Spinner size="sm" variant="current" /> : 'Guardar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
