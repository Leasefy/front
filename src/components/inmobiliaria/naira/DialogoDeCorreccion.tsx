'use client'

/**
 * DialogoDeCorreccion — el diálogo para corregir lo que cree Naira (Fase 13, plan 13-07). `ResponsiveDialog`: Dialog en
 * md+ y Sheet inferior en móvil.
 *
 * El rechazo de la pantalla de datos personales (422) se queda ADENTRO: el diálogo sigue abierto con el texto de la persona
 * en su campo y dice la razón por su CLAVE, sin repetir el texto en ningún otro lugar (Ley 1581, P3). Un fallo reintentable
 * también se queda. Lo demás (hecho, recargar, sin permiso) cierra y sube a quien lo abrió. No conoce rutas (D13-1).
 */

import type { JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog'
import { Textarea } from '@/components/ui/textarea'
import { corregirItem } from '@/lib/api/naira/cliente'
import { useAuth } from '@/lib/auth'
import { useI18n } from '@/lib/i18n'
import {
  CLAVE_DEL_RECHAZO_OTRO,
  desenlaceDeEscritura,
  type DesenlaceDeEscritura,
} from '@/lib/naira/vocabulario-de-memoria'

export interface DialogoDeCorreccionProps {
  readonly itemId: string
  readonly textoActual: string
  readonly abierto: boolean
  readonly onAbiertoCambia: (abierto: boolean) => void
  readonly onDesenlace: (d: Exclude<DesenlaceDeEscritura, { readonly kind: 'rechazo_de_contenido' | 'reintentable' }>) => void
}

export function DialogoDeCorreccion({
  itemId,
  textoActual,
  abierto,
  onAbiertoCambia,
  onDesenlace,
}: DialogoDeCorreccionProps): JSX.Element {
  const { t } = useI18n()
  const agencyId = useAuth().agency?.id ?? null
  const idCampo = useId()
  const idRechazo = useId()
  const [texto, setTexto] = useState(textoActual)
  const [enVuelo, setEnVuelo] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [fallo, setFallo] = useState(false)
  const huboDesenlace = useRef(false)

  useEffect(() => {
    if (abierto) {
      setTexto(textoActual)
      setRechazo(null)
      setFallo(false)
      huboDesenlace.current = false
    }
  }, [abierto, textoActual])

  const textoValido = texto.trim() !== '' && texto !== textoActual

  async function guardar(): Promise<void> {
    if (!textoValido || enVuelo) return
    setEnVuelo(true)
    setRechazo(null)
    setFallo(false)
    const r = await corregirItem(agencyId ?? '', itemId, texto)
    setEnVuelo(false)
    const d = desenlaceDeEscritura('corregir', r)
    if (d.kind === 'rechazo_de_contenido') {
      setRechazo(d.clave)
      return
    }
    if (d.kind === 'reintentable') {
      setFallo(true)
      return
    }
    huboDesenlace.current = true
    onAbiertoCambia(false)
    onDesenlace(d)
  }

  return (
    <ResponsiveDialog
      open={abierto}
      onOpenChange={(a) => {
        if (!enVuelo) onAbiertoCambia(a)
      }}
    >
      <ResponsiveDialogContent
        data-naira-dialogo-de-correccion=""
        onCloseAutoFocus={(e) => {
          if (huboDesenlace.current) e.preventDefault()
        }}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('inmobiliaria.ai.naira.memoria.correccion.titulo')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t('inmobiliaria.ai.naira.memoria.correccion.descripcion')}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-2">
          <label htmlFor={idCampo} className="text-sm font-medium text-fg">
            {t('inmobiliaria.ai.naira.memoria.correccion.etiqueta')}
          </label>
          <Textarea
            id={idCampo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={4000}
            rows={6}
            readOnly={enVuelo}
            aria-describedby={rechazo !== null ? idRechazo : undefined}
          />
          {rechazo !== null ? (
            <p id={idRechazo} data-naira-rechazo="" role="alert" className="text-sm text-fg">
              {t(rechazo)}
              {rechazo !== CLAVE_DEL_RECHAZO_OTRO ? ' ' + t('inmobiliaria.ai.naira.memoria.correccion.quitarYGuardar') : null}
            </p>
          ) : null}
          {fallo ? (
            <p role="status" className="text-sm text-fg">
              {t('inmobiliaria.ai.naira.memoria.correccion.noGuardada')}
            </p>
          ) : null}
        </div>
        <ResponsiveDialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={enVuelo} onClick={() => onAbiertoCambia(false)}>
            {t('inmobiliaria.ai.naira.memoria.correccion.volver')}
          </Button>
          <Button
            type="button"
            variant="default"
            hideArrow
            data-testid="naira-corregir-guardar"
            isLoading={enVuelo}
            disabled={enVuelo || !textoValido}
            onClick={() => void guardar()}
          >
            {t('inmobiliaria.ai.naira.memoria.correccion.guardar')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
