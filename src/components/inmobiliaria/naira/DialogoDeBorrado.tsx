'use client'

/**
 * DialogoDeBorrado — el `AlertDialog` de UI-SPEC §10.4 para borrar algo de la memoria de Naira (Fase 13, plan 13-07). El
 * motivo es OBLIGATORIO porque el agente lo guarda en la auditoría (Ley 1581): ninguno viene preseleccionado y «Borrar ítem»
 * no se habilita sin uno. Un fallo reintentable se queda en el diálogo; lo demás cierra y sube. No conoce rutas (D13-1).
 */

import type { JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

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
import { borrarItem } from '@/lib/api/naira/cliente'
import { ERASURE_REASONS } from '@/lib/api/naira/contrato'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DEL_MOTIVO_DE_BORRADO,
  desenlaceDeEscritura,
  type DesenlaceDeEscritura,
  type MotivoDeBorrado,
} from '@/lib/naira/vocabulario-de-memoria'

export interface DialogoDeBorradoProps {
  readonly itemId: string
  readonly abierto: boolean
  readonly onAbiertoCambia: (abierto: boolean) => void
  readonly onDesenlace: (d: Exclude<DesenlaceDeEscritura, { readonly kind: 'rechazo_de_contenido' | 'reintentable' }>) => void
}

export function DialogoDeBorrado({ itemId, abierto, onAbiertoCambia, onDesenlace }: DialogoDeBorradoProps): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const nombreDelGrupo = useId()
  const [motivo, setMotivo] = useState<MotivoDeBorrado | null>(null)
  const [enVuelo, setEnVuelo] = useState(false)
  const [fallo, setFallo] = useState(false)
  const huboDesenlace = useRef(false)

  useEffect(() => {
    if (!abierto) {
      setMotivo(null)
      setFallo(false)
    } else {
      huboDesenlace.current = false
    }
  }, [abierto])

  async function borrar(): Promise<void> {
    if (motivo === null) return
    setEnVuelo(true)
    setFallo(false)
    const r = await borrarItem(agencyId ?? '', itemId, motivo)
    setEnVuelo(false)
    const d = desenlaceDeEscritura('borrar', r)
    if (d.kind === 'reintentable' || d.kind === 'rechazo_de_contenido') {
      setFallo(true)
      return
    }
    huboDesenlace.current = true
    onAbiertoCambia(false)
    onDesenlace(d)
  }

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(a) => {
        if (!enVuelo) onAbiertoCambia(a)
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(e) => {
          if (huboDesenlace.current) e.preventDefault()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t('inmobiliaria.ai.naira.memoria.borrado.titulo')}</AlertDialogTitle>
          <AlertDialogDescription>{t('inmobiliaria.ai.naira.memoria.borrado.cuerpo')}</AlertDialogDescription>
        </AlertDialogHeader>
        <fieldset data-naira-motivo-de-borrado="" className="space-y-2" disabled={enVuelo}>
          <legend className="text-sm font-medium text-fg">{t('inmobiliaria.ai.naira.memoria.borrado.motivo')}</legend>
          {ERASURE_REASONS.map((m) => (
            <label
              key={m}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-3 hover:bg-surface-muted"
            >
              <input type="radio" name={nombreDelGrupo} value={m} checked={motivo === m} onChange={() => setMotivo(m)} />
              <span className="text-sm text-fg">{t(CLAVE_DEL_MOTIVO_DE_BORRADO[m])}</span>
            </label>
          ))}
        </fieldset>
        {fallo ? (
          <p role="status" className="text-sm text-fg">
            {t('inmobiliaria.ai.naira.memoria.borrado.noBorrado')}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enVuelo}>{t('inmobiliaria.ai.naira.memoria.borrado.volver')}</AlertDialogCancel>
          <AlertDialogAction
            tone="danger"
            data-testid="naira-confirmar-borrado"
            disabled={enVuelo || motivo === null}
            onClick={(e) => {
              e.preventDefault()
              void borrar()
            }}
          >
            {t('inmobiliaria.ai.naira.memoria.borrado.confirmar')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
