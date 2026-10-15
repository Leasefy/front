'use client'

/**
 * PropuestaProceduralPendiente — una propuesta de procedimiento que espera decisión (Fase 13, plan 13-07; UI-SPEC §7.8).
 *
 * Pinta el texto tal cual y «Propuesto el …»; NUNCA quién la propuso (B-5, D13-11). Confirmar va sin diálogo y rechazar tras
 * un `AlertDialog` (§10.4), los dos solo con `procedural-approve`. Desde aquí no se escribe ningún procedimiento nuevo
 * (D13-12). No conoce rutas del workspace (D13-1).
 */

import type { JSX } from 'react'
import { useRef, useState } from 'react'

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
import { Button } from '@/components/ui/button'
import { resolverPropuestaProcedural } from '@/lib/api/naira/cliente'
import type { NairaMemoryProposal } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import { desenlaceDeEscritura, type DesenlaceParaLaVista } from '@/lib/naira/vocabulario-de-memoria'

import { LineaConFecha } from './FilaDeSeguimiento'
import { useOrigenDeNaira } from './OrigenDeNaira'

export interface PropuestaProceduralPendienteProps {
  readonly propuesta: NairaMemoryProposal
  readonly puedeResolver: boolean
  readonly onDesenlace: (d: DesenlaceParaLaVista, decision: 'confirm' | 'reject') => void
}

type Mensaje = { readonly clave: string; readonly sufijo: string | null }

export function PropuestaProceduralPendiente({
  propuesta,
  puedeResolver,
  onDesenlace,
}: PropuestaProceduralPendienteProps): JSX.Element {
  const { t } = useI18n()
  const esEjemplo = useOrigenDeNaira() === 'ejemplo'
  const agencyId = useAuth().agency?.id ?? null
  const [enVuelo, setEnVuelo] = useState(false)
  const [confirmandoRechazo, setConfirmandoRechazo] = useState(false)
  const [bloqueada, setBloqueada] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const huboDesenlace = useRef(false)

  async function resolver(decision: 'confirm' | 'reject'): Promise<void> {
    setEnVuelo(true)
    setMensaje(null)
    const r = await resolverPropuestaProcedural(agencyId ?? '', propuesta.id, decision)
    setEnVuelo(false)
    const d = desenlaceDeEscritura('resolver', r)
    huboDesenlace.current = d.kind === 'hecho' || d.kind === 'recargar'
    setConfirmandoRechazo(false)
    switch (d.kind) {
      case 'hecho':
      case 'recargar':
        onDesenlace(d, decision)
        return
      case 'sin_permiso':
        setBloqueada(true)
        setMensaje({ clave: 'inmobiliaria.ai.naira.memoria.acciones.sinPermiso', sufijo: null })
        return
      case 'reintentable':
        setMensaje({ clave: 'inmobiliaria.ai.naira.memoria.propuestas.noResuelta', sufijo: null })
        return
      case 'rechazo_de_contenido':
        setMensaje({ clave: d.clave, sufijo: 'inmobiliaria.ai.naira.memoria.propuestas.pideOtraVersion' })
        return
      default: {
        const nunca: never = d
        return nunca
      }
    }
  }

  const deshabilitados = esEjemplo || enVuelo || bloqueada

  return (
    <li data-naira-propuesta-procedural="" className="min-w-0 space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="whitespace-pre-wrap text-sm text-fg">{propuesta.text}</p>
      <p className="text-sm text-fg-muted">
        <LineaConFecha clave="inmobiliaria.ai.naira.memoria.propuestas.propuestoEl" valor={propuesta.proposedAt} />
      </p>
      {puedeResolver ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="naira-confirmar-procedimiento"
            disabled={deshabilitados}
            onClick={() => void resolver('confirm')}
          >
            {t('inmobiliaria.ai.naira.memoria.propuestas.confirmar')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="naira-rechazar-procedimiento"
            disabled={deshabilitados}
            onClick={() => setConfirmandoRechazo(true)}
          >
            {t('inmobiliaria.ai.naira.memoria.propuestas.rechazar')}
          </Button>
        </div>
      ) : null}
      {puedeResolver && esEjemplo ? (
        <p className="text-caption text-fg-muted">{t('inmobiliaria.ai.naira.memoria.acciones.ejemplo')}</p>
      ) : null}
      {mensaje !== null ? (
        <p role="status" className="text-sm text-fg">
          {t(mensaje.clave)}
          {mensaje.sufijo !== null ? ' ' + t(mensaje.sufijo) : ''}
        </p>
      ) : null}
      {puedeResolver ? (
        <AlertDialog
          open={confirmandoRechazo}
          onOpenChange={(a) => {
            if (!enVuelo) {
              if (a) huboDesenlace.current = false
              setConfirmandoRechazo(a)
            }
          }}
        >
          <AlertDialogContent
            onCloseAutoFocus={(e) => {
              if (huboDesenlace.current) e.preventDefault()
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{t('inmobiliaria.ai.naira.memoria.propuestas.dialogoTitulo')}</AlertDialogTitle>
              <AlertDialogDescription>{t('inmobiliaria.ai.naira.memoria.propuestas.dialogoCuerpo')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enVuelo}>{t('inmobiliaria.ai.naira.memoria.propuestas.volver')}</AlertDialogCancel>
              <AlertDialogAction
                data-testid="naira-confirmar-rechazo-procedimiento"
                disabled={enVuelo}
                onClick={(e) => {
                  e.preventDefault()
                  void resolver('reject')
                }}
              >
                {t('inmobiliaria.ai.naira.memoria.propuestas.dialogoConfirmar')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </li>
  )
}
